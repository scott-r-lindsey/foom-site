import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  manifest,
  publication,
  cleanupCandidates,
  retentionMs,
  fresh,
  immutable,
} from '../../scripts/hosting/manifest.ts';

async function fixture(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'foom-files-'));
  try {
    await writeFile(join(directory, 'index.html'), '<h1>Home</h1>');
    await writeFile(join(directory, '404.html'), '<h1>Missing</h1>');
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
test('content hashes, MIME, conservative caching and publication order', () =>
  fixture(async (directory) => {
    await writeFile(join(directory, '.gitkeep'), '');
    await mkdir(join(directory, '_astro'));
    const data = 'body {}';
    const hash = createHash('sha256').update(data).digest('hex');
    for (const name of [
      `_astro/app.${hash}.css`,
      '_astro/fake.abcdef12.css',
      'robots.txt',
      'sitemap.xml',
      'site.webmanifest',
    ])
      await writeFile(join(directory, name), data);
    const result = await manifest(directory);
    const proven = result.files.find((file) => file.key.includes(hash))!;
    assert.equal(proven.cacheControl, immutable);
    assert.equal(proven.contentType, 'text/css; charset=utf-8');
    assert.equal(proven.sha256, hash);
    assert.equal(
      proven.checksumSHA256,
      Buffer.from(hash, 'hex').toString('base64'),
    );
    assert.equal(proven.bytes, Buffer.byteLength(data));
    for (const file of result.files.filter((file) => file !== proven))
      assert.equal(file.cacheControl, fresh);
    const plan = publication(result);
    assert.ok(plan.uploadAssets.every((file) => !file.key.endsWith('.html')));
    assert.equal(
      plan.uploadDocuments.filter((file) => file.key.endsWith('.html')).length,
      2,
    );
    assert.deepEqual(plan.invalidate, ['/*']);
  }));
test('removed pages are retired; old assets stay reachable, rollback restores prior set', () =>
  fixture(async (directory) => {
    await writeFile(join(directory, 'old.css'), 'old');
    await writeFile(join(directory, 'removed.html'), 'old page');
    const previous = await manifest(directory);
    await rm(join(directory, 'old.css'));
    await rm(join(directory, 'removed.html'));
    const next = await manifest(directory);
    const plan = publication(next, previous);
    assert.deepEqual(plan.retainAssets, ['old.css']);
    assert.deepEqual(plan.removeDocuments, ['removed.html']);
    assert.ok(
      publication(previous, next).uploadAssets.some(
        (file) => file.key === 'old.css',
      ),
    );
  }));
test('cleanup respects supersession time, 30 day boundary and rollback pins', () => {
  const retired = [
    { key: 'old', supersededAt: 100 },
    { key: 'pinned', supersededAt: 0 },
    { key: 'bad', supersededAt: NaN },
  ];
  assert.deepEqual(
    cleanupCandidates(retired, new Set(['pinned']), retentionMs + 99),
    [],
  );
  assert.deepEqual(
    cleanupCandidates(retired, new Set(['pinned']), retentionMs + 100),
    ['old'],
  );
});
test('unknown MIME and symlinks fail closed', () =>
  fixture(async (directory) => {
    await writeFile(join(directory, 'unknown.xyz'), 'x');
    await assert.rejects(manifest(directory), /Unknown MIME/);
    await rm(join(directory, 'unknown.xyz'));
    await symlink('/etc/passwd', join(directory, 'leak.txt'));
    await assert.rejects(manifest(directory), /Non-regular/);
  }));

test('immutable keys cannot be overwritten with different bytes', () =>
  fixture(async (directory) => {
    await mkdir(join(directory, '_astro'));
    const digest = createHash('sha256').update('old').digest('hex');
    const key = `_astro/app.${digest}.js`;
    await writeFile(join(directory, key), 'old');
    const previous = await manifest(directory);
    await writeFile(join(directory, key), 'changed');
    const next = await manifest(directory);
    assert.throws(
      () => publication(next, previous),
      /Immutable object changed/,
    );
  }));

test('HTML always revalidates even with a verified digest or uppercase extension', () =>
  fixture(async (directory) => {
    await mkdir(join(directory, '_astro'));
    const data = '<h1>Never immutable</h1>';
    const hash = createHash('sha256').update(data).digest('hex');
    await writeFile(join(directory, `_astro/page.${hash}.HTML`), data);
    const entry = (await manifest(directory)).files.find((file) =>
      file.key.includes(hash),
    )!;
    assert.equal(entry.contentType, 'text/html; charset=utf-8');
    assert.equal(entry.cacheControl, fresh);
    assert.equal(entry.phase, 'documents');
  }));

test('reintroduced assets use latest supersession and uncertain history blocks cleanup', () => {
  const retired = [
    { key: 'reintroduced', supersededAt: 0 },
    { key: 'reintroduced', supersededAt: retentionMs },
    { key: 'uncertain', supersededAt: 0 },
    { key: 'uncertain', supersededAt: NaN },
  ];
  assert.deepEqual(cleanupCandidates(retired, new Set(), retentionMs), []);
  assert.deepEqual(cleanupCandidates(retired, new Set(), retentionMs * 2), [
    'reintroduced',
  ]);
});
