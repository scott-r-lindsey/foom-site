import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { load } from 'cheerio';

const source = await readFile('src/styles/global.css', 'utf8');
const roots = [...source.matchAll(/:root\s*\{([^}]+)\}/g)]
  .map((match) =>
    Object.fromEntries(
      [...match[1]!.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [
        m[1]!,
        m[2]!.trim(),
      ]),
    ),
  )
  .filter((tokens) => tokens.bg);
function resolve(tokens: Record<string, string>, key: string): string {
  const value = tokens[key];
  assert.ok(value, `missing ${key}`);
  const alias = /^var\(--([\w-]+)\)$/.exec(value);
  return alias ? resolve(tokens, alias[1]!) : value;
}
function rgb(hex: string): number[] {
  assert.match(hex, /^#[\da-f]{6}$/i);
  return [1, 3, 5].map(
    (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
}
function luminance(hex: string): number {
  const linear = rgb(hex).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}
function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

test('WCAG calculation has known black/white and equal-color results', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#05040a', '#05040a'), 1);
  assert.ok(contrast('#777777', '#ffffff') < 4.5);
});

for (const [index, mode] of ['dark', 'light'].entries()) {
  test(`${mode} CSS inks meet 4.5:1 on both surfaces; aliases remain compatible`, () => {
    assert.equal(roots.length, 2);
    assert.match(source, /@media \(prefers-color-scheme: light\)/);
    const tokens = { ...roots[0], ...roots[index] };
    assert.equal(resolve(tokens, 'hole'), '#06050b');
    for (const key of [
      'ink',
      'muted',
      'accent',
      'highlight',
      'attention-ink',
      'done-ink',
      'failed-ink',
    ]) {
      for (const background of ['bg', 'surface']) {
        const ratio = contrast(
          resolve(tokens, key),
          resolve(tokens, background),
        );
        assert.ok(ratio >= 4.5, `${mode} ${key} on ${background}: ${ratio}`);
      }
    }
    for (const [old, current] of Object.entries({
      background: 'bg',
      surface: 'surface',
      text: 'ink',
      muted: 'muted',
      accent: 'accent',
      border: 'line',
      focus: 'highlight',
    })) {
      assert.equal(resolve(tokens, `color-${old}`), resolve(tokens, current));
    }
    for (const key of [
      'line',
      'accent-deep',
      'attention',
      'done',
      'failed',
      'space-1',
      'space-6',
      'text-small',
      'text-heading',
    ])
      assert.ok(tokens[key]);
  });
}

/** Brand's reserved hue bands (HSL, saturation >20%). Alpha never exempts a hue. */
function reserved(channels: number[]): boolean {
  const [r, g, b] = channels;
  const max = Math.max(r!, g!, b!),
    min = Math.min(r!, g!, b!);
  const delta = max - min;
  if (!delta) return false;
  const saturation = delta / (1 - Math.abs(max + min - 1));
  let hue =
    max === r
      ? ((g! - b!) / delta) % 6
      : max === g
        ? (b! - r!) / delta + 2
        : (r! - g!) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return (
    saturation > 0.2 && ((hue >= 20 && hue <= 55) || (hue >= 310 && hue <= 350))
  );
}
function reservedColors(css: string): string[] {
  const violations: string[] = [];
  for (const match of css.matchAll(
    /#[\da-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:orange|darkorange|magenta|fuchsia|hotpink|deeppink|gold|goldenrod)\b/gi,
  )) {
    const value = match[0].toLowerCase();
    if (value.startsWith('#')) {
      let hex = value.slice(1);
      if (hex.length === 3 || hex.length === 4)
        hex = [...hex].map((c) => c + c).join('');
      if (reserved(rgb(`#${hex.slice(0, 6)}`))) violations.push(value);
    } else if (value.startsWith('rgb')) {
      const components = value
        .match(/[\d.]+%?/g)!
        .slice(0, 3)
        .map((n) => parseFloat(n) / (n.endsWith('%') ? 100 : 255));
      if (reserved(components)) violations.push(value);
    } else if (value.startsWith('hsl')) {
      const [h, s] = value.match(/[\d.]+/g)!.map(Number);
      if (s! > 20 && ((h! >= 20 && h! <= 55) || (h! >= 310 && h! <= 350)))
        violations.push(value);
    } else violations.push(value);
  }
  return violations;
}
test('reserved hue scan catches alternate CSS encodings and leaves violet alone', () => {
  assert.equal(
    reservedColors(
      '#ffb23e #ff2e88 rgb(255 178 62 / .5) hsl(330 90% 50%) orange #f90',
    ).length,
    6,
  );
  assert.deepEqual(reservedColors('#9b6bff #5b2bd9 #f4efff #06050b'), []);
});

async function files(directory: string): Promise<string[]> {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map((entry) => {
        const filename = path.join(directory, entry.name);
        return entry.isDirectory() ? files(filename) : [filename];
      }),
    )
  ).flat();
}
const built = await files('dist');
test('built CSS/SVG reserve amber and magenta exclusively for their root tokens', async () => {
  for (const file of built.filter((name) => /\.(css|svg)$/.test(name))) {
    let content = (await readFile(file, 'utf8')).replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    // Only root token declarations may contain reserved colors. No shell status is rendered.
    content = content.replace(/:root\s*\{([^}]+)\}/g, (rule) =>
      rule.replace(/--(?:attention|failed)(?:-ink)?:[^;}]+[;]?/g, ''),
    );
    assert.deepEqual(reservedColors(content), [], file);
    assert.doesNotMatch(
      content,
      /var\(--(?:attention|failed)(?:-ink)?\)/,
      `${file}: status tokens require labeled, shaped status UI before use`,
    );
  }
});

