/**
 * Strips formatting and an optional US country code, returning digits only.
 */
export function normalizePhoneDigits(value) {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * A phone number is valid if empty (field is optional) or resolves to exactly 10 digits.
 */
export function isValidPhoneNumber(value) {
  if (!value || !value.trim()) return true;
  return normalizePhoneDigits(value).length === 10;
}

export const PASSWORD_MIN_LENGTH = 8;

export function isValidPassword(value) {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH) return false;
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}
