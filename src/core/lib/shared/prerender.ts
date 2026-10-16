/**
 * Support for build-time prerendered pages (see `scripts/prerender-public.mjs`).
 *
 * Public routes are rendered in headless Chromium at build time and shipped as static HTML, so
 * crawlers (and the first paint) get real content instead of an empty `#root`. React then takes the
 * container over on the client; the auth "loading" gate and the billing catalog are reproduced from
 * the build so that hand-over renders identically (no splash, no visible change).
 *
 * - The prerender script sets `data-prerendered` on `<html>` and inlines the catalog it fetched.
 * - `AuthProvider` starts with `loading: false` on such documents (see AuthContext).
 * - `PricingProvider` seeds from the inlined catalog and skips its mount fetch (see PricingContext).
 */

export interface PrerenderPricingCatalog {
  currencyCode: string;
  prices: Record<string, number>;
  expiresAt: string;
}

interface PrerenderWindow {
  __PRERENDER_PRICING__?: PrerenderPricingCatalog;
}

declare global {
  interface Window extends PrerenderWindow {}
}

/** True when the current document was produced by the prerender script. */
export function isPrerenderedDocument(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.prerendered !== undefined;
}

/** The billing catalog captured at build time, or null when the page was not content-prerendered. */
export function readPrerenderPricing(): PrerenderPricingCatalog | null {
  if (typeof window === 'undefined') return null;
  return window.__PRERENDER_PRICING__ ?? null;
}
