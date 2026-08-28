import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  DEFAULT_TRENCH_WIDTH_FT,
  DEFAULT_WORKDAY_HOURS,
  DEFAULT_RATES,
  DEFAULT_LABOR_ROLES,
  DEFAULT_EQUIPMENT_CATALOG,
  getNormalizedLaborRates,
  getItemEffectiveLaborRate,
  calculateBlendedCrewRate,
  calculateEquipmentRentalCost,
  trenchVolumeCubicYards,
  computeItemCost,
  computeEstimate,
  formatCurrency,
  formatNumber,
} from '@/lib/product/calculations.js';

describe('Calculations Engine Tests', () => {
  describe('getNormalizedLaborRates', () => {
    it('returns default hourly and daily rates when rates object is empty', () => {
      const normalized = getNormalizedLaborRates({});
      assert.strictEqual(normalized.laborRateBasis, 'hourly');
      assert.strictEqual(normalized.laborHourlyRate, 65.0);
      assert.strictEqual(normalized.laborDailyRate, 520.0);
      assert.strictEqual(normalized.workdayHours, 8.0);
    });

    it('calculates daily rate from custom hourly rate with default 8 hours', () => {
      const normalized = getNormalizedLaborRates({ laborHourlyRate: 75.0 });
      assert.strictEqual(normalized.laborRateBasis, 'hourly');
      assert.strictEqual(normalized.laborHourlyRate, 75.0);
      assert.strictEqual(normalized.laborDailyRate, 600.0);
      assert.strictEqual(normalized.workdayHours, 8.0);
    });

    it('calculates hourly rate from daily rate in daily basis mode', () => {
      const normalized = getNormalizedLaborRates({
        laborRateBasis: 'daily',
        laborDailyRate: 600.0,
        workdayHours: 10.0,
      });
      assert.strictEqual(normalized.laborRateBasis, 'daily');
      assert.strictEqual(normalized.laborDailyRate, 600.0);
      assert.strictEqual(normalized.laborHourlyRate, 60.0);
      assert.strictEqual(normalized.workdayHours, 10.0);
    });

    it('provides backward compatibility for legacy estimates with only laborHourlyRate', () => {
      const legacy = { laborHourlyRate: 85.0 };
      const normalized = getNormalizedLaborRates(legacy);
      assert.strictEqual(normalized.laborRateBasis, 'hourly');
      assert.strictEqual(normalized.laborHourlyRate, 85.0);
      assert.strictEqual(normalized.laborDailyRate, 680.0);
      assert.strictEqual(normalized.workdayHours, 8.0);
    });

    it('handles extreme edge cases, string numbers, nulls, zeroes, and boundary workday hours safely', () => {
      // Zero workday hours falls back to default 8.0
      const zeroHours = getNormalizedLaborRates({ laborHourlyRate: 50, workdayHours: 0 });
      assert.strictEqual(zeroHours.workdayHours, 8.0);
      assert.strictEqual(zeroHours.laborDailyRate, 400.0);

      // Negative numbers fallback gracefully
      const negHours = getNormalizedLaborRates({ laborHourlyRate: 50, workdayHours: -5 });
      assert.strictEqual(negHours.workdayHours, 8.0);

      // String inputs for daily basis
      const strInputs = getNormalizedLaborRates({
        laborRateBasis: 'daily',
        laborDailyRate: '800',
        workdayHours: '10',
      });
      assert.strictEqual(strInputs.laborRateBasis, 'daily');
      assert.strictEqual(strInputs.laborDailyRate, 800.0);
      assert.strictEqual(strInputs.laborHourlyRate, 80.0);
      assert.strictEqual(strInputs.workdayHours, 10.0);

      // Daily basis with only hourly rate supplied falls back to calculating daily
      const dailyBasisFallback = getNormalizedLaborRates({
        laborRateBasis: 'daily',
        laborHourlyRate: 90.0,
        workdayHours: 8.0,
      });
      assert.strictEqual(dailyBasisFallback.laborDailyRate, 720.0);
      assert.strictEqual(dailyBasisFallback.laborHourlyRate, 90.0);

      // 24-hour shift continuous operations
      const continuous24 = getNormalizedLaborRates({
        laborRateBasis: 'daily',
        laborDailyRate: 2400.0,
        workdayHours: 24.0,
      });
      assert.strictEqual(continuous24.laborHourlyRate, 100.0);
      assert.strictEqual(continuous24.laborDailyRate, 2400.0);
    });
  });
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

    it('calculates identical item cost whether rates are specified via hourly or equivalent daily basis', () => {
      const item = {
        quantity: 100,
        materialCostPerUnit: 12.5,
        laborHoursPerUnit: 0.8,
      };

      const hourlyRates = {
        laborRateBasis: 'hourly',
        laborHourlyRate: 75.0,
        workdayHours: 8.0,
      };

      const dailyRates = {
        laborRateBasis: 'daily',
        laborDailyRate: 600.0, // 600 / 8 = 75.0
        workdayHours: 8.0,
      };

      const costHourly = computeItemCost(item, hourlyRates);
      const costDaily = computeItemCost(item, dailyRates);

      assert.strictEqual(costHourly.materialCost, costDaily.materialCost);
      assert.strictEqual(costHourly.laborHours, costDaily.laborHours);
      assert.strictEqual(costHourly.laborCost, costDaily.laborCost);
      assert.strictEqual(costHourly.directCost, costDaily.directCost);
      assert.strictEqual(costDaily.laborCost, 100 * 0.8 * 75.0); // 6000
    });

    it('handles floating point production rates and odd crew workday hours accurately', () => {
      const item = {
        quantity: 333.33,
        materialCostPerUnit: 14.28,
        laborHoursPerUnit: 0.333333,
      };

      const rates = {
        laborRateBasis: 'daily',
        laborDailyRate: 715.0, // 715 / 11 = 65.0
        workdayHours: 11.0,
      };

      const result = computeItemCost(item, rates);
      assert.ok(result.materialCost > 0);
      assert.ok(result.laborCost > 0);
      assert.ok(result.directCost > 0);
      assert.strictEqual(Math.round(result.laborCost * 100) / 100, Math.round(333.33 * 0.333333 * 65.0 * 100) / 100);
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

    it('supports itemized miscellaneous line items summing towards direct cost', () => {
      const items = [
        {
          system: 'Utilities',
          itemDescription: '8" PVC Pipe',
          quantity: 100,
          unit: 'LF',
          materialCostPerUnit: 10,
          laborHoursPerUnit: 0.1,
        },
      ];

      const rates = {
        laborHourlyRate: 50,
        equipmentLumpSum: 500,
        equipmentType: 'fixed',
        miscItems: [
          { id: '1', title: 'City Permits', amount: 350 },
          { id: '2', title: 'Traffic Control & Signage', amount: 450 },
          { id: '3', title: 'Street Opening Bond', amount: 200 },
        ],
        miscType: 'fixed',
        overheadPct: 0,
        contingencyPct: 0,
        profitPct: 0,
      };

      // Material: 100 * 10 = 1000
      // Labor: 100 * 0.1 * 50 = 500
      // Equipment: 500
      // Itemized Misc Costs: 350 + 450 + 200 = 1000
      // Total Direct: 1000 + 500 + 500 + 1000 = 3000
      const estimate = computeEstimate(items, rates);

      assert.strictEqual(estimate.totals.totalMaterialCost, 1000);
      assert.strictEqual(estimate.totals.totalLaborCost, 500);
      assert.strictEqual(estimate.totals.equipmentLumpSum, 500);
      assert.strictEqual(estimate.totals.miscCost, 1000);
      assert.strictEqual(estimate.totals.miscItems.length, 3);
      assert.strictEqual(estimate.totals.totalDirectCost, 3000);
      assert.strictEqual(estimate.totals.finalBidAmount, 3000);
    });

    it('produces identical overall bid estimates when switching between hourly and daily rate bases', () => {
      const items = [
        {
          id: '1',
          system: 'Water',
          quantity: 500,
          unit: 'LF',
          materialCostPerUnit: 40,
          laborHoursPerUnit: 0.5,
        },
        {
          id: '2',
          system: 'Sewer',
          quantity: 20,
          unit: 'EA',
          materialCostPerUnit: 1200,
          laborHoursPerUnit: 6,
        },
      ];

      const hourlyConfig = {
        laborRateBasis: 'hourly',
        laborHourlyRate: 80.0,
        workdayHours: 8.0,
        overheadPct: 10,
        overheadType: 'percent',
        contingencyPct: 5,
        contingencyType: 'percent',
        profitPct: 15,
        profitType: 'percent',
        equipmentLumpSum: 15000,
        equipmentType: 'fixed',
      };

      const dailyConfig = {
        ...hourlyConfig,
        laborRateBasis: 'daily',
        laborDailyRate: 640.0, // 640 / 8 = 80.0
      };

      const estimateFromHourly = computeEstimate(items, hourlyConfig);
      const estimateFromDaily = computeEstimate(items, dailyConfig);

      assert.strictEqual(estimateFromHourly.totals.totalMaterialCost, estimateFromDaily.totals.totalMaterialCost);
      assert.strictEqual(estimateFromHourly.totals.totalLaborHours, estimateFromDaily.totals.totalLaborHours);
      assert.strictEqual(estimateFromHourly.totals.totalLaborCost, estimateFromDaily.totals.totalLaborCost);
      assert.strictEqual(estimateFromHourly.totals.totalDirectCost, estimateFromDaily.totals.totalDirectCost);
      assert.strictEqual(estimateFromHourly.totals.overheadAmount, estimateFromDaily.totals.overheadAmount);
      assert.strictEqual(estimateFromHourly.totals.contingencyAmount, estimateFromDaily.totals.contingencyAmount);
      assert.strictEqual(estimateFromHourly.totals.profitAmount, estimateFromDaily.totals.profitAmount);
      assert.strictEqual(estimateFromHourly.totals.finalBidAmount, estimateFromDaily.totals.finalBidAmount);
      assert.strictEqual(estimateFromHourly.totals.markupFactor, estimateFromDaily.totals.markupFactor);
    });

    it('handles composite multi-tier markup stacking and compound percentage calculation limits', () => {
      const items = [
        {
          system: 'Heavy Civil',
          quantity: 1000,
          unit: 'CY',
          materialCostPerUnit: 15,
          laborHoursPerUnit: 0.25,
        },
      ];

      const rates = {
        laborRateBasis: 'daily',
        laborDailyRate: 1000.0,
        workdayHours: 10.0, // $100/hr
        equipmentLumpSum: 20, // 20% of items direct
        equipmentType: 'percent',
        miscCost: 10, // 10% of items direct
        miscType: 'percent',
        overheadPct: 12.5,
        overheadType: 'percent',
        contingencyPct: 7.5,
        contingencyType: 'percent',
        profitPct: 18.0,
        profitType: 'percent',
      };

      // Material: 1000 * 15 = 15000
      // Labor: 1000 * 0.25 * 100 = 25000
      // Items direct sum = 40000
      // Equipment (20% of 40000) = 8000
      // Misc (10% of 40000) = 4000
      // Total direct cost = 40000 + 8000 + 4000 = 52000
      // Overhead (12.5% of 52000) = 6500
      // Contingency (7.5% of 52000) = 3900
      // Subtotal with markups = 52000 + 6500 + 3900 = 62400
      // Profit (18% of 62400) = 11232
      // Final bid amount = 62400 + 11232 = 73632

      const estimate = computeEstimate(items, rates);
      assert.strictEqual(estimate.totals.totalMaterialCost, 15000);
      assert.strictEqual(estimate.totals.totalLaborCost, 25000);
      assert.strictEqual(estimate.totals.equipmentLumpSum, 8000);
      assert.strictEqual(estimate.totals.miscCost, 4000);
      assert.strictEqual(estimate.totals.totalDirectCost, 52000);
      assert.strictEqual(estimate.totals.overheadAmount, 6500);
      assert.strictEqual(estimate.totals.contingencyAmount, 3900);
      assert.strictEqual(estimate.totals.profitAmount, 11232);
      assert.strictEqual(estimate.totals.finalBidAmount, 73632);

      // Verify factored system sum equals final bid amount exactly
      const sysSum = estimate.bySystem.reduce((sum, s) => sum + s.factoredBid, 0);
      assert.strictEqual(Math.round(sysSum * 100) / 100, 73632);
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

  describe('US-045: Labor Role Hierarchy, Crew Rankings & Blended Crew Rates', () => {
    it('initializes default labor roles with correct hourly and daily rates', () => {
      const normalized = getNormalizedLaborRates();
      assert.ok(Array.isArray(normalized.laborRoles));
      assert.strictEqual(normalized.laborRoles.length, 5);

      const foreman = normalized.laborRoles.find((r) => r.id === 'foreman');
      assert.strictEqual(foreman.hourlyRate, 95.0);
      assert.strictEqual(foreman.dailyRate, 760.0);

      const journeyman = normalized.laborRoles.find((r) => r.id === 'journeyman');
      assert.strictEqual(journeyman.hourlyRate, 75.0);
      assert.strictEqual(journeyman.dailyRate, 600.0);

      const apprentice = normalized.laborRoles.find((r) => r.id === 'apprentice');
      assert.strictEqual(apprentice.hourlyRate, 45.0);
      assert.strictEqual(apprentice.dailyRate, 360.0);
    });

    it('resolves item effective labor rate based on assigned laborRoleId vs default project rate', () => {
      const rates = {
        laborHourlyRate: 65.0,
        laborRoles: DEFAULT_LABOR_ROLES,
      };

      // Item with Foreman role
      const foremanItem = { laborRoleId: 'foreman', quantity: 10, laborHoursPerUnit: 2 };
      const foremanRate = getItemEffectiveLaborRate(foremanItem, rates);
      assert.strictEqual(foremanRate.hourlyRate, 95.0);
      assert.strictEqual(foremanRate.roleId, 'foreman');

      // Item without role assigned falls back to project base rate
      const defaultItem = { quantity: 10, laborHoursPerUnit: 2 };
      const defaultRate = getItemEffectiveLaborRate(defaultItem, rates);
      assert.strictEqual(defaultRate.hourlyRate, 65.0);
      assert.strictEqual(defaultRate.roleId, null);
    });

    it('computes line-item cost with role rate overrides', () => {
      const rates = {
        laborHourlyRate: 60.0,
        laborRoles: [
          { id: 'master', title: 'Master Plumber', hourlyRate: 110.0, dailyRate: 880.0 },
          { id: 'helper', title: 'Helper', hourlyRate: 40.0, dailyRate: 320.0 },
        ],
      };

      // Item A: 10 qty * 2 hrs/unit = 20 hrs @ $110/hr (Master) = $2,200
      const itemA = { quantity: 10, laborHoursPerUnit: 2, laborRoleId: 'master' };
      const costA = computeItemCost(itemA, rates);
      assert.strictEqual(costA.laborHours, 20);
      assert.strictEqual(costA.laborCost, 2200);
      assert.strictEqual(costA.laborRoleId, 'master');

      // Item B: 10 qty * 2 hrs/unit = 20 hrs @ $40/hr (Helper) = $800
      const itemB = { quantity: 10, laborHoursPerUnit: 2, laborRoleId: 'helper' };
      const costB = computeItemCost(itemB, rates);
      assert.strictEqual(costB.laborHours, 20);
      assert.strictEqual(costB.laborCost, 800);
      assert.strictEqual(costB.laborRoleId, 'helper');

      // Item C: Default base rate: 10 qty * 2 hrs/unit = 20 hrs @ $60/hr = $1,200
      const itemC = { quantity: 10, laborHoursPerUnit: 2 };
      const costC = computeItemCost(itemC, rates);
      assert.strictEqual(costC.laborHours, 20);
      assert.strictEqual(costC.laborCost, 1200);
      assert.strictEqual(costC.laborRoleId, null);
    });

    it('calculates blended crew rates accurately for standard crew configurations', () => {
      // Crew: 1 Foreman ($95) + 2 Journeymen ($75 each) + 1 Helper ($45)
      // Total cost/hr = 95 + (2 * 75) + 45 = 95 + 150 + 45 = $290/hr
      // Total members = 4
      // Blended hourly rate = 290 / 4 = $72.50/hr
      const crewComp = [
        { roleId: 'foreman', count: 1 },
        { roleId: 'journeyman', count: 2 },
        { roleId: 'apprentice', count: 1 },
      ];

      const blended = calculateBlendedCrewRate(crewComp, DEFAULT_LABOR_ROLES);
      assert.strictEqual(blended.totalCrewMembers, 4);
      assert.strictEqual(blended.totalCrewCostPerHour, 290.0);
      assert.strictEqual(blended.blendedHourlyRate, 72.5);
    });

    it('aggregates labor cost and hours breakdown by role in computeEstimate totals', () => {
      const items = [
        { id: '1', system: 'Plumbing', quantity: 10, laborHoursPerUnit: 5, laborRoleId: 'foreman', materialCostPerUnit: 50 },
        { id: '2', system: 'Plumbing', quantity: 20, laborHoursPerUnit: 3, laborRoleId: 'apprentice', materialCostPerUnit: 20 },
        { id: '3', system: 'Plumbing', quantity: 5, laborHoursPerUnit: 4, materialCostPerUnit: 10 },
      ];

      const rates = {
        laborHourlyRate: 65.0,
        laborRoles: DEFAULT_LABOR_ROLES,
        overheadPct: 0,
        contingencyPct: 0,
        profitPct: 0,
        equipmentLumpSum: 0,
        miscCost: 0,
      };

      // Item 1: 50 hrs @ $95 = $4,750
      // Item 2: 60 hrs @ $45 = $2,700
      // Item 3: 20 hrs @ $65 = $1,300
      // Total Labor: 130 hrs, $8,750 cost
      const estimate = computeEstimate(items, rates);
      assert.strictEqual(estimate.totals.totalLaborHours, 130);
      assert.strictEqual(estimate.totals.totalLaborCost, 8750);

      const roleBreakdown = estimate.totals.laborByRole;
      assert.ok(Array.isArray(roleBreakdown));

      const foremanTotal = roleBreakdown.find((r) => r.roleId === 'foreman');
      assert.strictEqual(foremanTotal.laborHours, 50);
      assert.strictEqual(foremanTotal.laborCost, 4750);

      const apprenticeTotal = roleBreakdown.find((r) => r.roleId === 'apprentice');
      assert.strictEqual(apprenticeTotal.laborHours, 60);
      assert.strictEqual(apprenticeTotal.laborCost, 2700);

      const baseTotal = roleBreakdown.find((r) => r.roleId === 'base');
      assert.strictEqual(baseTotal.laborHours, 20);
      assert.strictEqual(baseTotal.laborCost, 1300);
    });
  });

  describe('US-046: Equipment Rental Rates, Duration Tracking & Dedicated Equipment Line Items', () => {
    it('calculates equipment rental cost accurately across days, weeks, and months with delivery & fuel surcharges', () => {
      // 2 Weeks CAT 305 rental @ $1,200/wk + $250 delivery fee + 5% fuel surcharge
      // Base rental: 2 * 1200 = 2400
      // Fuel surcharge: 2400 * 0.05 = 120
      // Total: 2400 + 250 + 120 = 2770
      const eqItem = {
        isEquipment: true,
        equipmentDurationQty: 2,
        equipmentDurationUnit: 'weeks',
        equipmentWeeklyRate: 1200,
        equipmentDeliveryFee: 250,
        equipmentFuelSurchargePct: 5,
        includeDelivery: true,
      };

      const result = calculateEquipmentRentalCost(eqItem);
      assert.strictEqual(result.baseRentalCost, 2400);
      assert.strictEqual(result.deliveryFee, 250);
      assert.strictEqual(result.fuelSurchargeAmount, 120);
      assert.strictEqual(result.totalCost, 2770);
    });

    it('handles daily and monthly durations and respects delivery exclusion', () => {
      // 3 Days rental @ $350/day without delivery
      const dailyItem = {
        isEquipment: true,
        equipmentDurationQty: 3,
        equipmentDurationUnit: 'days',
        equipmentDailyRate: 350,
        equipmentDeliveryFee: 250,
        equipmentFuelSurchargePct: 0,
        includeDelivery: false,
      };
      const dailyResult = calculateEquipmentRentalCost(dailyItem);
      assert.strictEqual(dailyResult.baseRentalCost, 1050);
      assert.strictEqual(dailyResult.deliveryFee, 0);
      assert.strictEqual(dailyResult.totalCost, 1050);

      // 1 Month rental @ $3,600/mo + $200 delivery
      const monthlyItem = {
        isEquipment: true,
        equipmentDurationQty: 1,
        equipmentDurationUnit: 'months',
        equipmentMonthlyRate: 3600,
        equipmentDeliveryFee: 200,
        equipmentFuelSurchargePct: 0,
        includeDelivery: true,
      };
      const monthlyResult = calculateEquipmentRentalCost(monthlyItem);
      assert.strictEqual(monthlyResult.baseRentalCost, 3600);
      assert.strictEqual(monthlyResult.deliveryFee, 200);
      assert.strictEqual(monthlyResult.totalCost, 3800);
    });

    it('integrates equipment line items cleanly into computeEstimate rollup without material/labor double-counting', () => {
      const items = [
        {
          id: 'pipe-1',
          system: 'Sanitary Sewer',
          quantity: 100,
          unit: 'LF',
          materialCostPerUnit: 10,
          laborHoursPerUnit: 0.5,
        },
        {
          id: 'eq-1',
          system: 'Equipment & Mobilization',
          isEquipment: true,
          equipmentDurationQty: 1,
          equipmentDurationUnit: 'weeks',
          equipmentWeeklyRate: 1200,
          equipmentDeliveryFee: 250,
          equipmentFuelSurchargePct: 0,
          includeDelivery: true,
        },
      ];

      const rates = {
        laborHourlyRate: 60.0,
        overheadPct: 10,
        overheadType: 'percent',
        contingencyPct: 0,
        profitPct: 10,
        equipmentLumpSum: 0,
        miscCost: 0,
      };

      // Material: 100 * 10 = 1,000
      // Labor: 100 * 0.5 * 60 = 3,000
      // Equipment item: 1,200 + 250 = 1,450
      // Total direct cost = 1,000 + 3,000 + 1,450 = 5,450
      // Overhead (10% of 5450) = 545
      // Subtotal = 5995
      // Profit (10% of 5995) = 599.5
      // Final Bid = 6594.50

      const estimate = computeEstimate(items, rates);
      assert.strictEqual(estimate.totals.totalMaterialCost, 1000);
      assert.strictEqual(estimate.totals.totalLaborCost, 3000);
      assert.strictEqual(estimate.totals.totalEquipmentLineItemCost, 1450);
      assert.strictEqual(estimate.totals.totalDirectCost, 5450);
      assert.strictEqual(estimate.totals.overheadAmount, 545);
      assert.strictEqual(estimate.totals.profitAmount, 599.5);
      assert.strictEqual(estimate.totals.finalBidAmount, 6594.5);
    });

    it('persists and retains newly added equipment line items in memory across step transitions', () => {
      // Simulating user adding an equipment item on Step 2 (TakeoffGrid)
      const initialItems = [
        {
          id: 'item-1',
          system: 'Waterline',
          description: '8" C900 PVC Pipe',
          sizeSpec: '8 inch DR18',
          quantity: 500,
          unit: 'LF',
          avgDepthFt: 5,
          materialCostPerUnit: 25,
          laborHoursPerUnit: 0.2,
        },
      ];

      const newEquipmentItem = {
        id: 'eq-mini-excavator',
        system: 'Equipment & Mobilization',
        description: 'Mini-Excavator (3–5 Ton)',
        sizeSpec: '1 weeks rental + Delivery',
        quantity: 1,
        unit: 'WK',
        avgDepthFt: '',
        materialCostPerUnit: 0,
        laborHoursPerUnit: 0,
        laborUnitCost: 0,
        laborRoleId: null,
        isEquipment: true,
        equipmentDurationQty: 1,
        equipmentDurationUnit: 'weeks',
        equipmentDailyRate: 350,
        equipmentWeeklyRate: 1200,
        equipmentMonthlyRate: 3600,
        equipmentDeliveryFee: 250,
        equipmentFuelSurchargePct: 5, // 5% fuel surcharge on 1200 = 60
        includeDelivery: true,
        equipmentCost: 1510, // 1200 + 250 + 60 = 1510
      };

      // Step 2 updates state
      const updatedItems = [...initialItems, newEquipmentItem];
      assert.strictEqual(updatedItems.length, 2);

      // Step 3 (ResultsStep) receives updatedItems and runs computeEstimate
      const step3Estimate = computeEstimate(updatedItems, DEFAULT_RATES);
      assert.strictEqual(step3Estimate.items.length, 2);

      const eqComputed = step3Estimate.items.find((it) => it.isEquipment);
      assert.ok(eqComputed, 'Equipment line item must be present in computed estimate');
      assert.strictEqual(eqComputed.directCost, 1510);
      assert.strictEqual(eqComputed.materialCost, 0);
      assert.strictEqual(eqComputed.laborCost, 0);
      assert.strictEqual(step3Estimate.totals.totalEquipmentLineItemCost, 1510);

      // Verify that bySystem grouping includes 'Equipment & Mobilization'
      const eqSystem = step3Estimate.bySystem.find((sys) => sys.system === 'Equipment & Mobilization');
      assert.ok(eqSystem, 'Equipment & Mobilization system group exists');
      assert.strictEqual(eqSystem.directCost, 1510);
      assert.strictEqual(eqSystem.items[0].description, 'Mini-Excavator (3–5 Ton)');

      // Simulating user navigating back to Step 2: array reference and items remain intact without stale reload
      const backToEditItems = updatedItems;
      assert.strictEqual(backToEditItems.length, 2);
      assert.strictEqual(backToEditItems[1].id, 'eq-mini-excavator');
      assert.strictEqual(backToEditItems[1].equipmentCost, 1510);
    });
  });
});