function pngSize(buffer: Buffer): number[] {
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}
test('every built page has absolute matching social URLs and fingerprinted PNG icons/fonts', async () => {
  for (const file of built.filter((name) => name.endsWith('.html'))) {
    const $ = load(await readFile(file, 'utf8'));
    const canonical = new URL($('link[rel="canonical"]').attr('href')!);
    const image = new URL($('meta[property="og:image"]').attr('content')!);
    assert.equal(image.origin, canonical.origin);
    assert.match(image.pathname, /^\/_astro\/social\.[\w-]+\.png$/);
    assert.equal(
      $('meta[name="twitter:card"]').attr('content'),
      'summary_large_image',
    );
    assert.equal($('meta[name="twitter:image"]').attr('content'), image.href);
    assert.equal($('meta[property="og:image:width"]').attr('content'), '1200');
    assert.equal($('meta[property="og:image:height"]').attr('content'), '630');
    assert.ok($('meta[property="og:image:alt"]').attr('content'));
    assert.deepEqual(
      pngSize(await readFile(path.join('dist', image.pathname))),
      [1200, 630],
    );
    for (const [rel, size] of [
      ['icon', 16],
      ['icon', 32],
      ['apple-touch-icon', 180],
    ] as const) {
      const href = $(`link[rel="${rel}"][sizes="${size}x${size}"]`).attr(
        'href',
      )!;
      assert.match(href, /^\/_astro\/.+\.[\w-]+\.png$/);
      assert.deepEqual(pngSize(await readFile(path.join('dist', href))), [
        size,
        size,
      ]);
    }
    assert.equal($('link[rel="preload"][as="font"][crossorigin]').length, 3);
    const license = $('link[rel="license"]').attr('href')!;
    assert.match(license, /^\/_astro\/third-party-notices\.[\w-]+\.txt$/);
    const notices = await readFile(path.join('dist', license), 'utf8');
    for (const text of [
      'Copyright 2026 Scott Lindsey',
      'Apache License',
      'SIL OPEN FONT LICENSE',
      'archivoblack-OFL.txt',
      'courierprime-OFL.txt',
      'geist-OFL.txt',
      'geistmono-OFL.txt',
    ])
      assert.ok(notices.includes(text), text);
    assert.equal($('script').length, 0);
  }
});
