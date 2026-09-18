import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidPassword, PASSWORD_MIN_LENGTH } from '#core/lib/shared/validators.js';

test('Frontend password validation enforces the account password policy', async (t) => {
  await t.test('accepts a password meeting every requirement', () => {
    assert.equal(isValidPassword('Secure123!'), true);
  });

  await t.test('requires at least 8 characters', () => {
    assert.equal(PASSWORD_MIN_LENGTH, 8);
    assert.equal(isValidPassword('Ab1!xyz'), false);
  });

  await t.test('requires lowercase, uppercase, number, and special character', () => {
    assert.equal(isValidPassword('SECURE123!'), false);
    assert.equal(isValidPassword('secure123!'), false);
    assert.equal(isValidPassword('SecurePass!'), false);
    assert.equal(isValidPassword('Secure1234'), false);
  });

  await t.test('rejects non-string and empty values', () => {
    assert.equal(isValidPassword(''), false);
    assert.equal(isValidPassword(null), false);
    assert.equal(isValidPassword(undefined), false);
  });
});
