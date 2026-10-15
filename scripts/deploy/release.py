"""Trusted-main deployment tool. No cloud calls on import; CLI requires enablement.

AWS CLI is the transport; subprocess arguments never use a shell. The environment
workflow lock is mandatory, including for operator recovery/rollback.
"""
import base64
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile
import urllib.request
import zipfile

REPO = 'scott-r-lindsey/foom-site'
LIMIT = 50 * 1024 * 1024
EXPANDED = 100 * 1024 * 1024
CONFIG = {
    'dev': ('development', 'https://dev.foom-term.com', 'development'),
    'prod': ('production', 'https://foom-term.com', 'production'),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def command(*args):
    return subprocess.check_output(args)


def gh(path):
    return json.loads(command('gh', 'api', f'repos/{REPO}/{path}'))


def order(identity):
    return identity['createdAt'], int(identity['runId'])


def safe_key(key):
    require(isinstance(key, str) and re.fullmatch(r'[A-Za-z0-9_./-]+', key)
            and all(p and not p.startswith('.') for p in key.split('/')),
            'Unsafe object key')
    return key


def unpack(data, expected_digest, directory):
    require(len(data) <= LIMIT and digest(data) == expected_digest,
            'Artifact size/digest mismatch')
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        require(sorted(e.filename for e in entries) ==
                ['dist.tar.gz', 'files.json', 'manifest.json'], 'Unexpected ZIP entries')
        require(sum(e.file_size for e in entries) <= LIMIT, 'ZIP expansion limit')
        payload = {e.filename: archive.read(e) for e in entries}
    manifest = json.loads(payload['manifest.json'])
    require(manifest['archive'] == 'dist.tar.gz' and
            digest(payload['dist.tar.gz']) == manifest['archiveSha256'],
            'Archive checksum mismatch')
    root = Path(directory)
    with tarfile.open(fileobj=io.BytesIO(payload['dist.tar.gz']), mode='r:gz') as tar:
        members = tar.getmembers()
        require(len(members) <= 10000 and sum(m.size for m in members) <= EXPANDED,
                'Tar expansion limit')
        names = set()
        for member in members:
            name = member.name.removeprefix('./').rstrip('/')
            if member.isdir() and name in ('', '.'):
                continue
            safe_key(name)
            require(name not in names, 'Duplicate tar member')
            names.add(name)
            require(member.isfile() or member.isdir(), 'Non-regular tar member')
            target = root / name
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(tar.extractfile(member).read())
    files = json.loads(payload['files.json'])
    # Recompute using the trusted #10 implementation, not artifact-controlled code.
    script = "import {manifest} from './scripts/hosting/manifest.ts'; console.log(JSON.stringify(await manifest(process.argv[1])));"
    actual = json.loads(command('node', '--input-type=module', '-e', script, str(root)))
    require(files == actual, 'File manifest mismatch')
    require(not any(f['key'].startswith('_releases/') for f in files['files']),
            'Reserved release namespace')
    return manifest, files


def eligible(run, environment, pr_number=None):
    require(run['path'] == '.github/workflows/quality.yml' and
            run['repository']['full_name'] == REPO, 'Untrusted workflow/repository')
    main = gh('git/ref/heads/main')['object']['sha']
    if environment == 'prod':
        require(run['event'] == 'push' and run['head_branch'] == 'main' and
                run['head_sha'] == main, 'Stale main run')
        return {'headSha': main, 'baseSha': None, 'sourceSha': main}
    require(run['event'] == 'pull_request', 'Dev requires PR')
    if pr_number is None:
        prs = run['pull_requests']
        require(len(prs) == 1, 'Ambiguous PR identity')
        pr_number = prs[0]['number']
    pr = gh(f'pulls/{int(pr_number)}')
    require(pr['state'] == 'open' and pr['head']['repo']['full_name'] == REPO and
            pr['base']['ref'] == 'main' and pr['base']['repo']['full_name'] == REPO and
            pr['head']['sha'] == run['head_sha'] and pr['base']['sha'] == main and
            pr['merge_commit_sha'], 'Closed/fork/stale PR or base')
    return {'headSha': pr['head']['sha'], 'baseSha': main,
            'sourceSha': pr['merge_commit_sha']}


def gate(run):
    jobs = gh(f"actions/runs/{run['id']}/attempts/{run['run_attempt']}/jobs?per_page=100")
    require(jobs['total_count'] <= 100, 'Unexpected job count')
    matches = [j for j in jobs['jobs'] if j['name'] == 'Quality gate']
    return len(matches) == 1 and matches[0]['conclusion'] == 'success'


def verify_identity(manifest, run, environment, expected):
    site_env, origin, _ = CONFIG[environment]
    values = dict(schemaVersion=1, purpose='deployment', deployable=True,
                  repository=REPO, event=run['event'], runId=str(run['id']),
                  runAttempt=str(run['run_attempt']), siteEnv=site_env,
                  siteOrigin=origin, workflowSha=expected['sourceSha'], **expected)
    require(all(manifest.get(k) == v for k, v in values.items()),
            'Artifact identity/settings/schema mismatch')
    require(manifest.get('nodeVersion') == 'v24.17.0' and
            manifest.get('packageManager') == 'pnpm@11.19.0' and
            re.fullmatch('[a-f0-9]{64}', manifest.get('lockfileSha256', '')),
            'Toolchain/lock identity mismatch')
    # Bind lock digest to the selected source via GitHub, not local main.
    lock = gh(f"contents/pnpm-lock.yaml?ref={expected['sourceSha']}")
    require(digest(base64.b64decode(lock['content'])) == manifest['lockfileSha256'],
            'Source lockfile mismatch')


def reject_newer(run, environment):
    # Enumerate newest first; run_attempt does not affect original ordering.
    page = 1
    while True:
        runs = gh(f'actions/workflows/quality.yml/runs?per_page=100&page={page}')['workflow_runs']
        for other in runs:
            if (other['created_at'], other['id']) <= (run['created_at'], run['id']):
                continue
            if other['event'] != run['event'] or not gate(other):
                continue
            try:
                eligible(other, environment)
            except ValueError:
                continue
            raise ValueError('A newer eligible passing run exists')
        if not runs or min(r['created_at'] for r in runs) < run['created_at']:
            return
        page += 1


class Store:
    def __init__(self, environment, distribution):
        self.bucket = f'foom-site-{environment}-225319921763-us-west-2'
        self.distribution = distribution

    def aws(self, *args):
        return command('aws', '--region', 'us-west-2', *args)

    def get(self, key):
        # Missing is distinct from access/network failure. list only exact prefix.
        result = json.loads(self.aws('s3api', 'list-objects-v2', '--bucket', self.bucket,
                                    '--prefix', key, '--max-keys', '1'))
        if not any(e['Key'] == key for e in result.get('Contents', [])):
            return None
        with tempfile.TemporaryDirectory() as temp:
            path = str(Path(temp) / 'object')
            self.aws('s3api', 'get-object', '--bucket', self.bucket, '--key', key, path)
            return Path(path).read_bytes()

    def empty(self):
        result = json.loads(self.aws('s3api', 'list-objects-v2', '--bucket', self.bucket, '--max-keys', '1'))
        return not result.get('Contents')

    def put(self, key, data, entry=None):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'object'
            path.write_bytes(data)
            checksum = base64.b64encode(hashlib.sha256(data).digest()).decode()
            args = ['s3api', 'put-object', '--bucket', self.bucket, '--key', key,
                    '--body', str(path), '--checksum-sha256', checksum,
                    '--content-type', entry['contentType'] if entry else 'application/octet-stream',
                    '--cache-control', entry['cacheControl'] if entry else 'no-store',
                    '--metadata', json.dumps({'sha256': digest(data)})]
            result = json.loads(self.aws(*args))
            require(result.get('ChecksumSHA256') == checksum, 'Upload checksum not confirmed')

    def save(self, ledger):
        self.put('_releases/ledger.json', json.dumps(ledger).encode())

    def delete_document(self, key):
        self.aws('s3api', 'delete-object', '--bucket', self.bucket, '--key', key)

    def invalidate(self, release_id):
        batch = json.dumps({'Paths': {'Quantity': 1, 'Items': ['/*']},
                            'CallerReference': release_id})
        result = json.loads(self.aws('cloudfront', 'create-invalidation',
                                    '--distribution-id', self.distribution,
                                    '--invalidation-batch', batch))
        self.aws('cloudfront', 'wait', 'invalidation-completed', '--distribution-id',
                 self.distribution, '--id', result['Invalidation']['Id'])


def publish(store, ledger, identity, files, directory, artifact, now, recovery=False):
    """Checkpoint before every phase. Incomplete transactions require explicit recovery."""
    require(ledger.get('schemaVersion') == 1, 'Unknown ledger schema')
    pending = ledger.get('pending')
    require(not pending or (recovery and pending['identity'] == identity),
            'Incomplete release: explicit recovery required')
    require(not ledger.get('current') or order(identity) > order(ledger['current']['identity'])
            or recovery, 'Older/equal durable release identity')
    for release in ledger['releases'] + ([pending] if pending else []):
        old = {f['key']: f for f in release['files']['files']}
        for entry in files['files']:
            prior = old.get(entry['key'])
            require(not prior or 'immutable' not in prior['cacheControl'] or
                    prior['sha256'] == entry['sha256'], 'Retained immutable conflict')
    release_id = f"{identity['runId']}-{identity['runAttempt']}-{identity['artifactId']}"
    prior_docs = {f['key'] for r in ledger['releases'] for f in r['files']['files']
                  if f['phase'] == 'documents'}
    # Archives live in S3 indefinitely; CI artifact retention is never the backup.
    store.put(f'_releases/{release_id}/artifact.zip', artifact)
    pending = {'identity': identity, 'files': files, 'phase': 'preserved'}
    ledger['pending'] = pending
    store.save(ledger)
    for phase in ('assets', 'documents'):
        pending['phase'] = phase
        store.save(ledger)
        for entry in files['files']:
            if entry['phase'] == phase:
                safe_key(entry['key'])
                store.put(entry['key'], (Path(directory) / entry['key']).read_bytes(), entry)
    pending['phase'] = 'removing-documents'
    store.save(ledger)
    for key in sorted(prior_docs - {f['key'] for f in files['files']}):
        store.delete_document(safe_key(key))
    pending['phase'] = 'invalidation'
    store.save(ledger)
    store.invalidate(release_id)
    if ledger.get('current'):
        for retained in ledger['releases']:
            if retained['identity'] == ledger['current']['identity']:
                retained['supersededAt'] = now
    release = {'identity': identity, 'files': files, 'publishedAt': now,
               'supersededAt': None, 'archiveKey': f'_releases/{release_id}/artifact.zip'}
    ledger['releases'].append(release)
    ledger['current'] = release
    ledger['pending'] = None
    store.save(ledger)


def main():
    environment = os.environ['DEPLOY_ENV']
    require(environment in CONFIG and os.environ.get('DEPLOY_ENABLED') == 'true',
            'Deployment disabled')
    run = gh(f"actions/runs/{int(os.environ['GITHUB_RUN_ID'])}")
    require(run['run_attempt'] == int(os.environ['GITHUB_RUN_ATTEMPT']), 'Stale attempt')
    require(gate(run), 'Quality gate must succeed')
    expected = eligible(run, environment, os.environ.get('PR_NUMBER') or None)
    reject_newer(run, environment)
    # A workflow-editing PR may validate but must not publish. Run only the main
    # definition/tool contract, even though GitHub resolves this local reusable
    # workflow while parsing the initial bootstrap PR.
    for workflow in ('quality.yml', 'publish.yml'):
        path = f'.github/workflows/{workflow}'
        source = gh(f"contents/{path}?ref={expected['sourceSha']}")
        require(base64.b64decode(source['content']) == Path(path).read_bytes(),
                'Workflow changes require main integration before publication')
    artifact_id = int(os.environ['ARTIFACT_ID'])
    metadata = gh(f'actions/artifacts/{artifact_id}')
    require(metadata['workflow_run']['id'] == run['id'] and not metadata['expired'] and
            metadata['size_in_bytes'] <= LIMIT and
            metadata['name'] == f"deployment-{CONFIG[environment][0]}-{expected['sourceSha']}-{run['id']}-{run['run_attempt']}",
            'Artifact provenance mismatch')
    # gh handles authenticated redirect; stdout is a bounded GitHub artifact ZIP.
    data = command('gh', 'api', f'repos/{REPO}/actions/artifacts/{artifact_id}/zip')
    with tempfile.TemporaryDirectory() as directory:
        manifest, files = unpack(data, metadata['digest'].removeprefix('sha256:'), directory)
        verify_identity(manifest, run, environment, expected)
        identity = {**expected, 'runId': str(run['id']), 'runAttempt': str(run['run_attempt']),
                    'createdAt': run['created_at'], 'artifactId': str(artifact_id),
                    'artifactDigest': metadata['digest'], 'environment': environment}
        # Credentials are requested only after all artifact checks. No PR code executes.
        token_url = os.environ['ACTIONS_ID_TOKEN_REQUEST_URL'] + '&audience=sts.amazonaws.com'
        request = urllib.request.Request(token_url, headers={
            'Authorization': 'Bearer ' + os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
        token = json.load(urllib.request.urlopen(request))['value']
        role = f'arn:aws:iam::225319921763:role/foom-site-github-{CONFIG[environment][2]}-deploy'
        session = json.loads(command('aws', 'sts', 'assume-role-with-web-identity',
                                    '--role-arn', role, '--role-session-name', f"foom-{run['id']}",
                                    '--web-identity-token', token, '--duration-seconds', '3600'))
        creds = session['Credentials']
        os.environ.update(AWS_ACCESS_KEY_ID=creds['AccessKeyId'],
                          AWS_SECRET_ACCESS_KEY=creds['SecretAccessKey'],
                          AWS_SESSION_TOKEN=creds['SessionToken'])
        # Only separately approved, trusted-main infrastructure may run with credentials.
        if os.environ.get('INFRA_APPROVED_SHA'):
            require(command('git', 'rev-parse', 'HEAD').decode().strip() ==
                    os.environ['INFRA_APPROVED_SHA'], 'Infrastructure approval SHA mismatch')
            os.environ['TF_WORKSPACE'] = environment
            command('terraform', '-chdir=terraform', 'init', '-input=false', '-lockfile=readonly')
            command('terraform', '-chdir=terraform', 'plan', '-input=false',
                    '-out=approved.tfplan', f'-var=environment={environment}')
            command('terraform', '-chdir=terraform', 'apply', '-input=false', 'approved.tfplan')
            outputs = json.loads(command('terraform', '-chdir=terraform', 'output', '-json', 'publication'))
            require(outputs['environment'] == environment and outputs['origin'] == CONFIG[environment][1]
                    and outputs['bucket'] == f'foom-site-{environment}-225319921763-us-west-2'
                    and outputs['distribution_id'] == os.environ['DISTRIBUTION_ID'],
                    'Terraform output differs from approved publication target')
        distribution = os.environ['DISTRIBUTION_ID']
        require(re.fullmatch('[A-Z0-9]{10,32}', distribution), 'Invalid distribution ID')
        store = Store(environment, distribution)
        raw = store.get('_releases/ledger.json')
        require(raw is not None or store.empty(), 'Missing ledger in nonempty bucket: reconcile first')
        ledger = json.loads(raw) if raw else {'schemaVersion': 1, 'current': None,
                                            'pending': None, 'releases': []}
        # Freshness is rechecked under the workflow lock immediately before mutation.
        require(eligible(run, environment, os.environ.get('PR_NUMBER') or None) == expected,
                'Source changed during verification')
        reject_newer(run, environment)
        recovery = os.environ.get('RECOVERY_RELEASE', '')
        if recovery:
            require(re.fullmatch(r'[0-9]+-[0-9]+-[0-9]+', recovery), 'Invalid recovery release')
            retained = ledger['releases'] + ([ledger['pending']] if ledger.get('pending') else [])
            matches = [r for r in retained if
                       f"{r['identity']['runId']}-{r['identity']['runAttempt']}-{r['identity']['artifactId']}" == recovery]
            require(bool(matches), 'Recovery release not retained')
            selected = matches[-1]
            data = store.get(f'_releases/{recovery}/artifact.zip')
            require(data is not None, 'Missing retained archive')
            # Unpack into an empty directory; never mix rollback and new files.
            import shutil
            shutil.rmtree(directory)
            Path(directory).mkdir()
            manifest, files = unpack(data, selected['identity']['artifactDigest'].removeprefix('sha256:'), directory)
            require(files == selected['files'] and manifest['siteOrigin'] == CONFIG[environment][1]
                    and manifest['deployable'] is True and manifest['purpose'] == 'deployment',
                    'Retained release mismatch')
            identity['rollbackOf'] = selected['identity']
            # New scheduling identity; the retained artifact remains the content identity.
            identity['contentSha'] = manifest['sourceSha']
            identity['artifactDigest'] = selected['identity']['artifactDigest']
            if ledger.get('pending'):
                failed = ledger['pending']
                failed.update(publishedAt=None, supersededAt=None, failed=True)
                ledger['releases'].append(failed)
                ledger['pending'] = None
        publish(store, ledger, identity, files, directory, data,
                datetime.now(timezone.utc).isoformat(), recovery=bool(recovery))
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write(f"Published {CONFIG[environment][1]}\n\nCommit: `{identity.get('contentSha', expected['sourceSha'])}` "
                          f"Artifact: `{artifact_id}` Digest: `{metadata['digest']}`\n")


if __name__ == '__main__':
    main()
