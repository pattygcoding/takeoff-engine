import { getTranslation } from '@/core/lib/shared/i18n';
import { ApiError } from '@/types/api';
import type { Rates, TakeoffItem } from '@/types/models';

interface GenerateProposalParams {
  projectId?: string;
  projectName?: string;
  clientName?: string;
  location?: string;
  items?: TakeoffItem[];
  rates?: Rates;
  summary?: Record<string, unknown>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

export const proposalsApi = {
  /**
   * Generate or retrieve public shareable token for a project proposal (Contractor auth)
   */
  async generateProposal({ projectId, projectName, clientName, location, items, rates, summary }: GenerateProposalParams) {
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
      throw new ApiError(data.error || getTranslation('core.apiErrors.generateProposalFailed'), {
        code: data.code,
      });
    }
    return data;
  },

  /**
   * Send direct email to client with signing link
   */
  async sendProposalEmail({
    projectId,
    recipientEmail,
    recipientName,
    message,
  }: {
    projectId?: string;
    recipientEmail?: string;
    recipientName?: string;
    message?: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/proposals/send-email`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ projectId, recipientEmail, recipientName, message }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(data.error || getTranslation('core.apiErrors.sendProposalEmailFailed'), {
        code: data.code,
      });
    }
    return data;
  },

  /**
   * Alias for backward compatibility
   */
  async generateLink(projectId: string, proposalData?: GenerateProposalParams) {
    return this.generateProposal({ projectId, ...(proposalData || {}) });
  },

  /**
   * Fetch public proposal data (No auth required)
   */
  async getPublicProposal(token: string) {
    const res = await fetch(`${API_BASE_URL}/proposals/public/${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.proposalNotFoundOrExpired'));
    }
    return data;
  },

  /**
   * Sign and accept proposal (No auth required)
   */
  async signPublicProposal(token: string, { signerName, signerEmail }: { signerName: string; signerEmail: string }) {
    const res = await fetch(`${API_BASE_URL}/proposals/public/${token}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signerName, signerEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.submitSignatureFailed'));
    }
    return data;
  },

  /**
   * Decline proposal (No auth required)
   */
  async declinePublicProposal(
    token: string,
    { reason, signerEmail, signerName }: { reason?: string; signerEmail?: string; signerName?: string } = {},
  ) {
    const res = await fetch(`${API_BASE_URL}/proposals/public/${token}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, signerEmail, signerName }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.declineProposalFailed'));
    }
    return data;
  },

  /**
   * Submit client scope counter-offer / revision request (US-044)
   */
  async submitPublicCounterOffer(
    token: string,
    {
      counterNotes,
      scopeChanges,
      clientName,
      signerEmail,
    }: { counterNotes?: string; scopeChanges?: unknown[]; clientName?: string; signerEmail?: string } = {},
  ) {
    const res = await fetch(`${API_BASE_URL}/proposals/public/${token}/counter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counterNotes, scopeChanges, clientName, signerEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.counterOfferFailed'));
    }
    return data;
  },
};
