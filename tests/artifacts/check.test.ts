import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkArtifacts } from './check.ts';

const page = (body: string) =>
  `<title>Fixture</title><main><h1>Fixture</h1>${body}</main>`;
const valid = {
  'index.html': page(
    '<a href="/guide/#details">Guide</a><link href="/_astro/site.hash.css" rel="stylesheet"><a href="https://example.com/missing">External</a><img srcset="/image.svg 1x, /image.svg 2x"><link rel="canonical" href="https://foom.example/">',
  ),
  '404.html':
    '<title>Not found</title><main><h1>404</h1><a href="/">Home</a></main>',
  'guide/index.html': page(
    '<h2 id="details">Details</h2><a href="../#top">Home</a><a href="#details">Here</a>',
  ),
  '_astro/site.hash.css': 'body { background: url(../image.svg); }',
  'image.svg': '<svg/>',
};
valid['index.html'] += '<div id="top"></div>';

async function fixture(
  changes: Record<string, string | null>,
  run: (dir: string) => Promise<void>,
) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'foom-artifacts-'));
  try {
    for (const [file, content] of Object.entries({ ...valid, ...changes })) {
      if (content === null) continue;
      await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
      await writeFile(path.join(dir, file), content);
    }
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('valid nested routes, fragments, fingerprinted assets, CSS and external URLs pass', async () => {
  await fixture({}, async (dir) =>
    assert.deepEqual(await checkArtifacts(dir), []),
  );
});

for (const [name, changes, expected] of [
  [
    'missing home',
    { 'index.html': null },
    /Missing required output: index.html/,
  ],
  ['missing 404', { '404.html': null }, /Missing required output: 404.html/],
  [
    'missing nested route',
    { 'guide/index.html': null },
    /missing local target \/guide\/#details/,
  ],
  [
    'missing fragment',
    { 'guide/index.html': page('<h2>No target</h2>') },
    /missing fragment \/guide\/#details/,
  ],
  [
    'missing stylesheet',
    { '_astro/site.hash.css': null },
    /missing local target \/_astro\/site.hash.css/,
  ],
  [
    'missing CSS asset',
    { 'image.svg': null },
    /site.hash.css: missing local target ..\/image.svg/,
  ],
  [
    'unhelpful 404',
    { '404.html': page('Welcome') },
    /expected useful not-found content/,
  ],
  [
    'missing srcset asset',
    { 'index.html': page('<img srcset="/missing.png 1x">') },
    /missing local target \/missing.png/,
  ],
] as const) {
  test(`rejects ${name}`, async () => {
    await fixture(changes, async (dir) =>
      assert.match((await checkArtifacts(dir)).join('\n'), expected),
    );
  });
}

test('missing build directory fails with build instruction', async () => {
  await fixture({}, async (dir) =>
    assert.match(
      (await checkArtifacts(path.join(dir, 'absent'))).join(),
      /run pnpm build first/,
    ),
  );
});

test('CLI exits nonzero for broken output', async () => {
  await fixture({ 'index.html': null }, async (dir) => {
    const result = spawnSync(
      process.execPath,
      ['tests/artifacts/check.ts', dir],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing required output: index.html/);
  });
});

test('mixed data and local srcset still validates the local candidate', async () => {
  await fixture(
    {
      'index.html': page(
        '<img srcset="data:image/svg+xml,svg 1x, /missing.png 2x">',
      ),
    },
    async (dir) => {
      assert.match(
        (await checkArtifacts(dir)).join('\n'),
        /missing local target \/missing.png/,
      );
    },
  );
});
