// Core cost calculation engine for takeoff items and pricing rates.

export const DEFAULT_TRENCH_WIDTH_FT = 2;
export const DEFAULT_WORKDAY_HOURS = 8.0;

export const DEFAULT_LABOR_ROLES = [
  { id: 'foreman', title: 'Foreman / Supervisor', hourlyRate: 95.0, dailyRate: 760.0 },
  { id: 'journeyman', title: 'Journeyman / Plumber', hourlyRate: 75.0, dailyRate: 600.0 },
  { id: 'apprentice', title: 'Apprentice / Helper', hourlyRate: 45.0, dailyRate: 360.0 },
  { id: 'operator', title: 'Equipment Operator', hourlyRate: 70.0, dailyRate: 560.0 },
  { id: 'laborer', title: 'General Laborer', hourlyRate: 35.0, dailyRate: 280.0 },
];

export const DEFAULT_RATES = {
  laborRateBasis: 'hourly', // 'hourly' | 'daily'
  laborHourlyRate: 65.0,
  laborDailyRate: 520.0,
  workdayHours: DEFAULT_WORKDAY_HOURS,
  laborMode: 'hours', // 'hours' | 'cost'
  laborRoles: DEFAULT_LABOR_ROLES,
  defaultLaborRoleId: 'journeyman',
  overheadPct: 10,
  overheadType: 'percent', // 'percent' | 'fixed'
  contingencyPct: 5,
  contingencyType: 'percent', // 'percent' | 'fixed'
  profitPct: 15,
  profitType: 'percent', // 'percent' | 'fixed'
  equipmentLumpSum: 12000.0,
  equipmentType: 'fixed', // 'fixed' | 'percent'
  miscCost: 0,
  miscItems: [], // [{ id: '1', title: 'Permits & Fees', amount: 500 }]
  miscType: 'fixed', // 'fixed' | 'percent'
  trenchWidthFt: DEFAULT_TRENCH_WIDTH_FT,
  scopeItems: [], // US-044: Scope Inclusions, Exclusions & Alternates
};

/**
 * Normalizes labor rate properties (hourly rate, daily rate, workday hours, and rate basis).
 * Handles backward compatibility when only laborHourlyRate or laborDailyRate is present.
 * Also synchronizes labor roles list with workday hours.
 */
export function getNormalizedLaborRates(rates = DEFAULT_RATES) {
  const workdayHours = Number(rates?.workdayHours) > 0 ? Number(rates.workdayHours) : DEFAULT_WORKDAY_HOURS;
  const basis = rates?.laborRateBasis === 'daily' ? 'daily' : 'hourly';

  let hourly = Number(rates?.laborHourlyRate);
  let daily = Number(rates?.laborDailyRate);

  if (basis === 'daily') {
    if (!Number.isFinite(daily) || daily <= 0) {
      daily = (Number.isFinite(hourly) && hourly > 0) ? hourly * workdayHours : 520.0;
    }
    hourly = workdayHours > 0 ? daily / workdayHours : 0;
  } else {
    if (!Number.isFinite(hourly) || hourly <= 0) {
      hourly = (Number.isFinite(daily) && daily > 0) ? daily / workdayHours : 65.0;
    }
    daily = hourly * workdayHours;
  }

  const rawRoles = Array.isArray(rates?.laborRoles) && rates.laborRoles.length > 0
    ? rates.laborRoles
    : DEFAULT_LABOR_ROLES;

  const normalizedRoles = rawRoles.map((role) => {
    let rHourly = Number(role.hourlyRate);
    let rDaily = Number(role.dailyRate);

    if (basis === 'daily') {
      if (!Number.isFinite(rDaily) || rDaily <= 0) {
        rDaily = (Number.isFinite(rHourly) && rHourly > 0) ? rHourly * workdayHours : 600.0;
      }
      rHourly = workdayHours > 0 ? rDaily / workdayHours : 0;
    } else {
      if (!Number.isFinite(rHourly) || rHourly <= 0) {
        rHourly = (Number.isFinite(rDaily) && rDaily > 0) ? rDaily / workdayHours : 75.0;
      }
      rDaily = rHourly * workdayHours;
    }

    return {
      id: role.id || `role-${Math.random().toString(36).substr(2, 9)}`,
      title: role.title || 'Standard Role',
      hourlyRate: Math.round(rHourly * 100) / 100,
      dailyRate: Math.round(rDaily * 100) / 100,
    };
  });

  return {
    laborRateBasis: basis,
    workdayHours,
    laborHourlyRate: Math.round(hourly * 100) / 100,
    laborDailyRate: Math.round(daily * 100) / 100,
    laborRoles: normalizedRoles,
    defaultLaborRoleId: rates?.defaultLaborRoleId || 'journeyman',
  };
}

/**
 * Resolves the effective hourly labor rate for a specific takeoff item.
 * If the item specifies a laborRoleId, resolves against rates.laborRoles.
 * Otherwise, falls back to rates.laborHourlyRate (or the base normalized rate).
 */
