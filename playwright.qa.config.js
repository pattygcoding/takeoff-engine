import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { assertSafeQaEnvironment, loadQaSettings, QA_TAG } from './tests/qa/support/qaEnvironment.js';

// Full-stack QA: real backend, real database, real Paddle sandbox checkout. Refuse to even start
// servers unless the environment is safe (Paddle sandbox only, nothing production-like).
assertSafeQaEnvironment();

const settings = loadQaSettings();
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './tests/qa',
  testMatch: '**/*.spec.js',
  outputDir: './test-results/qa',
  globalSetup: './tests/qa/globalSetup.js',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 3,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: settings.frontendUrl,
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      // QA-only Supabase gateway: QA signups skip confirmation emails (and their rate limit).
      name: 'supabase-gateway',
      command: 'node tests/qa/support/supabaseGateway.js',
      url: `${settings.supabaseGatewayUrl}/__qa/health`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { QA_SUPABASE_GATEWAY_PORT: String(settings.supabaseGatewayPort) },
    },
    {
      name: 'backend',
      command: 'node src/server.js',
      cwd: path.resolve(rootDir, '../takeoff-engine-backend'),
      url: `${settings.backendInternalUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'ignore',
      env: {
        PORT: String(settings.backendPort),
        NODE_ENV: 'development',
        CLIENT_URL: settings.frontendUrl,
        SUPABASE_URL: settings.supabaseGatewayUrl,
        ENABLE_KEEP_ALIVE: 'false',
        // Startup would otherwise re-promote the configured admin accounts, touching real rows.
        BOOTSTRAP_ADMIN_EMAILS: `${QA_TAG}-no-bootstrap@invalid.test`,
        // App emails (welcome, receipts) are simulated and logged instead of sent.
        RESEND_API_KEY: '',
      },
    },
    {
      name: 'frontend',
      command: `npm run dev:local -- --host localhost --port ${settings.frontendPort} --strictPort`,
      url: settings.frontendUrl,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        VITE_API_URL: settings.apiUrl,
        PLAYWRIGHT_TEST_SERVER: '1',
      },
    },
  ],
});
