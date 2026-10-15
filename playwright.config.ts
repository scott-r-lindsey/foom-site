import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4327',
    headless: true,
    browserName: 'chromium',
    ...(process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : {}),
  },
  projects: [
    { name: 'narrow', use: { viewport: { width: 320, height: 740 } } },
    { name: 'wide', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    // Keep preview in the foreground even when Astro detects an agent shell.
    command: 'pnpm serve --host 127.0.0.1 --port 4327 --ignore-lock',
    url: 'http://127.0.0.1:4327',
    reuseExistingServer: false,
  },
});
