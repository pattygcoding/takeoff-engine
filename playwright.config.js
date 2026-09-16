import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/accessibility',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-light', use: { viewport: { width: 1440, height: 900 }, colorScheme: 'light' } },
    { name: 'desktop-dark', use: { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' } },
    { name: 'mobile-light', use: { viewport: { width: 320, height: 800 }, colorScheme: 'light', isMobile: true, hasTouch: true } },
    { name: 'mobile-dark', use: { viewport: { width: 320, height: 800 }, colorScheme: 'dark', isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run dev:local -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
  },
});