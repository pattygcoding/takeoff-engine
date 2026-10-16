// Prerenders the public/SEO routes into static HTML files under dist/.
//
// Why: the app is a client-side SPA, so `vite build` ships an empty `#root` and the
// route-specific <head> tags (title, description, canonical, OpenGraph, hreflang) only exist
// after JavaScript runs. Google renders JS, but social scrapers (Facebook, LinkedIn, X, Slack,
// iMessage) largely do not — so shared links lose their previews. This script renders each
// public route in headless Chromium, captures the real <head> produced by `SeoHead`, and writes
// it into a per-route HTML file that GitHub Pages serves directly.
//
// Two flavours:
//   - `content: true` routes ship the rendered markup and are marked `data-prerendered`; React then
//     takes the container over with the same markup (see src/core/lib/shared/prerender.ts).
//   - other routes ship the `<head>` only (empty `#root`), because their body is populated by
//     runtime fetches (the guide's markdown, the auth forms) that cannot be reproduced at build.
//
// Rendering is hermetic: every API call is stubbed (see stubApi) so it never waits on the live
// backend, which may be asleep — that is what previously aborted `npm run deploy`. The captured
// markup is therefore deterministic. The billing catalog is fetched from PRERENDER_API_URL /
// VITE_API_URL (or PRERENDER_PRICING_FILE); without it, content routes ship their loading price
// state and the client fills prices in after takeover.
//
// Pages behind auth (`/:username/*`, `/settings`, `/admin`) and dynamic routes (`/p/:token`) are
// excluded. Run with `npm run prerender` (after `vite build`); requires Playwright Chromium.
import { preview } from 'vite';
import { chromium } from 'playwright';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const PREVIEW_PORT = 4187;

/** Price fields the app requires in a billing catalog (mirrors catalogPricing.ts). */
const PRICE_FIELDS = [
  'STARTER_MONTHLY_PRICE', 'PRO_MONTHLY_PRICE', 'ENTERPRISE_MONTHLY_PRICE',
  'STARTER_YEARLY_PRICE', 'PRO_YEARLY_PRICE', 'ENTERPRISE_YEARLY_PRICE',
  'EXTRA_SEAT_MONTHLY_PRICE', 'EXTRA_SEAT_YEARLY_PRICE',
];

/** Public routes only: auth-gated (`/:username/*`, `/settings`, `/admin`) and dynamic
 *  (`/p/:token`) paths are deliberately excluded. */
const ROUTES = [
  { path: '/home', out: 'home/index.html', content: true },
  { path: '/accessibility', out: 'accessibility/index.html', content: true },
  { path: '/privacy', out: 'privacy/index.html', content: true },
  { path: '/privacy-policy', out: 'privacy-policy/index.html', content: true },
  { path: '/refund', out: 'refund/index.html', content: true },
  { path: '/refund-policy', out: 'refund-policy/index.html', content: true },
  { path: '/terms', out: 'terms/index.html', content: true },
  { path: '/terms-of-service', out: 'terms-of-service/index.html', content: true },
  { path: '/policy', out: 'policy/index.html', content: true },
  { path: '/acceptable-use', out: 'acceptable-use/index.html', content: true },
  { path: '/disclaimer', out: 'disclaimer/index.html', content: true },
  { path: '/legal-disclaimer', out: 'legal-disclaimer/index.html', content: true },
  { path: '/guide', out: 'guide/index.html' },
  { path: '/login', out: 'login/index.html' },
  { path: '/register', out: 'register/index.html' },
  { path: '/forgot-password', out: 'forgot-password/index.html' },
  // `/` is prerendered LAST: it overwrites `dist/index.html`, which is the SPA fallback every
  // other route is served from while prerendering. Overwriting it first would poison the rest.
  { path: '/', out: 'index.html', content: true },
];

async function ensureBuilt() {
  try {
    await access(path.join(distDir, 'index.html'));
  } catch {
    throw new Error('dist/index.html not found — run `npm run build` (or `vite build`) first.');
  }
}

function isValidCatalog(data) {
  const prices = data?.prices;
  const pricesValid =
    Boolean(prices) &&
    PRICE_FIELDS.every((key) => typeof prices[key] === 'number' && Number.isFinite(prices[key]) && prices[key] >= 0);
  return Boolean(
    data &&
      typeof data.currencyCode === 'string' &&
      /^[A-Z]{3}$/.test(data.currencyCode) &&
      pricesValid &&
      typeof data.expiresAt === 'string' &&
      Number.isFinite(Date.parse(data.expiresAt)) &&
      Date.parse(data.expiresAt) > Date.now()
  );
}

/** The billing catalog to inline: an explicit file (offline builds) first, then the live API. */
async function loadPricingCatalog() {
  const file = process.env.PRERENDER_PRICING_FILE;
  if (file) {
    try {
      const data = JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
      if (isValidCatalog(data)) return data;
      console.warn(`  ${file} is not a valid, unexpired catalog.`);
    } catch (error) {
      console.warn(`  could not read PRERENDER_PRICING_FILE (${error.message}).`);
    }
  }

  const apiBase = (process.env.PRERENDER_API_URL || process.env.VITE_API_URL || 'http://localhost:5000/api').replace(/(?<!\/)\/+$/, '');
  try {
    const response = await fetch(`${apiBase}/billing/pricing`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!isValidCatalog(data)) throw new Error('invalid or expired catalog');
    return data;
  } catch (error) {
    console.warn(`  pricing catalog unavailable at build time (${error.message}).`);
    return null;
  }
}

