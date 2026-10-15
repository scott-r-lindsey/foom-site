import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('release', 'scripts/deploy/release.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class Memory:
    def __init__(self, fail=None):
        self.events = []
        self.ledger = None
        self.fail = fail

    def put(self, key, data, entry=None):
        self.events.append(('put', key))
        if key == self.fail:
            raise RuntimeError('injected upload failure')

    def save(self, ledger):
        self.ledger = copy.deepcopy(ledger)
        self.events.append(('checkpoint', ledger['pending']['phase'] if ledger['pending'] else 'published'))

    def delete_document(self, key):
        self.events.append(('delete', key))

    def invalidate(self, release_id):
        self.events.append(('invalidate', release_id))
        if self.fail == 'invalidation':
            raise RuntimeError('injected invalidation failure')


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.identity = dict(runId='100', runAttempt='1', artifactId='200', createdAt='2026-10-15T00:00:00Z')
        self.files = {'schemaVersion': 1, 'files': [
            dict(key='index.html', phase='documents', sha256='new', cacheControl='fresh'),
            dict(key='_astro/app.js', phase='assets', sha256='asset', cacheControl='fresh')]}
        self.ledger = dict(schemaVersion=1, current=None, pending=None, releases=[])
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        for f in self.files['files']:
            path = Path(self.temp.name) / f['key']
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'checked')

    def publish(self, store, **kwargs):
        r.publish(store, self.ledger, self.identity, self.files, self.temp.name, b'archive', 'now', **kwargs)

    def test_order_and_final_checkpoint(self):
        store = Memory()
        self.publish(store)
        puts = [e[1] for e in store.events if e[0] == 'put']
        self.assertEqual(puts, ['_releases/100-1-200/artifact.zip', '_astro/app.js', 'index.html'])
        self.assertEqual(store.events[-2][0], 'invalidate')
        self.assertEqual(store.events[-1], ('checkpoint', 'published'))
        self.assertIsNotNone(store.ledger['current'])
        with self.assertRaisesRegex(ValueError, 'Older/equal'):
            self.publish(Memory())

    def test_partial_failures_block_and_recover(self):
        for fail in ('_astro/app.js', 'index.html', 'invalidation'):
            with self.subTest(fail=fail):
                self.ledger = dict(schemaVersion=1, current=None, pending=None, releases=[])
                store = Memory(fail)
                with self.assertRaises(RuntimeError):
                    self.publish(store)
                self.assertIsNone(store.ledger['current'])
                self.assertIsNotNone(store.ledger['pending'])
                with self.assertRaisesRegex(ValueError, 'explicit recovery'):
                    self.publish(Memory())
                self.publish(Memory(), recovery=True)
                self.assertIsNone(self.ledger['pending'])

    def test_history_conflicts_and_removed_documents(self):
        previous = copy.deepcopy(self.files)
        previous['files'][0]['key'] = 'removed/index.html'
        self.ledger['releases'] = [dict(files=previous)]
        store = Memory()
        self.publish(store)
        self.assertIn(('delete', 'removed/index.html'), store.events)
        previous['files'][1].update(cacheControl='immutable', sha256='different')
        self.ledger['current'] = None
        with self.assertRaisesRegex(ValueError, 'immutable conflict'):
            self.publish(Memory())

    def test_paths(self):
        for key in ('../secret', '/abs', 'x//y', 'x/./y', 'x/../y', 'x\\y', '.hidden', 'x\ny'):
            with self.assertRaises(ValueError):
                r.safe_key(key)

    def test_gate_failures(self):
        for result in ('failure', 'cancelled', 'skipped', None):
            with patch.object(r, 'gh', return_value={'total_count': 1, 'jobs': [dict(name='Quality gate', conclusion=result)]}):
                self.assertFalse(r.gate(dict(id=1, run_attempt=1)))

    def test_identity_fails_before_lock_lookup(self):
        for m in ({}, {'deployable': False}, {'purpose': 'validation-only'}):
            with patch.object(r, 'gh', side_effect=AssertionError('must not fetch')):
                with self.assertRaises(ValueError):
                    r.verify_identity(m, dict(id=1, run_attempt=1, event='push'), 'prod',
                                      dict(headSha='a', sourceSha='a', baseSha=None))

    def test_closed_fork_old_head_base_and_main(self):
        pr = dict(state='open', head=dict(repo=dict(full_name=r.REPO), sha='head'),
                  base=dict(ref='main', repo=dict(full_name=r.REPO), sha='main'), merge_commit_sha='merge')
        run = dict(path='.github/workflows/quality.yml', repository=dict(full_name=r.REPO), event='pull_request', head_sha='head')
        variants = [dict(pr, state='closed'), dict(pr, head=dict(repo=dict(full_name='fork/repo'), sha='head')),
                    dict(pr, head=dict(repo=dict(full_name=r.REPO), sha='new')),
                    dict(pr, base=dict(ref='main', repo=dict(full_name=r.REPO), sha='old'))]
        for variant in variants:
            with patch.object(r, 'gh', side_effect=[dict(object=dict(sha='main')), variant]):
                with self.assertRaises(ValueError):
                    r.eligible(run, 'dev', 1)
        with patch.object(r, 'gh', return_value=dict(object=dict(sha='new-main'))):
            with self.assertRaises(ValueError):
                r.eligible(dict(run, event='push', head_branch='main'), 'prod')

    def test_tar_traversal_symlink_and_digest(self):
        for name, kind in (('../escape', tarfile.REGTYPE), ('link', tarfile.SYMTYPE)):
            buf = io.BytesIO()
            with tarfile.open(fileobj=buf, mode='w:gz') as tar:
                info = tarfile.TarInfo(name)
                info.type = kind
                tar.addfile(info, io.BytesIO())
            tar_data = buf.getvalue()
            zipped = io.BytesIO()
            with zipfile.ZipFile(zipped, 'w') as archive:
                archive.writestr('dist.tar.gz', tar_data)
                archive.writestr('manifest.json', json.dumps(dict(archive='dist.tar.gz', archiveSha256=hashlib.sha256(tar_data).hexdigest())))
                archive.writestr('files.json', '{}')
            data = zipped.getvalue()
            with self.assertRaises(ValueError):
                r.unpack(data, r.digest(data), self.temp.name)
            with self.assertRaisesRegex(ValueError, 'digest'):
                r.unpack(data, '0' * 64, self.temp.name)

