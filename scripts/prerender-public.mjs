// Prerenders the public/SEO routes into static HTML files under dist/.
//
// Why: the app is a client-side SPA, so `vite build` ships an empty `#root` and the
// route-specific <head> tags (title, description, canonical, OpenGraph, hreflang) only exist
// after JavaScript runs. Google renders JS, but social scrapers (Facebook, LinkedIn, X, Slack,
// iMessage) largely do not — so shared links lose their previews. This script renders each
// public route in headless Chromium, captures the real <head> produced by `SeoHead`, and writes
// it into a per-route HTML file that GitHub Pages serves directly.
//
// The captured `#root` is intentionally emptied: the built SPA still mounts client-side via
// `createRoot`, so there is no hydration coupling with the app's async providers (auth, pricing,
// i18n) and no risk of hydration mismatches. Pages behind auth (`/:username/*`, `/settings`,
// `/admin`) and dynamic routes (`/p/:token`) are excluded.
//
// Run with `npm run prerender` (after `vite build`). Requires the Playwright Chromium browser.
import { preview } from 'vite';
import { chromium } from 'playwright';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const PREVIEW_PORT = 4187;

/** Public routes only: auth-gated (`/:username/*`, `/settings`, `/admin`) and dynamic
 *  (`/p/:token`) paths are deliberately excluded. */
const ROUTES = [
  { path: '/home', out: 'home/index.html' },
  { path: '/guide', out: 'guide/index.html' },
  { path: '/accessibility', out: 'accessibility/index.html' },
  { path: '/privacy', out: 'privacy/index.html' },
  { path: '/privacy-policy', out: 'privacy-policy/index.html' },
  { path: '/refund', out: 'refund/index.html' },
  { path: '/refund-policy', out: 'refund-policy/index.html' },
  { path: '/terms', out: 'terms/index.html' },
  { path: '/terms-of-service', out: 'terms-of-service/index.html' },
  { path: '/policy', out: 'policy/index.html' },
  { path: '/acceptable-use', out: 'acceptable-use/index.html' },
  { path: '/disclaimer', out: 'disclaimer/index.html' },
  { path: '/legal-disclaimer', out: 'legal-disclaimer/index.html' },
  { path: '/login', out: 'login/index.html' },
  { path: '/register', out: 'register/index.html' },
  { path: '/forgot-password', out: 'forgot-password/index.html' },
  // `/` is prerendered LAST: it overwrites `dist/index.html`, which is the SPA fallback every
  // other route is served from while prerendering. Overwriting it first would poison the rest.
  { path: '/', out: 'index.html' },
];

async function ensureBuilt() {
  try {
    await access(path.join(distDir, 'index.html'));
  } catch {
    throw new Error('dist/index.html not found — run `npm run build` (or `vite build`) first.');
  }
}

async function main() {
  await ensureBuilt();

  // Drop any previously prerendered route files so a re-run can't serve its own stale HTML as the
  // SPA fallback (which would bake the wrong <head> into every route).
  for (const route of ROUTES) {
    if (route.out === 'index.html') continue;
    await rm(path.dirname(path.join(distDir, route.out)), { recursive: true, force: true });
  }

  const server = await preview({
    root: projectRoot,
    preview: { port: PREVIEW_PORT, strictPort: true },
  });
  const base = server.resolvedUrls?.local?.[0] ?? `http://localhost:${PREVIEW_PORT}/`;
  const origin = new URL(base).origin;

  const browser = await chromium.launch();
  let count = 0;
  try {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      try {
        await page.goto(new URL(route.path, base).href, { waitUntil: 'domcontentloaded' });
        // `SeoHead` injects the canonical link once the route has rendered. <link> elements are
        // never "visible", so wait for attachment rather than visibility.
        await page.waitForSelector('link[rel="canonical"]', { state: 'attached', timeout: 20_000 });
        await page.evaluate(() => {
          // Keep the captured HTML theme-neutral so the inline boot script decides on the client.
          document.documentElement.classList.remove('dark');
          const root = document.getElementById('root');
          if (root) root.innerHTML = '';
        });

        // Vite injects dynamic-import modulepreloads with an absolute preview origin; rewrite them
        // to root-relative so the deployed files don't reference localhost.
        const html = (await page.content()).split(origin).join('');
        const outPath = path.join(distDir, route.out);
        await mkdir(path.dirname(outPath), { recursive: true });
        await writeFile(outPath, html, 'utf8');
        count += 1;
        console.log(`  prerendered ${route.path.padEnd(16)} -> dist/${route.out}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(`Prerendered ${count} public route(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
