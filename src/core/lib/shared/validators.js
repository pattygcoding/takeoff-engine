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
