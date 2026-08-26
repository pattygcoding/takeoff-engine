import { getTranslation } from '@/lib/shared/i18n';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('takeoff_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const ratesApi = {
  /**
   * Fetch all user templates + system defaults
   */
  async list() {
    const res = await fetch(`${API_BASE_URL}/rates`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.fetchRatesFailed'));
    }
    return data;
  },

  /**
   * Create a new rate template
   */
  async create({ name, description, isDefault, ratesJson }) {
    const res = await fetch(`${API_BASE_URL}/rates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description, isDefault, ratesJson }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || getTranslation('apiErrors.saveRateTemplateFailed'));
      err.code = data.code;
      throw err;
    }
    return data.template;
  },

  /**
   * Update existing rate template
   */
  async update(id, { name, description, isDefault, ratesJson }) {
    const res = await fetch(`${API_BASE_URL}/rates/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description, isDefault, ratesJson }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.updateRateTemplateFailed'));
    }
    return data.template;
  },

  /**
   * Delete rate template
   */
  async delete(id) {
    const res = await fetch(`${API_BASE_URL}/rates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.deleteRateTemplateFailed'));
    }
    return data;
  },
};
