import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACCESS_TOKEN_STORAGE_KEY } from '@/core/lib/auth/sessionToken';
import { organizationsApi } from '@/core/lib/auth/organizations';

describe('organizationsApi HTTP harness', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('sends the stored bearer token and a minimal normalized invite payload', async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'test-access-token');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ member: { id: 'member-id' } }) });
    vi.stubGlobal('fetch', fetchMock);
    await organizationsApi.inviteMember('org-id', { email: 'invitee@example.test', role: 'viewer' });
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toMatch(/organizations\/org-id\/members$/);
    expect(request.method).toBe('POST');
    expect(request.body).toBe(JSON.stringify({ email: 'invitee@example.test', role: 'viewer' }));
    expect(request.headers.get('Authorization')).toBe('Bearer test-access-token');
  });
});