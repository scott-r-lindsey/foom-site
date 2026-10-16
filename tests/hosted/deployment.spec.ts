import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { manifest } from '../../scripts/hosting/manifest.ts';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const fixturesAbsent = process.env.HOSTED_FIXTURES === 'absent';
const query = '?q=a%20b&tag=x&tag=y%26z';

// Compare an explicitly supplied exact build, not just successful responses.
test('all deployed files match the supplied build bytes and metadata', async ({
  request,
}) => {
  const directory = process.env.HOSTED_DIST;
  if (!directory)
    throw new Error('HOSTED_DIST must point to the exact development build.');
  const { files } = await manifest(directory);
  for (const file of files) {
    const key = file.key;
    const absolute = join(directory, key);
    const route = `/${key}`.replace(/index\.html$/, '');
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    const bytes = await response.body();
    expect(bytes.equals(await readFile(absolute)), route).toBe(true);
    const headers = response.headers();
    expect(headers['cache-control']).toBe(file.cacheControl);
    expect(headers['content-type']).toBe(file.contentType);
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toBe(
      'camera=(), microphone=(), geolocation=()',
    );
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    console.log(
      `${response.status()} ${route} sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    );
  }
});

test('canonical redirects preserve encoded and repeated query values', async ({
  request,
}) => {
  for (const [path, target] of [
    ['/index.html', '/'],
    ['/verification/a', '/verification/a/'],
    ['/verification/a/index.html', '/verification/a/'],
  ]) {
    const response = await request.get(path + query, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    const location = response.headers()['location']!;
    expect(location.split('?')[0]).toBe(target);
    // CloudFront's query object does not preserve ordering between keys.
    // Compare encoded pairs while retaining every repeated value.
    expect(location.split('?')[1]!.split('&').sort()).toEqual(
      query.slice(1).split('&').sort(),
    );
  }
  const http = await request.get(
    'http://dev.foom-term.com/verification/a/' + query,
    { maxRedirects: 0 },
  );
  expect(http.status()).toBe(301);
  expect(http.headers()['location']).toBe(
    'https://dev.foom-term.com/verification/a/' + query,
  );
});

test('missing routes and assets return the custom 404 with 404 status', async ({
  request,
}) => {
  for (const path of ['/verification/unknown/', '/missing-issue12.css']) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('text/html');
    expect(await response.text()).toContain('return to the home page');
  }
});

test('development metadata and sitemap stay on the development origin', async ({
  request,
  baseURL,
}) => {
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /');
  const sitemap = await request.get('/sitemap.xml');
  const xml = await sitemap.text();
  for (const route of fixturesAbsent
    ? ['/']
    : ['/', '/verification/a/', '/verification/b/'])
    expect(xml).toContain(`${baseURL}${route}</loc>`);
  expect(xml).not.toContain('https://foom-term.com');
  if (fixturesAbsent) expect(xml).not.toContain('/verification/');
});

for (const route of ['/verification/a/', '/verification/b/']) {
  test(`${route} nested page layout, accessibility, metadata and keyboard`, async ({
    page,
    baseURL,
  }) => {
    const response = await page.goto(route);
    if (fixturesAbsent) {
      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole('link', { name: 'return to the home page' }),
      ).toBeVisible();
      return;
    }
    expect(response?.status()).toBe(200);
    expect(await response?.securityDetails()).toMatchObject({
      protocol: /TLS 1\.[23]/,
    });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${baseURL}${route}`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Skip to content' }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Return home', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${baseURL}/`);
  });
}
