export const ACCESS_TOKEN_STORAGE_KEY = 'takeoff_access_token';

export const getAccessToken = () => sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

export const setAccessToken = (token) => {
  if (token) sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
};

export const clearAccessToken = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const addAuthorizationHeader = (headers, token = getAccessToken()) => {
  const authorizedHeaders = new Headers(headers);
  if (token) authorizedHeaders.set('Authorization', `Bearer ${token}`);
  return authorizedHeaders;
};