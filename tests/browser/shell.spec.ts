import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const colorScheme of ['dark', 'light'] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme });
    for (const route of ['/', '/404.html']) {
      test(`${route} accessible responsive shell`, async ({
        page,
      }, testInfo) => {
        const failures: string[] = [];
        page.on('pageerror', (error) => failures.push(error.message));
        page.on('requestfailed', (request) => failures.push(request.url()));
        page.on('response', (response) => {
          const expected404 =
            response.request().isNavigationRequest() &&
            new URL(response.url()).pathname === '/404.html' &&
            response.status() === 404;
          if (!response.ok() && !expected404)
            failures.push(`${response.status()} ${response.url()}`);
        });
        await page.addInitScript(() => {
          const shifts: number[] = [];
          Object.assign(window, { eclipseLayoutShifts: shifts });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const shift = entry as PerformanceEntry & {
                hadRecentInput: boolean;
                value: number;
              };
              if (!shift.hadRecentInput) shifts.push(shift.value);
            }
          }).observe({ type: 'layout-shift', buffered: true });
        });
        await page.goto(route);
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(() =>
            document.fonts.check('16px "Archivo Black"'),
          ),
        ).toBe(true);
        expect(
          await page.evaluate(() => document.fonts.check('16px Geist')),
        ).toBe(true);
        await expect(page.locator('body')).toHaveCSS(
          'background-color',
          colorScheme === 'dark' ? 'rgb(5, 4, 10)' : 'rgb(243, 240, 250)',
        );
        // Observe paint after fonts settle, without a fixed timer.
        await page.evaluate(
          () =>
            new Promise<void>((done) =>
              requestAnimationFrame(() => requestAnimationFrame(() => done())),
            ),
        );
        const shift = await page.evaluate(
          () =>
            (
              window as Window & { eclipseLayoutShifts?: number[] }
            ).eclipseLayoutShifts?.reduce((sum, value) => sum + value, 0) ?? 0,
        );
        expect(shift).toBeLessThan(0.02);
        if (testInfo.project.name === 'wide') {
          await testInfo.attach(
            `shell-${colorScheme}-${route === '/' ? 'home' : '404'}`,
            {
              body: await page.screenshot({
                fullPage: true,
                path: `test-results/screenshots/shell-${colorScheme}-${route === '/' ? 'home' : '404'}.png`,
              }),
              contentType: 'image/png',
            },
          );
        }
        for (const landmark of ['banner', 'main', 'contentinfo'] as const) {
          await expect(page.getByRole(landmark)).toHaveCount(1);
        }
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(results.violations).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        // Enlarged text must also fit the narrow shell.
        await page.addStyleTag({ content: 'html { font-size: 200%; }' });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        expect(failures).toEqual([]);
      });

      test(`${route} native keyboard navigation works without JavaScript`, async ({
        browser,
        baseURL,
      }, testInfo) => {
        const context = await browser.newContext({
          javaScriptEnabled: false,
          colorScheme,
          viewport: testInfo.project.use.viewport,
          baseURL,
        });
        try {
          const page = await context.newPage();
          await page.goto(route);
          await page.keyboard.press('Tab');
          const skip = page.getByRole('link', { name: 'Skip to content' });
          await expect(skip).toBeFocused();
          await expect(skip).toBeInViewport();
          await expect(skip).toHaveCSS('outline-style', 'solid');
          expect(
            await skip.evaluate((element) =>
              parseFloat(getComputedStyle(element).outlineWidth),
            ),
          ).toBeGreaterThan(0);
          await page.keyboard.press('Enter');
          await expect(page.getByRole('main')).toBeFocused();
          if (route === '/404.html') {
            await page.keyboard.press('Tab');
            await expect(
              page.getByRole('link', { name: 'return to the home page' }),
            ).toBeFocused();
            await page.keyboard.press('Enter');
            await expect(page).toHaveURL(`${baseURL}/`);
            await expect(page.getByRole('heading', { level: 1 })).toHaveText(
              'foom',
            );
          }
        } finally {
          await context.close();
        }
      });
    }
  });
}

for (const colorScheme of ['dark', 'light'] as const) {
  test(`${colorScheme} reduced motion disables transitions`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.wordmark')).toHaveCSS(
      'transition-duration',
      '0s',
    );
  });
}
