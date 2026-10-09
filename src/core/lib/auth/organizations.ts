import { getTranslation } from '@/core/lib/shared/i18n';
import { addAuthorizationHeader } from '@/core/lib/auth/sessionToken';
import { ApiError } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** sessionStorage key holding an invitation to resume after the invitee signs in. */
export const PENDING_INVITE_KEY = 'pending_invite_token';

const getAuthHeaders = () => {
  return addAuthorizationHeader({
    'Content-Type': 'application/json',
  });
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
      throw new Error(data.error || getTranslation('core.apiErrors.fetchOrganizationsFailed'));
    }
    return data.organizations || [];
  },

  /**
   * Create a new organization workspace
   */
  async create({ name }: { name: string }) {
    const res = await fetch(`${API_BASE_URL}/organizations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(data.error || getTranslation('core.apiErrors.createOrganizationFailed'), {
        code: data.code,
      });
    }
    return data.organization;
  },

  /**
   * Get organization details and members
   */
  async get(orgId: string) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.fetchOrganizationDetailsFailed'));
    }
    return data;
  },

  /**
   * Add / invite a member to the organization
   */
  async inviteMember(orgId: string, { email, role = 'estimator' }: { email: string; role?: string }) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(data.error || getTranslation('core.apiErrors.inviteMemberFailed'), {
        code: data.code,
      });
    }
    return data;
  },

  /**
   * Resend invitation email & token
   */
  async resendInvite(orgId: string, memberId: string) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${memberId}/resend`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.resendInviteFailed'));
    }
    return data;
  },

  /**
   * Revoke invitation
   */
  async revokeInvite(orgId: string, memberId: string) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${memberId}/revoke`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.revokeInviteFailed'));
    }
    return data;
  },

  /**
   * Update a member's role
   */
  async updateMemberRole(orgId: string, memberId: string, role: string) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${memberId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.updateMemberRoleFailed'));
    }
    return data.member;
  },

  /**
   * Remove a member from the organization
   */
  async removeMember(orgId: string, memberId: string) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${memberId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.removeMemberFailed'));
    }
    return data;
  },

  /**
   * Leave an organization (non-owner members)
   */
  async leave(orgId: string) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/leave`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.leaveOrganizationFailed'));
    }
    return data;
  },

  /**
   * Delete an organization
   */
  async delete(orgId: string) {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(data.error || getTranslation('core.apiErrors.deleteOrganizationFailed'), {
        code: data.code,
      });
    }
    return data;
  },
};