class BoundaryTests(unittest.TestCase):
    def test_valid_archive_and_recomputed_manifest(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'source'
            source.mkdir()
            for name in ('index.html', '404.html'):
                (source / name).write_text('<h1>Checked</h1>')
            script = "import {manifest} from './scripts/hosting/manifest.ts'; console.log(JSON.stringify(await manifest(process.argv[1])));"
            files = json.loads(r.command('node', '--input-type=module', '-e', script, str(source)))
            buf = io.BytesIO()
            with tarfile.open(fileobj=buf, mode='w:gz') as tar:
                tar.add(source, arcname='.')
            tar_data = buf.getvalue()
            for valid in (True, False):
                zipped = io.BytesIO()
                with zipfile.ZipFile(zipped, 'w') as archive:
                    archive.writestr('dist.tar.gz', tar_data)
                    archive.writestr('manifest.json', json.dumps(dict(archive='dist.tar.gz', archiveSha256=r.digest(tar_data))))
                    changed = copy.deepcopy(files)
                    if not valid:
                        changed['files'][0]['cacheControl'] = 'public, max-age=999'
                    archive.writestr('files.json', json.dumps(changed))
                target = Path(temp) / str(valid)
                target.mkdir()
                data = zipped.getvalue()
                if valid:
                    self.assertEqual(r.unpack(data, r.digest(data), target)[1], files)
                else:
                    with self.assertRaisesRegex(ValueError, 'File manifest'):
                        r.unpack(data, r.digest(data), target)

    def test_packaging_excludes_markers_and_roundtrips(self):
        import os
        import subprocess
        Path('.cache').mkdir(exist_ok=True)
        script = str(Path('.github/scripts/package-artifact.mjs').resolve())
        with tempfile.TemporaryDirectory(dir='.cache') as temp:
            root = Path(temp).resolve()
            (root / 'dist').mkdir()
            (root / 'dist/.gitkeep').write_bytes(b'')
            (root / 'dist/index.html').write_text('<h1>Home</h1>')
            (root / 'dist/404.html').write_text('<h1>Missing</h1>')
            (root / 'package.json').write_text('{"packageManager":"pnpm@11.19.0"}')
            (root / 'pnpm-lock.yaml').write_text('fixture lock')
            manifest_script = "import {manifest} from './scripts/hosting/manifest.ts'; console.log(JSON.stringify(await manifest(process.argv[1])));"
            files = r.command('node', '--input-type=module', '-e', manifest_script, str(root / 'dist'))
            (root / '.cache/hosting').mkdir(parents=True)
            (root / '.cache/hosting/files.json').write_bytes(files)
            env = dict(os.environ, GITHUB_REPOSITORY=r.REPO, GITHUB_EVENT_NAME='push',
                       GITHUB_SHA='source', PR_HEAD_SHA='source', GITHUB_RUN_ID='1',
                       GITHUB_RUN_ATTEMPT='1', SITE_ENV='production', SITE_ORIGIN='https://foom-term.com')
            subprocess.check_call(['node', script], cwd=root, env=env)
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, 'w') as archive:
                for file in (root / '.cache/ci-artifact').iterdir():
                    archive.write(file, file.name)
            unpacked = root / 'unpacked'
            unpacked.mkdir()
            identity, actual = r.unpack(buf.getvalue(), r.digest(buf.getvalue()), unpacked)
            self.assertTrue(identity['deployable'])
            self.assertEqual(actual, json.loads(files))
            self.assertFalse((unpacked / '.gitkeep').exists())

    def test_settings_and_source_identity(self):
        expected = dict(sourceSha='merge', headSha='head', baseSha='base')
        manifest = dict(schemaVersion=1, purpose='deployment', deployable=True,
                        repository=r.REPO, event='pull_request', runId='1', runAttempt='2',
                        siteEnv='development', siteOrigin='https://dev.foom-term.com',
                        workflowSha='merge', nodeVersion='v24.17.0', packageManager='pnpm@11.19.0',
                        lockfileSha256=r.digest(b'lock'), **expected)
        run = dict(id=1, run_attempt=2, event='pull_request')
        with patch.object(r, 'gh', return_value=dict(content='bG9jaw==')):
            r.verify_identity(manifest, run, 'dev', expected)
            for field in ('schemaVersion', 'purpose', 'deployable', 'repository', 'event', 'runId',
                          'runAttempt', 'siteEnv', 'siteOrigin', 'workflowSha', 'sourceSha',
                          'headSha', 'baseSha', 'nodeVersion', 'packageManager', 'lockfileSha256'):
                with self.subTest(field=field):
                    with self.assertRaises(ValueError):
                        r.verify_identity(dict(manifest, **{field: 'wrong'}), run, 'dev', expected)

    def test_total_order_keeps_original_retry_position(self):
        self.assertLess(r.order(dict(createdAt='2026-10-14', runId='999')),
                        r.order(dict(createdAt='2026-10-15', runId='1')))
        self.assertLess(r.order(dict(createdAt='2026-10-15', runId='9')),
                        r.order(dict(createdAt='2026-10-15', runId='10')))
        run = dict(created_at='2026-10-15T00:00:00Z', id=10, event='pull_request')
        newer = dict(created_at='2026-10-15T00:00:00Z', id=11, event='pull_request')
        with patch.object(r, 'gh', return_value=dict(workflow_runs=[newer, dict(run, created_at='2026-10-14')])), \
                patch.object(r, 'gate', return_value=True), patch.object(r, 'eligible', return_value={'sourceSha': 'source'}), \
                patch.object(r, 'workflow_contract'):
            with self.assertRaisesRegex(ValueError, 'newer eligible'):
                r.reject_newer(run, 'dev')
        with patch.object(r, 'gh', return_value=dict(workflow_runs=[newer, dict(run, created_at='2026-10-14')])), \
                patch.object(r, 'gate', return_value=False):
            r.reject_newer(run, 'dev')

    def test_transport_exact_metadata_and_invalidation_wait(self):
        calls = []
        store = r.Store('dev', 'DISTRIBUTION')
        def aws(*args):
            calls.append(args)
            if args[0:2] == ('s3api', 'put-object'):
                return json.dumps(dict(ChecksumSHA256=args[args.index('--checksum-sha256') + 1])).encode()
            return b'{"Invalidation":{"Id":"INV"}}'
        store.aws = aws
        entry = dict(contentType='text/html; charset=utf-8', cacheControl='public, max-age=0, must-revalidate')
        store.put('index.html', b'checked', entry)
        self.assertIn(entry['contentType'], calls[0])
        self.assertIn(entry['cacheControl'], calls[0])
        self.assertIn(json.dumps(dict(sha256=r.digest(b'checked'))), calls[0])
        store.invalidate('release')
        self.assertEqual(json.loads(calls[1][-1])['Paths']['Items'], ['/*'])
        self.assertEqual(calls[2][:3], ('cloudfront', 'wait', 'invalidation-completed'))

    def test_bootstrap_boundaries(self):
        spec = importlib.util.spec_from_file_location('policies', 'terraform/bootstrap/policies.py')
        policies = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(policies)
        for env, subject in (('dev', ':pull_request'), ('prod', ':ref:refs/heads/main')):
            result = policies.templates(env)
            self.assertTrue(result['trust']['Statement'][0]['Condition']['StringEquals'][
                'token.actions.githubusercontent.com:sub'].endswith(subject))
            self.assertNotIn('iam:', json.dumps(result['publication']))
            self.assertNotIn(f'foom-site-{ "prod" if env == "dev" else "dev" }-', json.dumps(result))
            state = result['backend']['Statement'][2]
            self.assertNotIn('s3:DeleteObject', state['Action'])

