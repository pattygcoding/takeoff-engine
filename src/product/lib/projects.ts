import { getTranslation } from '@/core/lib/shared/i18n';
import { ApiError } from '@/types/api';
import type { Rates, TakeoffItem } from '@/types/models';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
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
        throw new Error(data.error || getTranslation('core.apiErrors.fetchProjectsFailed'));
      }
      return data.projects || [];
    } catch (err) {
      // If it's a 404-like error message, fallback to empty list
      if (err instanceof Error && err.message.includes('404')) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Get project by ID with full estimate details
   */
  async getById(id: string) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.fetchProjectFailed'));
    }
    return data.project;
  },

  /**
   * Create a new project
   */
  async create({
    name,
    clientName,
    location,
    status = 'draft',
    items = [],
    rates = {},
    summary = {},
  }: {
    name: string;
    clientName?: string;
    location?: string;
    status?: string;
    items?: TakeoffItem[];
    rates?: Rates;
    summary?: Record<string, unknown>;
  }) {
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
      throw new ApiError(data.error || getTranslation('core.apiErrors.createProjectFailed'), {
        code: data.code,
        trial_uses_remaining: data.trial_uses_remaining,
      });
    }
    return data.project;
  },

  /**
   * Update project metadata and/or estimate line items & rates
   */
  async update(id: string, updates: Record<string, unknown>) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.updateProjectFailed'));
    }
    return data.project;
  },

  /**
   * Delete a project
   */
  async delete(id: string) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.deleteProjectFailed'));
    }
    return true;
  },

  /**
   * Clone/duplicate a project
   */
  async clone(id: string, name?: string) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}/clone`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.duplicateProjectFailed'));
    }
    return data.project;
  },
};
