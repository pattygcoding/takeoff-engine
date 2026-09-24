import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('browser authentication never persists the session token in localStorage', async () => {
  const [context, api] = await Promise.all([
    readFile(new URL('../../../src/core/components/context/AuthContext.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/core/lib/auth/auth.js', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(context, /localStorage\.(getItem|setItem|removeItem)\('takeoff_token'/);
  assert.doesNotMatch(api, /localStorage\.(getItem|setItem|removeItem)\('takeoff_token'/);
});