class NoCredentialsTests(unittest.TestCase):
    def test_disabled_and_failed_gate_never_request_oidc_or_aws(self):
        for enabled, passed in (('false', True), ('true', False)):
            with patch.dict(r.os.environ, dict(DEPLOY_ENV='dev', DEPLOY_ENABLED=enabled,
                                              GITHUB_RUN_ID='1', GITHUB_RUN_ATTEMPT='1')),\
                    patch.object(r, 'gh', return_value=dict(run_attempt=1)),\
                    patch.object(r, 'gate', return_value=passed),\
                    patch.object(r, 'command', side_effect=AssertionError('No external command')),\
                    patch.object(r.urllib.request, 'urlopen', side_effect=AssertionError('No token')):
                with self.assertRaises(ValueError):
                    r.main()

    def test_archive_size_and_duplicate_zip_entries(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(r, 'LIMIT', 1):
                with self.assertRaisesRegex(ValueError, 'size/digest'):
                    r.unpack(b'too large', r.digest(b'too large'), directory)
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, 'w') as archive:
                archive.writestr('../manifest.json', '{}')
            with self.assertRaisesRegex(ValueError, 'ZIP entries'):
                r.unpack(buf.getvalue(), r.digest(buf.getvalue()), directory)


if __name__ == '__main__':
    unittest.main()
