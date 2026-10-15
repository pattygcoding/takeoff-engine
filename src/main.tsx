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

window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith(API_BASE_URL)) return nativeFetch(input, init);

  const headers = addAuthorizationHeader(init.headers);
  const csrfToken = sessionStorage.getItem('takeoff_csrf');
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((init.method || 'GET').toUpperCase())) {
    headers.set('X-CSRF-Token', csrfToken);
  }
  return nativeFetch(input, { ...init, headers, credentials: 'include' });
};

// react-helmet-async appends a duplicate of every SEO tag on re-render; keep the head clean.
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