/**
 * Stubs every API call the app makes while prerendering.
 *
 * Rendering must never depend on the live backend. The free-tier host sleeps, so a real
 * `/auth/me` can hang for a minute — the auth gate then never clears, no route renders, and the
 * whole deploy dies waiting for the canonical link (which is exactly what happened). Stubbing also
 * makes the captured markup deterministic instead of a race against the network.
 */
async function stubApi(page, catalog) {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const json = (status, body) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (pathname.endsWith('/auth/csrf')) return json(200, { csrfToken: 'prerender' });
    if (pathname.endsWith('/auth/me')) return json(401, { error: 'Not authenticated' });
    if (pathname.endsWith('/billing/pricing')) {
      // Serve the catalog fetched at build time when we have one. Otherwise leave the request
      // pending so the page renders its loading price state — which is also exactly what the
      // client renders first, so the takeover stays identical.
      return catalog ? json(200, catalog) : undefined;
    }
    return json(404, { error: 'Not found' });
  });
}

/**
 * Captures the DOM in the shape the deployed file should ship: theme-neutral, marked
 * `data-prerendered` for content routes, with the build-time catalog inlined so the first client
 * render matches this markup exactly (see src/core/lib/shared/prerender.ts).
 *
 * Runs inside the browser via `page.evaluate`, so it must not reference anything from this module.
 */
function prepareCapturedDom({ withContent, catalog }) {
  document.documentElement.classList.remove('dark');
  const container = document.getElementById('root');

  if (!withContent) {
    if (container) container.innerHTML = '';
    return;
  }

  document.documentElement.dataset.prerendered = '';
  if (!catalog) return;

  const script = document.createElement('script');
  script.textContent = `window.__PRERENDER_PRICING__ = ${JSON.stringify(catalog).replaceAll('<', '\\u003c')};`;
  document.head.prepend(script);
}

/** The auth gate renders a splash until it settles, so wait for the route's own content. */
async function waitForContentRoute(page) {
  await page.waitForFunction(
    () => (document.getElementById('root')?.childElementCount ?? 0) > 0,
    { timeout: 20_000 }
  );
  await page.waitForSelector('#root h1', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * Renders one route in a fresh page and writes its HTML.
 *
 * Returns a failure description rather than throwing, so every broken route is reported at once.
 * A half-rendered file is never written — a page with no title/canonical is worse than none.
 */
async function prerenderRoute(browser, route, { base, origin, pricingCatalog }) {
  const withContent = Boolean(route.content);
  const page = await browser.newPage();
  try {
    // Never let rendering depend on the live API (see stubApi).
    await stubApi(page, withContent ? pricingCatalog : null);
    if (withContent && pricingCatalog) {
      // Runs before the app's modules, so PricingProvider seeds from exactly what it rendered.
      await page.addInitScript((catalog) => {
        window.__PRERENDER_PRICING__ = catalog;
      }, pricingCatalog);
    }

    await page.goto(new URL(route.path, base).href, { waitUntil: 'domcontentloaded' });
    // `SeoHead` injects the canonical link once the route has rendered. <link> elements are
    // never "visible", so wait for attachment rather than visibility.
    await page.waitForSelector('link[rel="canonical"]', { state: 'attached', timeout: 20_000 });
    if (withContent) await waitForContentRoute(page);

    await page.evaluate(prepareCapturedDom, { withContent, catalog: withContent ? pricingCatalog : null });

    // Vite injects dynamic-import modulepreloads with an absolute preview origin; rewrite them
    // to root-relative so the deployed files don't reference localhost.
    const html = (await page.content()).split(origin).join('');
    const outPath = path.join(distDir, route.out);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, html, 'utf8');
    console.log(`  prerendered ${route.path.padEnd(16)} -> dist/${route.out}${withContent ? ' (content)' : ''}`);
    return null;
  } catch (error) {
    console.error(`  FAILED ${route.path}`);
    return `${route.path} — ${error.message.split('\n')[0]}`;
  } finally {
    await page.close();
  }
}

async function main() {
  await ensureBuilt();

  const pricingCatalog = await loadPricingCatalog();
  console.log(
    pricingCatalog
      ? '  Billing catalog available — content routes ship live prices.'
      : '  No catalog at build time — content routes ship their loading price state.'
  );

  // Drop any previously prerendered route files so a re-run can't serve its own stale HTML as the
  // SPA fallback (which would bake the wrong <head> into every route).
  for (const route of ROUTES) {
    if (route.out === 'index.html') continue;
    await rm(path.dirname(path.join(distDir, route.out)), { recursive: true, force: true }); // NOSONAR: prerender steps run one route at a time
  }

  const server = await preview({
    root: projectRoot,
    preview: { port: PREVIEW_PORT, strictPort: true },
  });
  const base = server.resolvedUrls?.local?.[0] ?? `http://localhost:${PREVIEW_PORT}/`;
  const origin = new URL(base).origin;

  const browser = await chromium.launch();
  const failures = [];
  let count = 0;
  try {
    for (const route of ROUTES) {
      const failure = await prerenderRoute(browser, route, { base, origin, pricingCatalog }); // NOSONAR: prerender steps run one route at a time
      if (failure) failures.push(failure);
      else count += 1;
    }
  } finally {
    await browser.close();
    await server.close();
  }

  if (failures.length > 0) {
    throw new Error(`Prerendering failed for ${failures.length} route(s):\n  - ${failures.join('\n  - ')}`);
  }

  console.log(`Prerendered ${count} public route(s).`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
