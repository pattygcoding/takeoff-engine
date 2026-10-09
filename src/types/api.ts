/**
 * Shared API transport types.
 *
 * The frontend API clients read `res.json()` loosely (the backend owns response
 * shaping), so these types focus on the structured error surface the UI branches on.
 */

/** Extra machine-readable fields the backend attaches to failed requests. */
export interface ApiErrorDetails {
  code?: string;
  trial_uses_remaining?: number;
  requiredTier?: string;
  status?: number;
}

/**
 * Error thrown by the API clients. Extends `Error` so existing `err.message`
 * consumers keep working while exposing the backend's structured fields.
 */
export class ApiError extends Error {
  code?: string;
  trial_uses_remaining?: number;
  requiredTier?: string;
  status?: number;

  constructor(message: string, details: ApiErrorDetails = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = details.code;
    this.trial_uses_remaining = details.trial_uses_remaining;
    this.requiredTier = details.requiredTier;
    this.status = details.status;
  }
}

/** Narrows an unknown catch value to the structured API error fields, when present. */
export function getApiErrorDetails(error: unknown): ApiErrorDetails {
  if (!error || typeof error !== 'object') return {};
  const candidate = error as ApiErrorDetails;
  return {
    code: candidate.code,
    trial_uses_remaining: candidate.trial_uses_remaining,
    requiredTier: candidate.requiredTier,
    status: candidate.status,
  };
}

/** Payload accepted by `authApi.register`. */
export interface RegisterPayload {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  acceptedTerms: boolean;
  confirmedAge: boolean;
  termsVersion: string;
  _gotcha?: string;
  website_url?: string;
}
