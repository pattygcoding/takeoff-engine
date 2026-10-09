/// <reference types="vite/client" />

// Vite injects these at build time from Infisical (`VITE_*` values are public and
// embedded in the browser bundle — never put secrets here).
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PADDLE_CLIENT_TOKEN?: string;
  readonly VITE_PADDLE_ENVIRONMENT?: 'sandbox' | 'production' | string;
  readonly VITE_INFISICAL_ENVIRONMENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
