import { getTranslation } from './i18n';

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
      throw new Error(data.error || getTranslation('apiErrors.fetchSubscriptionDetailsFailed'));
    }
    return data;
  },

  /**
   * Create Paddle checkout parameters
   */
  async createCheckout(plan = 'pro', interval = 'monthly', additionalSeats = 0) {
    const res = await fetch(`${API_BASE_URL}/billing/create-checkout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ plan, interval, additionalSeats }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.createCheckoutSessionFailed'));
    }
    return data;
  },

  /**
   * Mock upgrade in non-prod sandbox mode
   */
  async mockActivate(plan = 'pro', interval = 'monthly', additionalSeats = 0) {
    const res = await fetch(`${API_BASE_URL}/billing/mock-activate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ plan, interval, additionalSeats }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.mockActivationFailed'));
    }
    return data;
  },

  /**
   * Dynamically adjust additional seats on active Pro / Enterprise subscription (US-037)
   */
  async updateSeats(additionalSeats, orgId) {
    const res = await fetch(`${API_BASE_URL}/billing/update-seats`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ additionalSeats, orgId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.updateSeatsFailed'));
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
      throw new Error(data.error || getTranslation('apiErrors.redeemPromoCodeFailed'));
    }
    return data;
  },

  /**
   * Get Paddle customer management portal URL
   */
  async getCustomerPortal() {
    const res = await fetch(`${API_BASE_URL}/billing/customer-portal`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.getCustomerPortalFailed'));
    }
    return data;
  },

  /**
   * Cancel subscription at end of billing period (US-021)
   */
  async cancelSubscription(reason) {
    const res = await fetch(`${API_BASE_URL}/billing/cancel-subscription`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.cancelSubscriptionFailed'));
    }
    return data;
  },

  /**
   * Preview seat conversions and constraints when downgrading subscription tier (US-035)
   */
  async previewDowngrade(targetPlan) {
    const res = await fetch(`${API_BASE_URL}/billing/downgrade-preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetPlan }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.downgradePreviewFailed'));
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
      throw new Error(data.error || getTranslation('apiErrors.fetchUsersFailed'));
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
      throw new Error(data.error || getTranslation('apiErrors.updateUserBypassFailed'));
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
      throw new Error(data.error || getTranslation('apiErrors.fetchPromoCodesFailed'));
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
      throw new Error(data.error || getTranslation('apiErrors.createPromoCodeFailed'));
    }
    return data;
  },
};
