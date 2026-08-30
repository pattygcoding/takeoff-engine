/**
 * Calculations & Pricing Client Adapter
 * Pure client API wrapper delegating calculations to the backend engine.
 */
import {
  DEFAULT_TRENCH_WIDTH_FT,
  DEFAULT_WORKDAY_HOURS,
  DEFAULT_LABOR_ROLES,
  DEFAULT_EQUIPMENT_CATALOG,
  DEFAULT_RATES,
} from '@/constants/calculations.constants.js';

export {
  DEFAULT_TRENCH_WIDTH_FT,
  DEFAULT_WORKDAY_HOURS,
  DEFAULT_LABOR_ROLES,
  DEFAULT_EQUIPMENT_CATALOG,
  DEFAULT_RATES,
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('takeoff_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const calculationsApi = {
  /**
   * Compute full estimate on backend
   */
  async computeEstimate(items, rates) {
    const res = await fetch(`${API_BASE_URL}/calculations/estimate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items, rates }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to compute estimate on server.');
    }

    return res.json();
  },

  /**
   * Compute item cost on backend
   */
  async computeItemCost(item, rates) {
    const res = await fetch(`${API_BASE_URL}/calculations/item-cost`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ item, rates }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to compute item cost on server.');
    }

    return res.json();
  },

  /**
   * Normalize labor rates on backend
   */
  async normalizeRates(rates) {
    const res = await fetch(`${API_BASE_URL}/calculations/normalize-rates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rates }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to normalize rates on server.');
    }

    return res.json();
  },

  /**
   * Calculate blended crew rate on backend
   */
  async calculateBlendedCrewRate(crewComposition, laborRoles) {
    const res = await fetch(`${API_BASE_URL}/calculations/blended-crew-rate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ crewComposition, laborRoles }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to calculate blended crew rate on server.');
    }

    return res.json();
  },
};

/**
 * Proxy functions calling backend API
 */
export async function computeEstimate(items = [], rates = DEFAULT_RATES) {
  return calculationsApi.computeEstimate(items, rates);
}

export async function computeItemCost(item, rates = DEFAULT_RATES) {
  return calculationsApi.computeItemCost(item, rates);
}

export async function getNormalizedLaborRates(rates = DEFAULT_RATES) {
  return calculationsApi.normalizeRates(rates);
}

export async function calculateBlendedCrewRate(crewComposition = [], laborRoles = DEFAULT_LABOR_ROLES) {
  return calculationsApi.calculateBlendedCrewRate(crewComposition, laborRoles);
}

/**
 * Lightweight Client-Side Utilities for String Formatting Only
 */
export function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value, decimals = 2) {
  return (Number(value) || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

