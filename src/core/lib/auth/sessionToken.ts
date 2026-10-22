export const ACCESS_TOKEN_STORAGE_KEY = 'takeoff_access_token';
export const CSRF_TOKEN_STORAGE_KEY = 'takeoff_csrf';

export const getAccessToken = (): string | null => sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

export const setAccessToken = (token: string | null | undefined): void => {
  if (token) sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
};

export const clearAccessToken = (): void => {
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
};

/**
 * The CSRF header token the server pairs with its HttpOnly `takeoff_csrf` cookie. It is only ever
 * (re)issued by `/auth/csrf-token`, login, exchange-session and logout responses, so every writer
 * must keep this copy in lockstep with the cookie — a stale copy is rejected as
 * `CSRF_TOKEN_INVALID` on the next state-changing request.
 */
export const getCsrfToken = (): string | null => sessionStorage.getItem(CSRF_TOKEN_STORAGE_KEY);

export const storeCsrfToken = (token: string | null | undefined): void => {
  if (token) sessionStorage.setItem(CSRF_TOKEN_STORAGE_KEY, token);
};

export const clearCsrfToken = (): void => {
  sessionStorage.removeItem(CSRF_TOKEN_STORAGE_KEY);
};

export const addAuthorizationHeader = (
  headers?: HeadersInit,
  token: string | null = getAccessToken(),
): Headers => {
  const authorizedHeaders = new Headers(headers);
  if (token) authorizedHeaders.set('Authorization', `Bearer ${token}`);
  return authorizedHeaders;
};