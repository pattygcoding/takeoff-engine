import { getTranslation } from './i18n';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('takeoff_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const organizationsApi = {
  /**
   * List organizations current user belongs to or owns
   */
  async list() {
    const res = await fetch(`${API_BASE_URL}/organizations`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.fetchOrganizationsFailed'));
    }
    return data.organizations || [];
  },

  /**
   * Create a new organization workspace
   */
  async create({ name }) {
    const res = await fetch(`${API_BASE_URL}/organizations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || getTranslation('apiErrors.createOrganizationFailed'));
      err.code = data.code;
      throw err;
    }
    return data.organization;
  },

  /**
   * Get organization details and members
   */
  async get(orgId) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.fetchOrganizationDetailsFailed'));
    }
    return data;
  },

  /**
   * Add / invite a member to the organization
   */
  async inviteMember(orgId, { email, role = 'estimator' }) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || getTranslation('apiErrors.inviteMemberFailed'));
      err.code = data.code;
      throw err;
    }
    return data;
  },

  /**
   * Resend invitation email & token
   */
  async resendInvite(orgId, memberId) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${memberId}/resend`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.resendInviteFailed'));
    }
    return data;
  },

  /**
   * Revoke invitation
   */
  async revokeInvite(orgId, memberId) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${memberId}/revoke`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.revokeInviteFailed'));
    }
    return data;
  },

  /**
   * Update a member's role
   */
  async updateMemberRole(orgId, memberId, role) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${memberId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.updateMemberRoleFailed'));
    }
    return data.member;
  },

  /**
   * Remove a member from the organization
   */
  async removeMember(orgId, memberId) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${memberId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.removeMemberFailed'));
    }
    return data;
  },

  /**
   * Delete an organization
   */
  async delete(orgId) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || getTranslation('apiErrors.deleteOrganizationFailed'));
      err.code = data.code;
      throw err;
    }
    return data;
  },
};
