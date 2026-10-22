import { describe, it, expect } from 'vitest';
import { brandingWithQuoteContact, quoteContactConflicts } from '@/product/components/ResultsStep';
import type { Branding, QuoteMetadata } from '@/types/models';

/**
 * A client quote carries the *subcontractor's* contact details. They must only ever apply to the
 * project they were imported into — the account-wide branding is rewritten solely when the estimator
 * opts in from the contact panel.
 */
describe('Quote contact details vs account settings', () => {
  const branding: Branding = {
    companyName: 'My Estimating Co',
    companyAddress: '1 Account Way, Greenville, SC',
    companyPhone: '864-000-1111',
    brandColor: '#123456',
  };

  const quoteMeta: QuoteMetadata = {
    contractorAddress: '3904 CYPRESS LANDING E, WINTER HAVEN, FL 33884',
    contactPhone: '407-576-4197',
    contactName: 'Robert Pizarro',
    builder: 'Tobin Mechanical',
    projectAddress: '11048 Bridge House Road, Windermere, FL, USA',
    quoteDate: '10/21/2026',
    documentTitle: 'PLUMBING QUOTE',
  };

  describe('brandingWithQuoteContact', () => {
    it('overrides the address and phone for the project documents only', () => {
      const merged = brandingWithQuoteContact(branding, quoteMeta);

      expect(merged?.companyAddress).toBe('3904 CYPRESS LANDING E, WINTER HAVEN, FL 33884');
      expect(merged?.companyPhone).toBe('407-576-4197');
      // Everything else, and the original object, stay untouched.
      expect(merged?.companyName).toBe('My Estimating Co');
      expect(merged?.brandColor).toBe('#123456');
      expect(branding.companyAddress).toBe('1 Account Way, Greenville, SC');
      expect(branding.companyPhone).toBe('864-000-1111');
    });

    it('leaves the branding alone when there is no quote or no branded account', () => {
      expect(brandingWithQuoteContact(branding, null)).toBe(branding);
      expect(brandingWithQuoteContact(branding, undefined)).toBe(branding);
      expect(brandingWithQuoteContact(null, quoteMeta)).toBeNull();
    });

    it('keeps saved values for the fields the quote does not carry', () => {
      const merged = brandingWithQuoteContact(branding, { contactName: 'Robert Pizarro' });

      expect(merged?.companyAddress).toBe('1 Account Way, Greenville, SC');
      expect(merged?.companyPhone).toBe('864-000-1111');
      expect(merged).not.toBe(branding);
    });
  });

  describe('quoteContactConflicts', () => {
    it('flags a mismatch against the saved account details', () => {
      const user = { company_address: '1 Account Way, Greenville, SC', phone_number: '864-000-1111' };
      expect(quoteContactConflicts(quoteMeta, user)).toBe(true);
    });

    it('ignores punctuation-only differences in phone numbers', () => {
      const user = { company_address: quoteMeta.contractorAddress, phone_number: '(407) 576-4197' };
      expect(quoteContactConflicts(quoteMeta, user)).toBe(false);
    });

    it('does not ask when the quote carries no contact details', () => {
      expect(quoteContactConflicts(undefined, {})).toBe(false);
      expect(quoteContactConflicts({ builder: 'Tobin Mechanical' }, {})).toBe(false);
    });
  });
});
