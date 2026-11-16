import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildEstimateSummary } from '../../../src/product/lib/estimateSummary.ts';

/**
 * `summary_json` is what the dashboard reads for a project's bid total, so the mapping from the
 * backend totals must stay exact — a missing key shows up as a $0.00 draft card.
 */
describe('buildEstimateSummary', () => {
  it('maps the backend totals onto the fields the dashboard reads', () => {
    const summary = buildEstimateSummary(
      {
        totalMaterialCost: 46857.5,
        totalLaborCost: 18960.5,
        totalDirectCost: 77818,
        overheadAmount: 7781.8,
        contingencyAmount: 3890.9,
        profitAmount: 13423.61,
        equipmentLumpSum: 12000,
        finalBidAmount: 102914.31,
      },
      12,
    );

    assert.deepEqual(summary, {
      totalMaterialCost: 46857.5,
      totalLaborCost: 18960.5,
      totalDirectCost: 77818,
      overheadCost: 7781.8,
      contingencyCost: 3890.9,
      profitAmount: 13423.61,
      equipmentCost: 12000,
      finalBidAmount: 102914.31,
      totalItemsCount: 12,
    });
  });

  it('prefers the short aliases the backend also returns', () => {
    const summary = buildEstimateSummary(
      {
        materialCost: 10,
        totalMaterialCost: 99,
        directCost: 20,
        totalDirectCost: 88,
        equipmentCost: 5,
        equipmentLumpSum: 7,
      },
      1,
    );

    assert.equal(summary.totalMaterialCost, 10);
    assert.equal(summary.totalDirectCost, 20);
    assert.equal(summary.equipmentCost, 5);
  });

  it('defaults to an empty summary with a zero item count', () => {
    const summary = buildEstimateSummary();

    assert.equal(summary.finalBidAmount, undefined);
    assert.equal(summary.totalItemsCount, 0);
  });
});
