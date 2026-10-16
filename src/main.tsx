import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import '@/index.css'
import App from '@/App'
import { addAuthorizationHeader } from '@/core/lib/auth/sessionToken'
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

/** The string URL of a fetch input, whether it is a string, a URL, or a Request. */
function urlOfFetchInput(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

window.fetch = (input, init = {}) => {
  const url = urlOfFetchInput(input);
  if (!url.startsWith(API_BASE_URL)) return nativeFetch(input, init);

  const headers = addAuthorizationHeader(init.headers);
  const csrfToken = sessionStorage.getItem('takeoff_csrf');
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((init.method || 'GET').toUpperCase())) {
    headers.set('X-CSRF-Token', csrfToken);
  }
  return nativeFetch(input, { ...init, headers, credentials: 'include' });
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
