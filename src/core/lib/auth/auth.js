import { getTranslation } from '@/core/lib/shared/i18n';

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
    sessionStorage.setItem('takeoff_csrf', data.csrfToken);
  },

  async register({ username, password, firstName, lastName, email, phoneNumber, acceptedTerms, termsVersion, _gotcha, website_url }) {
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
        termsVersion,
        _gotcha,
        website_url,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.registrationFailed'));
    }
    return data;
  },

  async login({ usernameOrEmail, password }) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.loginFailed'));
    }
    return data;
  },

  async exchangeSession(accessToken) {
    const res = await fetch(`${API_BASE_URL}/auth/exchange-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to establish a secure session.');
    return data;
  },

  async logout() {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('takeoff_user');
    sessionStorage.removeItem('takeoff_csrf');
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

  async forgotPassword(email) {
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

  async updatePassword({ oldPassword, newPassword }) {
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

  async updateProfile(profileData) {
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

  async uploadLogo(imageBase64, fileName) {
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

  async deleteAccount() {
    const res = await fetch(`${API_BASE_URL}/auth/account`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.accountDeletionFailed'));
    }
    localStorage.removeItem('takeoff_user');
    sessionStorage.removeItem('takeoff_csrf');
    return data;
  },

  async recordExport(formatId = null) {
    const res = await fetch(`${API_BASE_URL}/takeoffs/record-export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formatId ? JSON.stringify({ formatId }) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || getTranslation('core.apiErrors.exportRecordingFailed'));
      err.code = data.code;
      err.trial_uses_remaining = data.trial_uses_remaining;
      err.requiredTier = data.requiredTier;
      throw err;
    }
    return data;
  },
};
