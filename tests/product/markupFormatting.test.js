import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatMarkupLine, formatMarkupBasisNote } from '../../src/product/lib/markupFormatting.js';

describe('Markup formatting helper', () => {
  const mockT = (key, params = {}) => {
    if (key === 'product.markup.percentBasis') {
      return `${params.pct}% of the initial estimated cost before contingency and profit are applied`;
    }
    if (key === 'product.markup.markupBasisNote') {
      return 'All markup percentages are calculated against the initial direct cost, not compounded on the final total.';
    }
    return key;
  };

  it('formats a percentage-based markup with the dollar amount and initial-cost basis', () => {
    assert.strictEqual(
      formatMarkupLine('Overhead', 1234, 10, mockT),
      'Overhead: $1,234.00 (10% of the initial estimated cost before contingency and profit are applied)'
    );
  });

  it('keeps fixed amounts as plain dollars without percent wording', () => {
    assert.strictEqual(
      formatMarkupLine('Overhead', 500, 10, mockT, true),
      'Overhead: $500.00'
    );
  });

  it('provides a short note explaining the initial-direct-cost basis', () => {
    assert.strictEqual(
      formatMarkupBasisNote(mockT),
      'All markup percentages are calculated against the initial direct cost, not compounded on the final total.'
    );
  });
});
