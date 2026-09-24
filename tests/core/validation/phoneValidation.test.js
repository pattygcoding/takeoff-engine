import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidPhoneNumber, normalizePhoneDigits } from '#core/lib/shared/validators.js';

describe('Phone number validation (frontend): only accepts valid 10-digit numbers', () => {
  it('treats blank as valid since phone is an optional field', () => {
    assert.equal(isValidPhoneNumber(''), true);
    assert.equal(isValidPhoneNumber('   '), true);
  });

  it('accepts common 10-digit formats', () => {
    assert.equal(isValidPhoneNumber('(555) 123-4567'), true);
    assert.equal(isValidPhoneNumber('555-123-4567'), true);
    assert.equal(isValidPhoneNumber('5551234567'), true);
  });

  it('strips a leading +1 country code down to 10 digits', () => {
    assert.equal(isValidPhoneNumber('+1 555 123 4567'), true);
    assert.equal(normalizePhoneDigits('+1 555 123 4567'), '5551234567');
  });

  it('rejects numbers that are too short, too long, or non-numeric', () => {
    assert.equal(isValidPhoneNumber('555-1234'), false);
    assert.equal(isValidPhoneNumber('555-123-45678'), false);
    assert.equal(isValidPhoneNumber('not-a-number'), false);
  });
});
