import { authApi } from '@/lib/auth/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const documentsApi = {
  /**
   * List all templates from backend
   */
  async listTemplates() {
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/api/documents/templates`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list document templates');
    }
    return res.json();
  },

  /**
   * Fetch specific template with proprietary clauses and policy content (gated by backend tier)
   */
  async getTemplate(templateId) {
    const res = await authApi.fetchWithAuth(`${API_BASE_URL}/api/documents/templates/${templateId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || 'Failed to fetch document template');
      error.code = err.code;
      error.requiredTier = err.requiredTier;
      error.status = res.status;
      throw error;
    }
    return res.json();
  },
};
