const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('takeoff_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const billingApi = {
  /**
   * Get billing configuration
   */
  async getConfig() {
    const res = await fetch(`${API_BASE_URL}/billing/config`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  /**
   * Get current user's subscription details and renewal date
   */
  async getSubscriptionDetails() {
    const res = await fetch(`${API_BASE_URL}/billing/subscription-details`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch subscription details.');
    }
    return data;
  },

  /**
   * Create Paddle checkout parameters
   */
  async createCheckout(plan = 'pro') {
    const res = await fetch(`${API_BASE_URL}/billing/create-checkout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create checkout session.');
    }
    return data;
  },

  /**
   * Mock upgrade in non-prod sandbox mode
   */
  async mockActivate(plan = 'pro') {
    const res = await fetch(`${API_BASE_URL}/billing/mock-activate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Mock activation failed.');
    }
    return data;
  },

  /**
   * Redeem a promo code (VIP bypass or credit grant)
   */
  async redeemPromoCode(code) {
    const res = await fetch(`${API_BASE_URL}/billing/redeem-code`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to redeem promo code.');
    }
    return data;
  },
};

export const adminApi = {
  /**
   * Fetch all users
   */
  async getUsers() {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch users.');
    }
    return data.users;
  },

  /**
   * Grant or revoke VIP unlimited bypass for a user
   */
  async grantBypass(userId, { hasUnlimitedBypass = true, bypassReason = 'Admin Granted VIP Access', role = 'payment_exempt', tier = 'pro' }) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/grant-bypass`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ hasUnlimitedBypass, bypassReason, role, tier }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update user bypass.');
    }
    return data;
  },

  /**
   * List all promo codes
   */
  async getPromoCodes() {
    const res = await fetch(`${API_BASE_URL}/admin/promo-codes`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch promo codes.');
    }
    return data.promoCodes;
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
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create promo code.');
    }
    return data;
  },
};
