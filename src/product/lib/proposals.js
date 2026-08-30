import { getTranslation } from '@/core/lib/shared/i18n';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('takeoff_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const proposalsApi = {
  /**
   * Generate or retrieve public shareable token for a project proposal (Contractor auth)
   */
  async generateProposal({ projectId, projectName, clientName, location, items, rates, summary }) {
    const proposalData = {
      projectName,
      clientName,
      location,
      items,
      rates,
      summary,
    };

    const res = await fetch(`${API_BASE_URL}/proposals/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ projectId, proposalData }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || getTranslation('apiErrors.generateProposalFailed'));
      err.code = data.code;
      throw err;
    }
    return data;
  },

  /**
   * Send direct email to client with signing link
   */
  async sendProposalEmail({ projectId, recipientEmail, recipientName, message }) {
    const res = await fetch(`${API_BASE_URL}/proposals/send-email`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ projectId, recipientEmail, recipientName, message }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || getTranslation('apiErrors.sendProposalEmailFailed'));
      err.code = data.code;
      throw err;
    }
    return data;
  },

  /**
   * Alias for backward compatibility
   */
  async generateLink(projectId, proposalData) {
    return this.generateProposal({ projectId, ...(proposalData || {}) });
  },

  /**
   * Fetch public proposal data (No auth required)
   */
  async getPublicProposal(token) {
    const res = await fetch(`${API_BASE_URL}/proposals/public/${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.proposalNotFoundOrExpired'));
    }
    return data;
  },

  /**
   * Sign and accept proposal (No auth required)
   */
  async signPublicProposal(token, { signerName, signerEmail }) {
    const res = await fetch(`${API_BASE_URL}/proposals/public/${token}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signerName, signerEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.submitSignatureFailed'));
    }
    return data;
  },

  /**
   * Decline proposal (No auth required)
   */
  async declinePublicProposal(token, { reason, signerEmail, signerName } = {}) {
    const res = await fetch(`${API_BASE_URL}/proposals/public/${token}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, signerEmail, signerName }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.declineProposalFailed'));
    }
    return data;
  },

  /**
   * Submit client scope counter-offer / revision request (US-044)
   */
  async submitPublicCounterOffer(token, { counterNotes, scopeChanges, clientName, signerEmail } = {}) {
    const res = await fetch(`${API_BASE_URL}/proposals/public/${token}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counterNotes, scopeChanges, clientName, signerEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('apiErrors.counterOfferFailed', 'Failed to submit counter-offer request.'));
    }
    return data;
  },
};
