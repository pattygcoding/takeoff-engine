// Core cost calculation engine for takeoff items and pricing rates.

export const DEFAULT_TRENCH_WIDTH_FT = 2;

export const DEFAULT_RATES = {
  laborHourlyRate: 65.0,
  laborMode: 'hours', // 'hours' | 'cost'
  overheadPct: 10,
  overheadType: 'percent', // 'percent' | 'fixed'
  contingencyPct: 5,
  contingencyType: 'percent', // 'percent' | 'fixed'
  profitPct: 15,
  profitType: 'percent', // 'percent' | 'fixed'
  equipmentLumpSum: 12000.0,
  equipmentType: 'fixed', // 'fixed' | 'percent'
  miscCost: 0,
  miscType: 'fixed', // 'fixed' | 'percent'
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
 * If rates.laborMode === 'cost', labor is computed directly from item.laborUnitCost * quantity
 * without factoring in rates.laborHourlyRate.
 */
export function computeItemCost(item, rates = DEFAULT_RATES) {
  const qty = Number(item.quantity) || 0;
  const materialUnitCost = Number(item.materialCostPerUnit) || 0;
  const isLaborCostMode = rates.laborMode === 'cost';

  const materialCost = qty * materialUnitCost;
  let laborHours = 0;
  let laborCost = 0;

  if (isLaborCostMode) {
    const laborUnitCost = Number(item.laborUnitCost) || 0;
    laborCost = qty * laborUnitCost;
    // Retain or derive hours for crew scheduling metrics if hourly rate is present
    const hourlyRate = Number(rates.laborHourlyRate) || 0;
    laborHours = Number(item.laborHoursPerUnit) || (hourlyRate > 0 ? (laborCost / hourlyRate) : 0);
  } else {
    const laborHoursPerUnit = Number(item.laborHoursPerUnit) || 0;
    laborHours = qty * laborHoursPerUnit;
    laborCost = laborHours * (Number(rates.laborHourlyRate) || 0);
  }

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

  const equipmentType = rates.equipmentType || 'fixed';
  const rawEquipmentValue = Number(rates.equipmentLumpSum ?? rates.equipmentValue ?? rates.equipmentCost) || 0;
  const rawDirectItems = totalMaterialCost + totalLaborCost;
  const equipmentLumpSum = equipmentType === 'percent'
    ? rawDirectItems * (rawEquipmentValue / 100)
    : rawEquipmentValue;

  const miscType = rates.miscType || 'fixed';
  const rawMiscValue = Number(rates.miscCost ?? rates.miscValue ?? rates.miscLumpSum ?? rates.miscAmount) || 0;
  const miscCost = miscType === 'percent'
    ? rawDirectItems * (rawMiscValue / 100)
    : rawMiscValue;

  const totalDirectCost = totalMaterialCost + totalLaborCost + equipmentLumpSum + miscCost;

  const overheadType = rates.overheadType || 'percent';
  const rawOverheadValue = Number(rates.overheadPct ?? rates.overheadValue ?? rates.overheadCost) || 0;
  const overheadAmount = overheadType === 'fixed'
    ? rawOverheadValue
    : totalDirectCost * (rawOverheadValue / 100);
  const overheadPct = overheadType === 'percent'
    ? rawOverheadValue
    : (totalDirectCost > 0 ? (overheadAmount / totalDirectCost) * 100 : 0);

  const contingencyType = rates.contingencyType || 'percent';
  const rawContingencyValue = Number(rates.contingencyPct ?? rates.contingencyValue ?? rates.contingencyCost) || 0;
  const contingencyAmount = contingencyType === 'fixed'
    ? rawContingencyValue
    : totalDirectCost * (rawContingencyValue / 100);
  const contingencyPct = contingencyType === 'percent'
    ? rawContingencyValue
    : (totalDirectCost > 0 ? (contingencyAmount / totalDirectCost) * 100 : 0);

  const subtotalWithMarkups = totalDirectCost + overheadAmount + contingencyAmount;

  const profitType = rates.profitType || 'percent';
  const rawProfitValue = Number(rates.profitPct ?? rates.profitValue ?? rates.profitAmount) || 0;
  const profitAmount = profitType === 'fixed'
    ? rawProfitValue
    : subtotalWithMarkups * (rawProfitValue / 100);
  const profitPct = profitType === 'percent'
    ? rawProfitValue
    : (subtotalWithMarkups > 0 ? (profitAmount / subtotalWithMarkups) * 100 : 0);

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
      materialCost: totalMaterialCost,
      totalLaborHours,
      laborHours: totalLaborHours,
      totalLaborCost,
      laborCost: totalLaborCost,
      totalTrenchCubicYards,
      equipmentLumpSum,
      equipmentCost: equipmentLumpSum,
      equipmentType,
      equipmentValue: rawEquipmentValue,
      miscCost,
      miscType,
      miscValue: rawMiscValue,
      totalDirectCost,
      directCost: totalDirectCost,
      overheadPct,
      overheadAmount,
      overheadCost: overheadAmount,
      overheadType,
      overheadValue: rawOverheadValue,
      contingencyPct,
      contingencyAmount,
      contingencyCost: contingencyAmount,
      contingencyType,
      contingencyValue: rawContingencyValue,
      profitPct,
      profitAmount,
      profitCost: profitAmount,
      profitType,
      profitValue: rawProfitValue,
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
