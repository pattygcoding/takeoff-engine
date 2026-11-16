import type { EstimateTotals } from '@/types/models';

/**
 * The rolled-up numbers stored on an estimate row (`summary_json`).
 *
 * One definition shared by the Step 3 save and the Step 2 autosave, so the dashboard's
 * `finalBidAmount` can never disagree with what Step 3 shows. The backend returns both the
 * `total*` names and their short aliases, so either shape is accepted.
 */
export function buildEstimateSummary(
  totals: EstimateTotals = {},
  itemCount = 0,
): Record<string, unknown> {
  return {
    totalMaterialCost: totals.materialCost ?? totals.totalMaterialCost,
    totalLaborCost: totals.laborCost ?? totals.totalLaborCost,
    totalDirectCost: totals.directCost ?? totals.totalDirectCost,
    overheadCost: totals.overheadCost ?? totals.overheadAmount,
    contingencyCost: totals.contingencyCost ?? totals.contingencyAmount,
    profitAmount: totals.profitAmount,
    equipmentCost: totals.equipmentCost ?? totals.equipmentLumpSum,
    finalBidAmount: totals.finalBidAmount,
    totalItemsCount: itemCount,
  };
}
