import { defineConfig } from '@playwright/test';

// Explicit opt-in: ordinary local/CI checks never contact a deployed site.
if (process.env.HOSTED_ORIGIN !== 'https://dev.foom-term.com') {
  throw new Error(
    'Set HOSTED_ORIGIN=https://dev.foom-term.com for authorized dev checks.',
  );
}

export default defineConfig({
  testDir: './tests',
  testMatch: ['browser/*.spec.ts', 'hosted/*.spec.ts'],
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.HOSTED_ORIGIN,
    headless: true,
    browserName: 'chromium',
  },
  projects: [
    { name: 'narrow', use: { viewport: { width: 320, height: 740 } } },
    { name: 'wide', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
