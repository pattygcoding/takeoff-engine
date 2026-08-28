import { getTranslation } from '@/lib/shared/i18n';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('takeoff_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const authApi = {
  async register({ username, password, firstName, lastName, email, phoneNumber }) {
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
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.registrationFailed'));
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
      throw new Error(data.error || getTranslation('apiErrors.loginFailed'));
    }
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
    localStorage.removeItem('takeoff_token');
    localStorage.removeItem('takeoff_user');
  },

  async getMe() {
    const token = localStorage.getItem('takeoff_token');
    if (!token) return null;

    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      localStorage.removeItem('takeoff_token');
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
      throw new Error(data.error || getTranslation('apiErrors.requestPasswordResetFailed'));
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
      throw new Error(data.error || getTranslation('apiErrors.passwordUpdateFailed'));
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
      throw new Error(data.error || getTranslation('apiErrors.profileUpdateFailed'));
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
      throw new Error(data.error || getTranslation('apiErrors.uploadLogoFailed'));
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
      throw new Error(data.error || getTranslation('apiErrors.accountDeletionFailed'));
    }
    localStorage.removeItem('takeoff_token');
    localStorage.removeItem('takeoff_user');
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
      const err = new Error(data.error || getTranslation('apiErrors.exportRecordingFailed'));
      err.code = data.code;
      err.trial_uses_remaining = data.trial_uses_remaining;
      err.requiredTier = data.requiredTier;
      throw err;
    }
    return data;
  },
};
