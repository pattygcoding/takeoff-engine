import { getTranslation } from '@/core/lib/shared/i18n';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('takeoff_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const projectsApi = {
  /**
   * List all projects for authenticated user
   */
  async list() {
    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      // If endpoint returns 404 (e.g. before backend reloads or if empty), treat as empty array
      if (res.status === 404) {
        return [];
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || getTranslation('apiErrors.fetchProjectsFailed'));
      }
      return data.projects || [];
    } catch (err) {
      // If it's a 404-like error message, fallback to empty list
      if (err.message && err.message.includes('404')) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Get project by ID with full estimate details
   */
  async getById(id) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.fetchProjectFailed'));
    }
    return data.project;
  },

  /**
   * Create a new project
   */
  async create({ name, clientName, location, status = 'draft', items = [], rates = {}, summary = {} }) {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        clientName,
        location,
        status,
        items,
        rates,
        summary,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || getTranslation('apiErrors.createProjectFailed'));
      err.code = data.code;
      err.trial_uses_remaining = data.trial_uses_remaining;
      throw err;
    }
    return data.project;
  },

  /**
   * Update project metadata and/or estimate line items & rates
   */
  async update(id, updates) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.updateProjectFailed'));
    }
    return data.project;
  },

  /**
   * Delete a project
   */
  async delete(id) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.deleteProjectFailed'));
    }
    return true;
  },

  /**
   * Clone/duplicate a project
   */
  async clone(id, name) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}/clone`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.duplicateProjectFailed'));
    }
    return data.project;
  },
};
