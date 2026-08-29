/**
 * Calculation Constants & Default Rates (Frontend Mirror)
 */

export const DEFAULT_TRENCH_WIDTH_FT = 2;
export const DEFAULT_WORKDAY_HOURS = 8.0;

export const DEFAULT_LABOR_ROLES = [
  { id: 'foreman', title: 'Foreman / Supervisor', hourlyRate: 95.0, dailyRate: 760.0 },
  { id: 'journeyman', title: 'Journeyman / Plumber', hourlyRate: 75.0, dailyRate: 600.0 },
  { id: 'apprentice', title: 'Apprentice / Helper', hourlyRate: 45.0, dailyRate: 360.0 },
  { id: 'operator', title: 'Equipment Operator', hourlyRate: 70.0, dailyRate: 560.0 },
  { id: 'laborer', title: 'General Laborer', hourlyRate: 35.0, dailyRate: 280.0 },
];

export const DEFAULT_EQUIPMENT_CATALOG = [
  { id: 'mini-excavator', title: 'Mini-Excavator (3–5 Ton)', dailyRate: 350.0, weeklyRate: 1200.0, monthlyRate: 3600.0, deliveryFee: 250.0, fuelSurchargePct: 5 },
  { id: 'backhoe', title: 'Backhoe Loader', dailyRate: 450.0, weeklyRate: 1550.0, monthlyRate: 4650.0, deliveryFee: 300.0, fuelSurchargePct: 5 },
  { id: 'skid-steer', title: 'Skid Steer / Track Loader', dailyRate: 300.0, weeklyRate: 1050.0, monthlyRate: 3150.0, deliveryFee: 200.0, fuelSurchargePct: 5 },
  { id: 'trench-box', title: 'Trench Shoring Box & Shield', dailyRate: 150.0, weeklyRate: 500.0, monthlyRate: 1500.0, deliveryFee: 200.0, fuelSurchargePct: 0 },
  { id: 'plate-compactor', title: 'Tamping Rammer / Plate Compactor', dailyRate: 95.0, weeklyRate: 325.0, monthlyRate: 975.0, deliveryFee: 75.0, fuelSurchargePct: 0 },
  { id: 'propress-threader', title: 'Pipe Threader / ProPress Tool', dailyRate: 120.0, weeklyRate: 400.0, monthlyRate: 1200.0, deliveryFee: 50.0, fuelSurchargePct: 0 },
  { id: 'generator-lights', title: 'Generator & Light Tower', dailyRate: 140.0, weeklyRate: 480.0, monthlyRate: 1440.0, deliveryFee: 100.0, fuelSurchargePct: 5 },
  { id: 'scissor-lift', title: 'Scissor / Boom Lift', dailyRate: 220.0, weeklyRate: 750.0, monthlyRate: 2250.0, deliveryFee: 175.0, fuelSurchargePct: 0 },
];

export const DEFAULT_RATES = {
  laborRateBasis: 'hourly',
  laborHourlyRate: 65.0,
  laborDailyRate: 520.0,
  workdayHours: DEFAULT_WORKDAY_HOURS,
  laborMode: 'hours',
  laborRoles: DEFAULT_LABOR_ROLES,
  defaultLaborRoleId: 'journeyman',
  equipmentCatalog: DEFAULT_EQUIPMENT_CATALOG,
  overheadPct: 10,
  overheadType: 'percent',
  contingencyPct: 5,
  contingencyType: 'percent',
  profitPct: 15,
  profitType: 'percent',
  equipmentLumpSum: 12000.0,
  equipmentType: 'fixed',
  miscCost: 0,
  miscItems: [],
  miscType: 'fixed',
  trenchWidthFt: DEFAULT_TRENCH_WIDTH_FT,
  scopeItems: [],
};
