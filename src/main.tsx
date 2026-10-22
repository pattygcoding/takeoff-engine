import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import '@/index.css'
import App from '@/App'
import { addAuthorizationHeader, getCsrfToken, storeCsrfToken } from '@/core/lib/auth/sessionToken';
import { installHeadMetadataDedupe } from '@/core/lib/shared/headMetadata'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Warm the API origin's DNS lookup and TLS handshake before the app's first request — the
// resource hints a framework like Next.js injects automatically. Skipped when the API is
// same-origin or the URL is malformed.
(() => {
  try {
    const origin = new URL(API_BASE_URL).origin;
    if (origin === window.location.origin) return;
    for (const rel of ['dns-prefetch', 'preconnect']) {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = origin;
      document.head.appendChild(link);
    }
  } catch {
    // API_BASE_URL is not an absolute URL (e.g. a relative dev proxy) — nothing to preconnect.
  }
})();

const nativeFetch = window.fetch.bind(window);

/** Methods that never mutate server state, so they are exempt from the CSRF requirement. */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const CSRF_ERROR_CODE = 'CSRF_TOKEN_INVALID';

/** The string URL of a fetch input, whether it is a string, a URL, or a Request. */
function urlOfFetchInput(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * Re-issue the CSRF cookie/token pair and store the fresh token for the next request. Single-flight
 * so a burst of parallel 403s only triggers one token fetch. Uses `nativeFetch` directly to avoid
 * recursing back through the wrapper below.
 */
let csrfRefreshInFlight: Promise<string | null> | null = null;
function refreshCsrfToken(): Promise<string | null> {
  if (!csrfRefreshInFlight) {
    csrfRefreshInFlight = nativeFetch(`${API_BASE_URL}/auth/csrf-token`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const token: string | null = data?.csrfToken ?? null;
        if (token) storeCsrfToken(token);
        return token;
      })
      .catch(() => null)
      .finally(() => { csrfRefreshInFlight = null; });
  }
  return csrfRefreshInFlight;
}

window.fetch = async (input, init = {}) => {
  const url = urlOfFetchInput(input);
  if (!url.startsWith(API_BASE_URL)) return nativeFetch(input, init);

  const method = (init.method || 'GET').toUpperCase();
  const isMutating = !SAFE_METHODS.includes(method);
  const headers = addAuthorizationHeader(init.headers);
  const csrfToken = getCsrfToken();
  if (csrfToken && isMutating) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await nativeFetch(input, { ...init, headers, credentials: 'include' });

  // The token/cookie pair is refreshed at bootstrap, login and logout; if it is ever stale (e.g. a
  // tab that logged in without a reload, or a blocked/failed bootstrap fetch) recover it and replay
  // the request exactly once instead of surfacing "Invalid or missing CSRF token".
  if (isMutating && response.status === 403) {
    const code = await response.clone().json().then((body) => body?.code).catch(() => null);
    if (code === CSRF_ERROR_CODE) {
      const freshToken = await refreshCsrfToken();
      if (freshToken) {
        const retryHeaders = addAuthorizationHeader(init.headers);
        retryHeaders.set('X-CSRF-Token', freshToken);
        return nativeFetch(input, { ...init, headers: retryHeaders, credentials: 'include' });
      }
    }
  }

  return response;
};

// Public routes ship their SEO tags in the HTML, while React 19 hoists the same tags rendered by
// `SeoHead` back into <head>. Prune the document's stale copies only — React removes its own tags, and
// detaching them here aborts React's next commit and freezes the UI (see headMetadata.ts).
installHeadMetadataDedupe();

const container = document.getElementById('root')!;

const tree = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);

// Prerendered public pages (scripts/prerender-public.mjs) ship real markup for crawlers and a fast
// first paint. React then takes the container over with the same markup — seeding the auth gate
// and the billing catalog (see AuthContext / PricingContext) keeps that first render identical, so
// there is no splash and no visible change.
createRoot(container).render(tree);
