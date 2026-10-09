import { ApiError } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

export const documentsApi = {
  /**
   * List all templates from backend
   */
  async listTemplates() {
    const res = await fetch(`${API_BASE_URL}/documents/templates`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list document templates');
    }
    return res.json();
  },

  /**
   * Fetch specific template with proprietary clauses and policy content (gated by backend tier)
   */
  async getTemplate(templateId: string) {
    const res = await fetch(`${API_BASE_URL}/documents/templates/${templateId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(err.error || 'Failed to fetch document template', {
        code: err.code,
        requiredTier: err.requiredTier,
        status: res.status,
      });
    }
    return res.json();
  },
};
