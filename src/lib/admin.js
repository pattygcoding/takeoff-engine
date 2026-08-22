const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('takeoff_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const adminApi = {
  /**
   * Get platform metrics & statistics
   */
  async getStats() {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch admin stats.');
    return data.stats;
  },

  /**
   * List all registered users
   */
  async listUsers() {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch user list.');
    return data.users || [];
  },

  /**
   * Create a new user account directly from Super-Admin portal
   */
  async createUser(payload) {
    const res = await fetch(`${API_BASE_URL}/admin/users/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create user.');
    return data;
  },

  /**
   * Grant / revoke unlimited VIP bypass
   */
  async grantBypass(userId, { hasUnlimitedBypass, bypassReason, role, tier }) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/grant-bypass`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ hasUnlimitedBypass, bypassReason, role, tier }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update VIP status.');
    return data.user;
  },

  /**
   * Set exact takeoff credits (or adjust credits) on a user account
   */
  async setCredits(userId, exactCredits = 5, reason = '') {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/add-credits`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ exactCredits: Number(exactCredits), reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update credits.');
    return data.user;
  },

  /**
   * Add bonus or adjust credits on a user account (legacy helper)
   */
  async addCredits(userId, credits = 5, reason = '') {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/add-credits`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ credits, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to adjust credits.');
    return data.user;
  },

  /**
   * Update user status (active vs suspended/disabled)
   */
  async updateStatus(userId, { status, is_disabled, reason }) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, is_disabled, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user status.');
    return data.user;
  },

  /**
   * Unlock a temporarily locked account (US-034)
   */
  async unlockAccount(userId, { reason } = {}) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/unlock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to unlock user account.');
    return data.user;
  },

  /**
   * Update user role with reason
   */
  async updateRole(userId, { role, reason }) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user role.');
    return data.user;
  },

  /**
   * Update user subscription tier directly (free, starter, pro, enterprise)
   */
  async updateSubscriptionTier(userId, { subscription_tier, reason }) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/subscription-tier`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ subscription_tier, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update subscription tier.');
    return data.user;
  },

  /**
   * Trigger password reset email
   */
  async resetPassword(userId, { reason } = {}) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send password reset email.');
    return data;
  },

  /**
   * Update user details (role, tier, credits, disabled)
   */
  async updateUser(userId, updates) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/update`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user.');
    return data.user;
  },

  /**
   * List all promo codes
   */
  async listPromoCodes() {
    const res = await fetch(`${API_BASE_URL}/admin/promo-codes`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch promo codes.');
    return data.promoCodes || [];
  },

  /**
   * Create a new promo code
   */
  async createPromoCode(promoData) {
    const res = await fetch(`${API_BASE_URL}/admin/promo-codes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(promoData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create promo code.');
    return data.promoCode;
  },

  /**
   * List recent immutable admin audit logs
   */
  async listAuditLogs() {
    const res = await fetch(`${API_BASE_URL}/admin/audit-logs`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch audit logs.');
    return data.auditLogs || [];
  },
};
