import { defineConfig } from '@playwright/test';

/**
 * Sample-spreadsheet parsing suite.
 *
 * Runs the real backend parsing engine (`takeoff-engine-backend`'s `CsvParserService`, the exact
 * code reached by `POST /api/takeoffs/parse`) directly against the files shipped in
 * `public/product/samples`. No browser, web server, database, or auth is required, so it stays
 * fast and deterministic while still covering the real ingestion path.
 */
export default defineConfig({
  testDir: './tests/parsing',
  fullyParallel: true,
  reporter: 'list',
  use: {
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
});
