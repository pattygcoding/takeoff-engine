import { getTranslation } from '@/core/lib/shared/i18n';
import { clearAccessToken, clearCsrfToken, setAccessToken, storeCsrfToken } from '@/core/lib/auth/sessionToken';
import { ApiError } from '@/types/api';
import type { RegisterPayload } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

export const authApi = {
  async getCsrfToken() {
    const res = await fetch(`${API_BASE_URL}/auth/csrf-token`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to initialize the secure session.');
    storeCsrfToken(data.csrfToken);
    return data.csrfToken as string;
  },

  async register({
    username,
    password,
    firstName,
    lastName,
    email,
    phoneNumber,
    acceptedTerms,
    confirmedAge,
    termsVersion,
    _gotcha,
    website_url,
  }: RegisterPayload) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        firstName,
        lastName,
        email,
        phoneNumber,
        acceptedTerms,
        confirmedAge,
        termsVersion,
        _gotcha,
        website_url,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(data.error || getTranslation('core.apiErrors.registrationFailed'), {
        code: data.code,
      });
    }
    return data;
  },

  async login({ usernameOrEmail, password }: { usernameOrEmail: string; password: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.loginFailed'));
    }
    setAccessToken(data.accessToken);
    // Login rotates the CSRF pair server-side; keep the header token in lockstep with the new cookie.
    storeCsrfToken(data.csrfToken);
    return data;
  },

  async exchangeSession(accessToken: string) {
    const res = await fetch(`${API_BASE_URL}/auth/exchange-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to establish a secure session.');
    setAccessToken(data.accessToken || accessToken);
    // Exchange rotates the CSRF pair server-side; keep the header token in lockstep.
    storeCsrfToken(data.csrfToken);
    return data;
  },

  async logout() {
    let rotatedCsrfToken: string | null = null;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      // The server rotates the CSRF pair on logout; keep the tab's copy in lockstep so the next
      // state-changing request is not rejected. Falls back to clearing if the response is unusable.
      const data = await res.json().catch(() => ({}));
      rotatedCsrfToken = data?.csrfToken ?? null;
    } catch {
      // Ignore network errors on logout; the next request self-heals via the CSRF retry.
    }
    if (rotatedCsrfToken) storeCsrfToken(rotatedCsrfToken);
    else clearCsrfToken();
    localStorage.removeItem('takeoff_user');
    clearAccessToken();
  },

  async getMe() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      localStorage.removeItem('takeoff_user');
      return null;
    }
    const data = await res.json();
    return data.user;
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.requestPasswordResetFailed'));
    }
    return data;
  },

  async updatePassword({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/update-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.passwordUpdateFailed'));
    }
    return data;
  },

  async updateProfile(profileData: Record<string, unknown>) {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.profileUpdateFailed'));
    }
    return data;
  },

  async uploadLogo(imageBase64: string, fileName: string) {
    const res = await fetch(`${API_BASE_URL}/users/logo`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ imageBase64, fileName }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.uploadLogoFailed'));
    }
    return data;
  },

  async deleteAccount(confirmUsername: string) {
    const res = await fetch(`${API_BASE_URL}/auth/account`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ confirmUsername }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.accountDeletionFailed'));
    }
    localStorage.removeItem('takeoff_user');
    clearCsrfToken();
    clearAccessToken();
    return data;
  },

  async recordExport(formatId: string | null = null) {
    const res = await fetch(`${API_BASE_URL}/takeoffs/record-export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formatId ? JSON.stringify({ formatId }) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(data.error || getTranslation('core.apiErrors.exportRecordingFailed'), {
        code: data.code,
        trial_uses_remaining: data.trial_uses_remaining,
        requiredTier: data.requiredTier,
      });
    }
    return data;
  },
};
