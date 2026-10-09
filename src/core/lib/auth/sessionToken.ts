export const ACCESS_TOKEN_STORAGE_KEY = 'takeoff_access_token';

export const getAccessToken = (): string | null => sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

export const setAccessToken = (token: string | null | undefined): void => {
  if (token) sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
};

export const clearAccessToken = (): void => {
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const addAuthorizationHeader = (
  headers?: HeadersInit,
  token: string | null = getAccessToken(),
): Headers => {
  const authorizedHeaders = new Headers(headers);
  if (token) authorizedHeaders.set('Authorization', `Bearer ${token}`);
  return authorizedHeaders;
};