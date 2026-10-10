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
  // One retry absorbs machine-level flake (e.g. Windows file scanners racing Playwright's artifact
  // writer) without hiding a real regression: a test that genuinely fails still fails both attempts.
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    // Trace retried attempts only. 'retain-on-failure' records a trace for every test and then
    // deletes the passing ones, which writes thousands of chunk files into test-results/; on
    // Windows that writer races with file scanners/cleanup and surfaced as
    // "browserContext.close: ENOENT ... recordingN.trace" on the two longest pages (/terms,
    // /privacy), whose traces are the largest. Retried attempts still keep a trace, so any test
    // that actually fails stays debuggable (npx playwright show-trace <trace.zip>).
    trace: 'on-first-retry',
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
