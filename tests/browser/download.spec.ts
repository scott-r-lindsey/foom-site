import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const release = 'https://github.com/scott-r-lindsey/foom/releases/tag/nightly';
const sums =
  'https://github.com/scott-r-lindsey/foom/releases/download/nightly/SHA256SUMS';
const sandbox =
  'https://github.com/scott-r-lindsey/foom/blob/main/docs/nightly-opening.md#ubuntu-2404-sandbox-setup';

test('download lists nightly platforms and stable destinations accessibly', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('requestfailed', (request) => failures.push(request.url()));
  page.on('response', (response) => {
    if (!response.ok()) failures.push(`${response.status()} ${response.url()}`);
  });
  // External navigation is tested separately with interception, never a live GET.
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('/download/');
  await expect(page).toHaveTitle('Download Foom | foom');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Download Foom',
  );
  await expect(page.getByRole('main')).toContainText(
    'nightly development builds',
  );
  for (const platform of ['macOS', 'Windows', 'Linux']) {
    await expect(
      page.getByRole('heading', { name: platform, exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole('link', { name: `Find the ${platform} nightly` }),
    ).toHaveAttribute('href', release);
  }
  await expect(
    page.getByRole('region', { name: 'macOS', exact: true }),
  ).toContainText('Apple silicon · arm64');
  await expect(
    page.getByRole('region', { name: 'macOS', exact: true }),
  ).toContainText('Developer ID signed and notarized ZIP');
  await expect(
    page.getByRole('region', { name: 'Windows', exact: true }),
  ).toContainText('Unsigned ZIP');
  await expect(
    page.getByRole('region', { name: 'Windows', exact: true }),
  ).toContainText('More info → Run anyway');
  await expect(
    page.getByRole('region', { name: 'Linux', exact: true }),
  ).toContainText('./Foom');
  await expect(
    page.getByRole('link', { name: 'SHA256SUMS', exact: true }),
  ).toHaveAttribute('href', sums);
  await expect(
    page.getByRole('link', { name: 'Ubuntu 24.04 AppArmor sandbox setup' }),
  ).toHaveAttribute('href', sandbox);
  await expect(page.locator('pre')).toContainText(
    'libgtk-3-0t64 libnss3 libasound2t64 libgbm1 libxss1 libxtst6 libatk-bridge2.0-0t64',
  );
  await expect(page.getByRole('main')).not.toContainText('xattr');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  for (const enlarged of [false, true]) {
    if (enlarged)
      await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  expect(failures).toEqual([]);
});

test('download links work with keyboard and JavaScript disabled', async ({
  browser,
  baseURL,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
    baseURL,
  });
  try {
    const page = await context.newPage();
    await context.route(release, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Release destination fixture</title>',
      }),
    );
    await page.goto('/download/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    for (const name of [
      'Find the macOS nightly',
      'Find the Windows nightly',
      'Find the Linux nightly',
      'SHA256SUMS',
      'Ubuntu 24.04 AppArmor sandbox setup',
    ]) {
      await page.keyboard.press('Tab');
      const link = page.getByRole('link', { name, exact: true });
      await expect(link).toBeFocused();
      await expect(link).toBeInViewport();
      await expect(link).toHaveCSS('outline-style', 'solid');
    }
    for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(release);
    await expect(page).toHaveTitle('Release destination fixture');
  } finally {
    await context.close();
  }
});