export function getItemEffectiveLaborRate(item, rates = DEFAULT_RATES) {
  const normalized = getNormalizedLaborRates(rates);
  const roleId = item?.laborRoleId;
  if (roleId) {
    const matchedRole = normalized.laborRoles.find((r) => r.id === roleId);
    if (matchedRole && Number.isFinite(matchedRole.hourlyRate) && matchedRole.hourlyRate > 0) {
      return {
        hourlyRate: matchedRole.hourlyRate,
        dailyRate: matchedRole.dailyRate,
        roleId: matchedRole.id,
        roleTitle: matchedRole.title,
      };
    }
  }
  return {
    hourlyRate: normalized.laborHourlyRate,
    dailyRate: normalized.laborDailyRate,
    roleId: null,
    roleTitle: 'Project Base Rate',
  };
}

/**
 * Calculates a composite / blended crew rate given a crew composition.
 * crewComposition: array of { roleId, count } or { title, hourlyRate, count }
 */
export function calculateBlendedCrewRate(crewComposition = [], laborRoles = DEFAULT_LABOR_ROLES) {
  if (!Array.isArray(crewComposition) || crewComposition.length === 0) {
    return {
      totalCrewMembers: 0,
      blendedHourlyRate: 0,
      totalCrewCostPerHour: 0,
    };
  }

  let totalMembers = 0;
  let totalCostPerHour = 0;

  for (const member of crewComposition) {
    const count = Number(member.count) || 0;
    if (count <= 0) continue;

    let rate = Number(member.hourlyRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      const matched = laborRoles.find((r) => r.id === member.roleId);
      rate = matched ? Number(matched.hourlyRate) || 0 : 0;
    }

    totalMembers += count;
    totalCostPerHour += count * rate;
  }

  const blendedHourlyRate = totalMembers > 0 ? Math.round((totalCostPerHour / totalMembers) * 100) / 100 : 0;

  return {
    totalCrewMembers: totalMembers,
    blendedHourlyRate,
    totalCrewCostPerHour: Math.round(totalCostPerHour * 100) / 100,
  };
}

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
 * If item.laborRoleId is present, resolves against rates.laborRoles.
 */
export function computeItemCost(item, rates = DEFAULT_RATES) {
  const qty = Number(item.quantity) || 0;
  const materialUnitCost = Number(item.materialCostPerUnit) || 0;
  const isLaborCostMode = rates.laborMode === 'cost';
  const effectiveLabor = getItemEffectiveLaborRate(item, rates);
  const effectiveHourlyRate = effectiveLabor.hourlyRate;

  const materialCost = qty * materialUnitCost;
  let laborHours = 0;
  let laborCost = 0;

  if (isLaborCostMode) {
    const laborUnitCost = Number(item.laborUnitCost) || 0;
    laborCost = qty * laborUnitCost;
    // Retain or derive hours for crew scheduling metrics if hourly rate is present
    laborHours = Number(item.laborHoursPerUnit) || (effectiveHourlyRate > 0 ? (laborCost / effectiveHourlyRate) : 0);
  } else {
    const laborHoursPerUnit = Number(item.laborHoursPerUnit) || 0;
    laborHours = qty * laborHoursPerUnit;
    laborCost = laborHours * effectiveHourlyRate;
  }

  return {
    materialCost,
    laborHours,
    laborCost,
    directCost: materialCost + laborCost,
    laborRoleId: effectiveLabor.roleId,
    laborRoleTitle: effectiveLabor.roleTitle,
    effectiveHourlyRate,
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

  // Rollup labor breakdown by role
  const laborByRole = {};
  for (const item of itemBreakdowns) {
    const roleKey = item.laborRoleId || 'base';
    const roleTitle = item.laborRoleTitle || 'Project Base Rate';
    if (!laborByRole[roleKey]) {
      laborByRole[roleKey] = {
        roleId: roleKey,
        roleTitle,
        laborHours: 0,
        laborCost: 0,
      };
    }
    laborByRole[roleKey].laborHours += item.laborHours;
    laborByRole[roleKey].laborCost += item.laborCost;
  }

  const equipmentType = rates.equipmentType || 'fixed';
  const rawEquipmentValue = Number(rates.equipmentLumpSum ?? rates.equipmentValue ?? rates.equipmentCost) || 0;
  const rawDirectItems = totalMaterialCost + totalLaborCost;
  const equipmentLumpSum = equipmentType === 'percent'
    ? rawDirectItems * (rawEquipmentValue / 100)
    : rawEquipmentValue;

  const miscType = rates.miscType || 'fixed';
  const miscItems = Array.isArray(rates.miscItems) ? rates.miscItems : [];
  const itemizedMiscTotal = miscItems.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  const rawMiscValue = miscItems.length > 0
    ? itemizedMiscTotal
    : (Number(rates.miscCost ?? rates.miscValue ?? rates.miscLumpSum ?? rates.miscAmount) || 0);

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
      laborByRole: Object.values(laborByRole),
      totalTrenchCubicYards,
      equipmentLumpSum,
      equipmentCost: equipmentLumpSum,
      equipmentType,
      equipmentValue: rawEquipmentValue,
      miscCost,
      miscItems,
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
