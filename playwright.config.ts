import { defineConfig } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4175';

// The app reads its theme from localStorage (not prefers-color-scheme), so seed it per project.
const withAppTheme = (theme: string) => ({
  colorScheme: theme as 'light' | 'dark',
  storageState: {
    cookies: [],
    origins: [{ origin: BASE_URL, localStorage: [{ name: 'takeoff_engine_theme', value: theme }] }],
  },
});

export default defineConfig({
  testDir: './tests/accessibility',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Disables colour transitions so axe never samples a mid-animation colour after a theme switch.
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop-light', use: { viewport: { width: 1440, height: 900 }, ...withAppTheme('light') } },
    { name: 'desktop-dark', use: { viewport: { width: 1440, height: 900 }, ...withAppTheme('dark') } },
    { name: 'mobile-light', use: { viewport: { width: 320, height: 800 }, ...withAppTheme('light'), isMobile: true, hasTouch: true } },
    { name: 'mobile-dark', use: { viewport: { width: 320, height: 800 }, ...withAppTheme('dark'), isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run dev:local -- --host 127.0.0.1 --port 4175 --strictPort',
    url: BASE_URL,
    reuseExistingServer: false,
    env: { PLAYWRIGHT_TEST_SERVER: '1' },
  },
});
