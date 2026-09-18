import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import '@/index.css'
import App from '@/App.jsx'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const nativeFetch = window.fetch.bind(window);

window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (!url.startsWith(API_BASE_URL)) return nativeFetch(input, init);

  const headers = new Headers(init.headers);
  const csrfToken = sessionStorage.getItem('takeoff_csrf');
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((init.method || 'GET').toUpperCase())) {
    headers.set('X-CSRF-Token', csrfToken);
  }
  return nativeFetch(input, { ...init, headers, credentials: 'include' });
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
