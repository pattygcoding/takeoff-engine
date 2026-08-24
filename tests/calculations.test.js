import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TRENCH_WIDTH_FT,
  DEFAULT_RATES,
  trenchVolumeCubicYards,
  computeItemCost,
  computeEstimate,
  formatCurrency,
  formatNumber,
} from '../src/lib/calculations.js';

describe('Calculations Engine Tests', () => {
  describe('trenchVolumeCubicYards', () => {
    it('calculates trench cubic yards accurately for Linear Foot items with depth', () => {
      const item = {
        quantity: 100, // 100 LF
        avgDepthFt: 6,  // 6 ft deep
        unit: 'LF',
      };
      // 100 LF * 6 ft * 2 ft (default trench width) = 1200 cu ft
      // 1200 / 27 = 44.4444... CY
      const result = trenchVolumeCubicYards(item);
      assert.strictEqual(Math.round(result * 100) / 100, 44.44);
    });

    it('respects custom trench width argument', () => {
      const item = {
        quantity: 54,
        avgDepthFt: 5,
        unit: 'lf',
      };
      // 54 LF * 5 ft * 3 ft = 810 cu ft
      // 810 / 27 = 30 CY
      const result = trenchVolumeCubicYards(item, 3);
      assert.strictEqual(result, 30);
    });

    it('returns 0 for non-LF units', () => {
      const eaItem = { quantity: 10, avgDepthFt: 5, unit: 'EA' };
      const cyItem = { quantity: 100, avgDepthFt: 5, unit: 'CY' };
      assert.strictEqual(trenchVolumeCubicYards(eaItem), 0);
      assert.strictEqual(trenchVolumeCubicYards(cyItem), 0);
    });

    it('returns 0 when depth or quantity is 0 or missing', () => {
      assert.strictEqual(trenchVolumeCubicYards({ quantity: 100, unit: 'LF' }), 0);
      assert.strictEqual(trenchVolumeCubicYards({ avgDepthFt: 5, unit: 'LF' }), 0);
      assert.strictEqual(trenchVolumeCubicYards({ quantity: 0, avgDepthFt: 5, unit: 'LF' }), 0);
    });
  });

  describe('computeItemCost', () => {
    it('computes material, labor hours, labor cost, and direct cost with default rates', () => {
      const item = {
        quantity: 10,
        materialCostPerUnit: 50,
        laborHoursPerUnit: 2,
      };

      const result = computeItemCost(item, DEFAULT_RATES);

      // material: 10 * 50 = 500
      // labor hours: 10 * 2 = 20
      // labor cost: 20 * 65 = 1300
      // direct cost: 500 + 1300 = 1800
      assert.strictEqual(result.materialCost, 500);
      assert.strictEqual(result.laborHours, 20);
      assert.strictEqual(result.laborCost, 1300);
      assert.strictEqual(result.directCost, 1800);
    });

    it('supports custom laborHourlyRate and handles empty/string inputs safely', () => {
      const item = {
        quantity: '5',
        materialCostPerUnit: '100',
        laborHoursPerUnit: '1.5',
      };
      const customRates = { laborHourlyRate: 80 };

      const result = computeItemCost(item, customRates);

      // material: 5 * 100 = 500
      // labor hours: 5 * 1.5 = 7.5
      // labor cost: 7.5 * 80 = 600
      // direct cost: 1100
      assert.strictEqual(result.materialCost, 500);
      assert.strictEqual(result.laborHours, 7.5);
      assert.strictEqual(result.laborCost, 600);
      assert.strictEqual(result.directCost, 1100);
    });

    it('computes direct labor cost in cost mode without multiplying by hourly rate', () => {
      const item = {
        quantity: 10,
        materialCostPerUnit: 25,
        laborUnitCost: 15,
        laborHoursPerUnit: 0.2,
      };
      const costModeRates = {
        laborMode: 'cost',
        laborHourlyRate: 100, // Should NOT be used to multiply laborUnitCost
      };

      const result = computeItemCost(item, costModeRates);

      // material: 10 * 25 = 250
      // labor cost: 10 * 15 = 150 (direct $/unit, ignores laborHourlyRate)
      // direct cost: 250 + 150 = 400
      assert.strictEqual(result.materialCost, 250);
      assert.strictEqual(result.laborCost, 150);
      assert.strictEqual(result.directCost, 400);
    });
  });

  describe('computeEstimate', () => {
    it('computes complete estimate with markups, system grouping, and 100% factored distribution', () => {
      const items = [
        {
          id: 'item-1',
          name: '8" PVC Water Main',
          system: 'Water Distribution',
          quantity: 100,
          unit: 'LF',
          avgDepthFt: 5,
          materialCostPerUnit: 20,
          laborHoursPerUnit: 0.5,
        },
        {
          id: 'item-2',
          name: 'Fire Hydrant Assembly',
          system: 'Water Distribution',
          quantity: 2,
          unit: 'EA',
          materialCostPerUnit: 2500,
          laborHoursPerUnit: 8,
        },
        {
          id: 'item-3',
          name: '12" RCP Storm Pipe',
          system: 'Storm Sewer',
          quantity: 200,
          unit: 'LF',
          avgDepthFt: 6,
          materialCostPerUnit: 35,
          laborHoursPerUnit: 0.75,
        },
      ];

      const customRates = {
        laborHourlyRate: 70,
        overheadPct: 10,
        contingencyPct: 5,
        profitPct: 15,
        equipmentLumpSum: 5000,
        trenchWidthFt: 2.5,
      };

      const estimate = computeEstimate(items, customRates);

      // Item 1:
      // Material = 100 * 20 = 2000
      // Labor Hours = 100 * 0.5 = 50
      // Labor Cost = 50 * 70 = 3500
      // Direct Cost = 5500
      // Trench CY = (100 * 5 * 2.5) / 27 = 1250 / 27 ~= 46.296

      // Item 2:
      // Material = 2 * 2500 = 5000
      // Labor Hours = 2 * 8 = 16
      // Labor Cost = 16 * 70 = 1120
      // Direct Cost = 6120
      // Trench CY = 0

      // Item 3:
      // Material = 200 * 35 = 7000
      // Labor Hours = 200 * 0.75 = 150
      // Labor Cost = 150 * 70 = 10500
      // Direct Cost = 17500
      // Trench CY = (200 * 6 * 2.5) / 27 = 3000 / 27 ~= 111.111

      // Direct Totals:
      // totalMaterialCost = 2000 + 5000 + 7000 = 14000
      // totalLaborHours = 50 + 16 + 150 = 216
      // totalLaborCost = 3500 + 1120 + 10500 = 15120
      // equipmentLumpSum = 5000
      // totalDirectCost = 14000 + 15120 + 5000 = 34120

      assert.strictEqual(estimate.totals.totalMaterialCost, 14000);
      assert.strictEqual(estimate.totals.totalLaborHours, 216);
      assert.strictEqual(estimate.totals.totalLaborCost, 15120);
      assert.strictEqual(estimate.totals.equipmentLumpSum, 5000);
      assert.strictEqual(estimate.totals.totalDirectCost, 34120);

      // Markups:
      // Overhead (10%) = 34120 * 0.10 = 3412
      // Contingency (5%) = 34120 * 0.05 = 1706
      // SubtotalWithMarkups = 34120 + 3412 + 1706 = 39238
      // Profit (15%) = 39238 * 0.15 = 5885.70
      // FinalBidAmount = 39238 + 5885.70 = 45123.70
      assert.strictEqual(estimate.totals.overheadAmount, 3412);
      assert.strictEqual(estimate.totals.contingencyAmount, 1706);
      assert.strictEqual(estimate.totals.profitAmount, 5885.7);
      assert.strictEqual(estimate.totals.finalBidAmount, 45123.7);

      // Verify By System Breakdown
      assert.strictEqual(estimate.bySystem.length, 2);
      const stormSys = estimate.bySystem.find((s) => s.system === 'Storm Sewer');
      const waterSys = estimate.bySystem.find((s) => s.system === 'Water Distribution');

      assert.ok(stormSys);
      assert.ok(waterSys);
      assert.strictEqual(stormSys.directCost, 17500);
      assert.strictEqual(waterSys.directCost, 5500 + 6120); // 11620

      // Verify factored amounts sum up to 100% of finalBidAmount
      const systemsFactoredSum = estimate.bySystem.reduce((sum, s) => sum + s.factoredBid, 0);
      assert.strictEqual(Math.round(systemsFactoredSum * 100) / 100, 45123.7);

      const itemsFactoredSum = estimate.bySystem.reduce(
        (sum, sys) => sum + sys.items.reduce((iSum, item) => iSum + item.factoredPrice, 0),
        0
      );
      assert.strictEqual(Math.round(itemsFactoredSum * 100) / 100, 45123.7);
    });

    it('handles empty item lists gracefully without dividing by zero', () => {
      const estimate = computeEstimate([]);
      assert.strictEqual(estimate.items.length, 0);
      assert.strictEqual(estimate.bySystem.length, 0);
      assert.strictEqual(estimate.totals.totalMaterialCost, 0);
      assert.strictEqual(estimate.totals.totalLaborCost, 0);
      assert.strictEqual(estimate.totals.totalDirectCost, 12000); // default equipment lump sum
      assert.ok(estimate.totals.finalBidAmount > 0);
    });

    it('supports fixed dollar amounts for overhead, contingency, profit, and misc costs', () => {
      const items = [
        {
          system: 'Grading',
          itemDescription: 'Site Clearing',
          quantity: 10,
          unit: 'AC',
          materialCostPerUnit: 500,
          laborHoursPerUnit: 10,
        },
      ];

      const rates = {
        laborHourlyRate: 50,
        equipmentLumpSum: 2000,
        equipmentType: 'fixed',
        miscCost: 1000,
        miscType: 'fixed',
        overheadPct: 1500,
        overheadType: 'fixed',
        contingencyPct: 800,
        contingencyType: 'fixed',
        profitPct: 3000,
        profitType: 'fixed',
      };

      // Material: 10 * 500 = 5000
      // Labor: 10 * 10 * 50 = 5000
      // Equipment: 2000
      // Misc: 1000
      // Direct Cost: 5000 + 5000 + 2000 + 1000 = 13000
      // Overhead: 1500
      // Contingency: 800
      // Subtotal with Markups: 13000 + 1500 + 800 = 15300
      // Profit: 3000
      // Final Bid: 15300 + 3000 = 18300
      const estimate = computeEstimate(items, rates);

      assert.strictEqual(estimate.totals.totalMaterialCost, 5000);
      assert.strictEqual(estimate.totals.totalLaborCost, 5000);
      assert.strictEqual(estimate.totals.equipmentLumpSum, 2000);
      assert.strictEqual(estimate.totals.miscCost, 1000);
      assert.strictEqual(estimate.totals.totalDirectCost, 13000);
      assert.strictEqual(estimate.totals.overheadAmount, 1500);
      assert.strictEqual(estimate.totals.contingencyAmount, 800);
      assert.strictEqual(estimate.totals.profitAmount, 3000);
      assert.strictEqual(estimate.totals.finalBidAmount, 18300);
    });

    it('supports percentage mode for equipment and miscellaneous costs', () => {
      const items = [
        {
          system: 'Paving',
          itemDescription: 'Asphalt 3"',
          quantity: 100,
          unit: 'SY',
          materialCostPerUnit: 20,
          laborHoursPerUnit: 0.1,
        },
      ];

      const rates = {
        laborHourlyRate: 100,
        // Material: 100 * 20 = 2000
        // Labor: 100 * 0.1 * 100 = 1000
        // Raw Direct Items = 3000
        equipmentLumpSum: 10, // 10% of raw direct items = 300
        equipmentType: 'percent',
        miscCost: 5, // 5% of raw direct items = 150
        miscType: 'percent',
        overheadPct: 10, // 10% of total direct cost (3450) = 345
        overheadType: 'percent',
        contingencyPct: 0,
        contingencyType: 'percent',
        profitPct: 20, // 20% of subtotal (3450 + 345 = 3795) = 759
        profitType: 'percent',
      };

      const estimate = computeEstimate(items, rates);
      assert.strictEqual(estimate.totals.totalMaterialCost, 2000);
      assert.strictEqual(estimate.totals.totalLaborCost, 1000);
      assert.strictEqual(estimate.totals.equipmentLumpSum, 300);
      assert.strictEqual(estimate.totals.miscCost, 150);
      assert.strictEqual(estimate.totals.totalDirectCost, 3450);
      assert.strictEqual(estimate.totals.overheadAmount, 345);
      assert.strictEqual(estimate.totals.contingencyAmount, 0);
      assert.strictEqual(estimate.totals.profitAmount, 759);
      assert.strictEqual(estimate.totals.finalBidAmount, 4554);
    });
  });

  describe('formatCurrency & formatNumber', () => {
    it('formats numbers into USD currency correctly', () => {
      assert.strictEqual(formatCurrency(12345.67), '$12,345.67');
      assert.strictEqual(formatCurrency(0), '$0.00');
      assert.strictEqual(formatCurrency('1500'), '$1,500.00');
      assert.strictEqual(formatCurrency(null), '$0.00');
    });

    it('formats numeric values with custom decimal places', () => {
      assert.strictEqual(formatNumber(1234.5678, 2), '1,234.57');
      assert.strictEqual(formatNumber(1234.5, 3), '1,234.500');
      assert.strictEqual(formatNumber(100, 0), '100');
    });
  });
});
