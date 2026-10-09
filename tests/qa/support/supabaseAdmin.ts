/**
 * Minimal Supabase Auth Admin API client (service role) for QA setup and cleanup.
 */
export function createSupabaseAdmin({ url = process.env.SUPABASE_URL, serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY } = {}) {
  const baseUrl = url.replace(/\/+$/, '');

  async function request(method, path, body) {
    const res = await fetch(`${baseUrl}/auth/v1/admin${path}`, {
      method,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Supabase admin ${method} ${path} failed: ${res.status} ${await res.text()}`);
    }
    return res.status === 404 ? null : res.json().catch(() => ({}));
  }

  return {
    confirmEmail: (userId) => request('PUT', `/users/${userId}`, { email_confirm: true }),
    deleteUser: (userId) => request('DELETE', `/users/${userId}`),
  };
}
