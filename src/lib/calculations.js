// Core cost calculation engine for takeoff items and pricing rates.

export const DEFAULT_TRENCH_WIDTH_FT = 2;

export const DEFAULT_RATES = {
  laborHourlyRate: 65.0,
  overheadPct: 10,
  contingencyPct: 5,
  profitPct: 15,
  equipmentLumpSum: 12000.0,
  trenchWidthFt: DEFAULT_TRENCH_WIDTH_FT,
};

/**
 * Calculates the trench volume (cubic yards) for a takeoff item, if applicable.
 * Only meaningful for linear-foot items with an avg depth specified.
 */
export function trenchVolumeCubicYards(item, trenchWidthFt = DEFAULT_TRENCH_WIDTH_FT) {
  const qty = Number(item.quantity) || 0;
  const depth = Number(item.avgDepthFt) || 0;
  if (!depth || (item.unit || '').toUpperCase() !== 'LF') return 0;
  const cubicFeet = qty * depth * trenchWidthFt;
  return cubicFeet / 27; // cubic yards
}

/**
 * Computes the material and labor cost for a single takeoff item.
 */
export function computeItemCost(item, rates = DEFAULT_RATES) {
  const qty = Number(item.quantity) || 0;
  const materialUnitCost = Number(item.materialCostPerUnit) || 0;
  const laborHoursPerUnit = Number(item.laborHoursPerUnit) || 0;

  const materialCost = qty * materialUnitCost;
  const laborHours = qty * laborHoursPerUnit;
  const laborCost = laborHours * (Number(rates.laborHourlyRate) || 0);

  return {
    materialCost,
    laborHours,
    laborCost,
    directCost: materialCost + laborCost,
  };
}

/**
 * Aggregates the full estimate: per-item costs, per-system subtotals, and
 * overall totals including overhead, contingency, and profit markups.
 */
export function computeEstimate(items, rates = DEFAULT_RATES) {
  const trenchWidthFt = Number(rates.trenchWidthFt) || DEFAULT_TRENCH_WIDTH_FT;

  let totalMaterialCost = 0;
  let totalLaborHours = 0;
  let totalLaborCost = 0;
  let totalTrenchCubicYards = 0;

  const itemBreakdowns = items.map((item) => {
    const { materialCost, laborHours, laborCost, directCost } = computeItemCost(item, rates);
    const trenchCubicYards = trenchVolumeCubicYards(item, trenchWidthFt);

    totalMaterialCost += materialCost;
    totalLaborHours += laborHours;
    totalLaborCost += laborCost;
    totalTrenchCubicYards += trenchCubicYards;

    return {
      ...item,
      materialCost,
      laborHours,
      laborCost,
      directCost,
      trenchCubicYards,
    };
  });

  // Group by system for subtotals
  const bySystem = {};
  for (const item of itemBreakdowns) {
    const system = item.system || 'Uncategorized';
    if (!bySystem[system]) {
      bySystem[system] = {
        system,
        items: [],
        materialCost: 0,
        laborCost: 0,
        laborHours: 0,
        directCost: 0,
      };
    }
    bySystem[system].items.push(item);
    bySystem[system].materialCost += item.materialCost;
    bySystem[system].laborCost += item.laborCost;
    bySystem[system].laborHours += item.laborHours;
    bySystem[system].directCost += item.directCost;
  }

  const equipmentLumpSum = Number(rates.equipmentLumpSum) || 0;
  const totalDirectCost = totalMaterialCost + totalLaborCost + equipmentLumpSum;

  const overheadPct = Number(rates.overheadPct) || 0;
  const contingencyPct = Number(rates.contingencyPct) || 0;
  const profitPct = Number(rates.profitPct) || 0;

  const overheadAmount = totalDirectCost * (overheadPct / 100);
  const contingencyAmount = totalDirectCost * (contingencyPct / 100);
  const subtotalWithMarkups = totalDirectCost + overheadAmount + contingencyAmount;
  const profitAmount = subtotalWithMarkups * (profitPct / 100);
  const finalBidAmount = subtotalWithMarkups + profitAmount;

  // Compute factored / fully-burdened bid amount for each system and item
  // so client-facing proposals and contracts always sum up to finalBidAmount (100% balance).
  const rawItemsDirectSum = totalMaterialCost + totalLaborCost;
  const markupFactor = rawItemsDirectSum > 0 ? finalBidAmount / rawItemsDirectSum : (items.length > 0 ? 1 : 0);

  const bySystemFactored = Object.values(bySystem).map((sys) => {
    const sysFactoredBid = rawItemsDirectSum > 0
      ? (sys.directCost / rawItemsDirectSum) * finalBidAmount
      : (items.length > 0 ? finalBidAmount / Object.keys(bySystem).length : 0);

    const itemsFactored = sys.items.map((it) => {
      const itemFactoredPrice = rawItemsDirectSum > 0
        ? (it.directCost / rawItemsDirectSum) * finalBidAmount
        : (items.length > 0 ? finalBidAmount / items.length : 0);
      const unitPriceFactored = it.quantity > 0 ? itemFactoredPrice / it.quantity : 0;
      return {
        ...it,
        factoredPrice: itemFactoredPrice,
        unitPriceFactored,
      };
    });

    return {
      ...sys,
      factoredBid: sysFactoredBid,
      items: itemsFactored,
    };
  });

  return {
    items: itemBreakdowns,
    bySystem: bySystemFactored.sort((a, b) => a.system.localeCompare(b.system)),
    totals: {
      totalMaterialCost,
      totalLaborHours,
      totalLaborCost,
      totalTrenchCubicYards,
      equipmentLumpSum,
      totalDirectCost,
      overheadPct,
      overheadAmount,
      overheadCost: overheadAmount,
      contingencyPct,
      contingencyAmount,
      contingencyCost: contingencyAmount,
      profitPct,
      profitAmount,
      finalBidAmount,
      markupFactor,
    },
  };
}

export function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value, decimals = 2) {
  return (Number(value) || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
