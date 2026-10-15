import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

type Query = Record<
  string,
  { value: string; multiValue?: { value: string }[] }
>;
const code = readFileSync('terraform/routing.js', 'utf8');
function route(uri: string, querystring: Query = {}) {
  return JSON.parse(
    JSON.stringify(
      runInNewContext(code + '\nhandler(event)', {
        event: { request: { uri, querystring } },
      }),
    ),
  );
}
for (const [input, output] of [
  ['/', '/index.html'],
  ['/features/', '/features/index.html'],
  ['/a/b/', '/a/b/index.html'],
  ['/missing.css', '/missing.css'],
  ['/_astro/app.hash.js', '/_astro/app.hash.js'],
  ['/404.html', '/404.html'],
]) {
  test(`origin key ${input}`, () => assert.equal(route(input!).uri, output));
}
for (const [input, output] of [
  ['/features', '/features/'],
  ['/index.html', '/'],
  ['/a/b/index.html', '/a/b/'],
  ['/missing', '/missing/'],
]) {
  test(`canonical ${input}`, () => {
    const result = route(input!, {
      q: { value: 'a%20b' },
      tag: { value: 'x', multiValue: [{ value: 'x' }, { value: 'y%26z' }] },
    });
    assert.equal(result.statusCode, 308);
    assert.equal(
      result.headers.location.value,
      output + '?q=a%20b&tag=x&tag=y%26z',
    );
  });
}
for (const uri of [
  '//evil.test',
  '/a/..//evil.test',
  '/a/%2e%2e/b',
  '/\\evil.test',
  '/%2fevil',
  '/a%5cb',
  '/a%0db',
  '/a\nb',
]) {
  test(`reject ambiguous URI ${JSON.stringify(uri)}`, () =>
    assert.equal(route(uri).statusCode, 400));
}
test('rewrite preserves request query without redirect', () =>
  assert.deepEqual(route('/a/', { x: { value: '1' } }).querystring, {
    x: { value: '1' },
  }));
