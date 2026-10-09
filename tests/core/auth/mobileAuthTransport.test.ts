import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  addAuthorizationHeader,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '#core/lib/auth/sessionToken.ts';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDirectory, '../../..');

function installSessionStorage(t: TestContext): Map<string, string> {
  const values = new Map<string, string>();
  const original = globalThis.sessionStorage;
  globalThis.sessionStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
  } as unknown as Storage;
  t.after(() => { globalThis.sessionStorage = original; });
  return values;
}

test('mobile auth fallback stores the access token only in tab-scoped session storage', (t) => {
  const values = installSessionStorage(t);

  setAccessToken('mobile-session-token');

  assert.equal(getAccessToken(), 'mobile-session-token');
  assert.equal(values.get(ACCESS_TOKEN_STORAGE_KEY), 'mobile-session-token');
});

test('protected API requests receive a bearer header when cross-site cookies are blocked', (t) => {
  installSessionStorage(t);
  setAccessToken('mobile-session-token');

  const headers = addAuthorizationHeader({ 'Content-Type': 'application/json' });

  assert.equal(headers.get('Authorization'), 'Bearer mobile-session-token');
  assert.equal(headers.get('Content-Type'), 'application/json');
});

test('cookie-capable and anonymous requests remain valid when no fallback token exists', (t) => {
  installSessionStorage(t);

  const headers = addAuthorizationHeader({ Accept: 'application/json' });

  assert.equal(headers.has('Authorization'), false);
  assert.equal(headers.get('Accept'), 'application/json');
});

test('logout removes the bearer fallback so later requests cannot reuse it', (t) => {
  installSessionStorage(t);
  setAccessToken('mobile-session-token');

  clearAccessToken();

  assert.equal(getAccessToken(), null);
  assert.equal(addAuthorizationHeader().has('Authorization'), false);
});

test('frontend login, redirect exchange, logout, and deletion preserve the token lifecycle contract', async () => {
  const authApiSource = await readFile(path.join(frontendRoot, 'src/core/lib/auth/auth.ts'), 'utf8');
  const mainSource = await readFile(path.join(frontendRoot, 'src/main.tsx'), 'utf8');

  assert.match(authApiSource, /setAccessToken\(data\.accessToken\);/);
  assert.match(authApiSource, /setAccessToken\(data\.accessToken \|\| accessToken\);/);
  assert.equal((authApiSource.match(/clearAccessToken\(\);/g) || []).length, 2);
  assert.match(mainSource, /const headers = addAuthorizationHeader\(init\.headers\);/);
  assert.match(mainSource, /credentials: 'include'/);
});