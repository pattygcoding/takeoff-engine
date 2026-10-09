/**
 * CSV / Takeoff Ingestion & Parser Constants
 */

export const CSV_COLUMNS = [
  'system',
  'item_description',
  'size_spec',
  'quantity',
  'unit',
  'avg_depth_ft',
  'material_cost_per_unit',
  'labor_hours_per_unit',
  'labor_unit_cost',
  'associated_scope',
  'equipment_ownership',
  'equipment_operator_included',
  'equipment_damage_waiver_pct',
  'equipment_minimum_rental_days',
  'equipment_standby_days',
  'equipment_standby_rate_pct',
  'equipment_production_rate_qty_day',
  'equipment_contingency_days',
];

export const TARGET_FIELDS = [
  { key: 'system', label: 'System / Trade', required: true, description: 'Category, Trade, Division, or Phase group' },
  { key: 'item_description', label: 'Item / Description', required: true, description: 'Material name, scope description, or line item' },
  { key: 'size_spec', label: 'Size / Spec', required: false, description: 'Pipe diameter, material class, or dimension spec' },
  { key: 'quantity', label: 'Quantity', required: true, description: 'Length (LF), count (EA), area (SF), or volume (CY)' },
  { key: 'unit', label: 'Unit of Measure', required: true, description: 'LF, EA, CY, SF, TON, LS, etc.' },
  { key: 'avg_depth_ft', label: 'Avg Trench Depth (FT)', required: false, description: 'Optional depth for trench earthwork & backfill math' },
  { key: 'material_cost_per_unit', label: 'Material $/Unit', required: false, description: 'Unit material price or cost per unit' },
  { key: 'labor_hours_per_unit', label: 'Labor Hrs/Unit', required: false, description: 'Crew productivity hours per unit (e.g. 0.25 hrs/LF)' },
  { key: 'labor_unit_cost', label: 'Labor $/Unit', required: false, description: 'Labor dollar rate per unit (e.g. $15.50/LF)' },
  { key: 'associated_scope', label: 'Associated Scope', required: false, description: 'System or takeoff line item the equipment directly supports' },
  { key: 'equipment_ownership', label: 'Equipment Ownership', required: false, description: 'rented or company-owned' },
  { key: 'equipment_operator_included', label: 'Operator Included', required: false, description: 'Yes or No; blends operator labor into equipment assignment' },
  { key: 'equipment_damage_waiver_pct', label: 'Damage Waiver %', required: false, description: 'Optional rental damage waiver percentage' },
  { key: 'equipment_minimum_rental_days', label: 'Minimum Rental Days', required: false, description: 'Floor for the billable rental duration' },
  { key: 'equipment_standby_days', label: 'Standby Days', required: false, description: 'Idle days at reduced standby billing rate' },
  { key: 'equipment_standby_rate_pct', label: 'Standby Rate %', required: false, description: 'Percentage of base daily rate used for standby days' },
  { key: 'equipment_production_rate_qty_day', label: 'Production Rate (Qty/Day)', required: false, description: 'Suggested quantity output per day for duration calculation' },
  { key: 'equipment_contingency_days', label: 'Contingency Days', required: false, description: 'Additional weather or delay buffer for the schedule' },
];

export const COLUMN_ALIASES = {
  system: ['system', 'systems', 'trade', 'trades', 'division', 'category', 'csi'],
  item_description: ['item', 'item description', 'description', 'scope', 'material'],
  size_spec: ['size', 'spec', 'size/spec', 'dimension'],
  quantity: ['quantity', 'qty', 'count', 'amount', 'est qty'],
  unit: ['unit', 'uom', 'unit of measure'],
  avg_depth_ft: ['avg depth', 'avg depth (ft)', 'depth', 'trench depth'],
  material_cost_per_unit: ['material cost', 'material $/unit', 'mat cost', 'material rate'],
  labor_hours_per_unit: ['labor hours', 'labor hrs/unit', 'labor hours/unit', 'hrs/unit'],
  labor_unit_cost: ['labor cost', 'labor $/unit', 'labor cost/unit', 'labor rate'],
  associated_scope: ['associated scope', 'scope reference', 'linked system', 'scope'],
  equipment_ownership: ['equipment ownership', 'ownership', 'owned vs rented'],
  equipment_operator_included: ['operator included', 'operator in rental', 'includes operator'],
  equipment_damage_waiver_pct: ['damage waiver %', 'waiver pct', 'waiver %'],
  equipment_minimum_rental_days: ['minimum rental days', 'min rental days'],
  equipment_standby_days: ['standby days', 'idle days'],
  equipment_standby_rate_pct: ['standby rate %', 'idle rate %'],
  equipment_production_rate_qty_day: ['production rate', 'qty per day', 'production qty/day'],
  equipment_contingency_days: ['contingency days', 'weather days'],
};

export const IGNORED_INDEX_HEADER_ALIASES = ['item #', 'item no', 'pos', '#', 'line #', 'no.'];

/**
 * Standard MasterFormat CSI Division Lookup Table
 */
export const CSI_DIVISIONS = {
  '01': 'General Requirements',
  '02': 'Existing Conditions',
  '03': 'Concrete',
  '04': 'Masonry',
  '05': 'Metals',
  '06': 'Wood, Plastics & Composites',
  '07': 'Thermal & Moisture Protection',
  '08': 'Openings',
  '09': 'Finishes',
  '10': 'Specialties',
  '11': 'Equipment',
  '12': 'Furnishings',
  '13': 'Special Construction',
  '14': 'Conveying Equipment',
  '21': 'Fire Suppression',
  '22': 'Plumbing',
  '23': 'HVAC',
  '25': 'Integrated Automation',
  '26': 'Electrical',
  '27': 'Communications',
  '28': 'Electronic Safety & Security',
  '31': 'Earthwork',
  '32': 'Exterior Improvements',
  '33': 'Utilities',
  '34': 'Transportation',
  '35': 'Waterway & Marine',
  '40': 'Process Interconnections',
  '41': 'Material Processing',
  '42': 'Process Heating/Cooling',
  '43': 'Process Gas/Liquid Handling',
  '44': 'Pollution Control',
  '45': 'Industry-Specific Manufacturing',
  '48': 'Electrical Power Generation',
};

/**
 * Standard Unit Normalization Table
 */
export const UNIT_NORMALIZATIONS = {
  // Linear Feet / Length
  lf: 'LF', 'l.f.': 'LF', 'l.f': 'LF', 'lin ft': 'LF', 'lin. ft.': 'LF', 'lin. ft': 'LF', 'lin ft.': 'LF',
  'linear feet': 'LF', 'linear foot': 'LF', ft: 'LF', 'ft.': 'LF', feet: 'LF', lft: 'LF', 'lft.': 'LF',
  ml: 'LF', meter: 'LF', meters: 'LF', m: 'LF', lm: 'LF', 'lin m': 'LF', 'linear meter': 'LF', 'linear meters': 'LF',

  // Each / Item / Count
  ea: 'EA', 'e.a.': 'EA', 'e.a': 'EA', each: 'EA', pcs: 'EA', 'pcs.': 'EA', piece: 'EA', pieces: 'EA',
  item: 'EA', items: 'EA', count: 'EA', un: 'EA', und: 'EA', unit: 'EA', units: 'EA',
  nr: 'EA', no: 'EA', 'no.': 'EA', pza: 'EA', pzas: 'EA',

  // Cubic Yards / Volume
  cy: 'CY', 'c.y.': 'CY', 'c.y': 'CY', 'cu yd': 'CY', 'cu. yd.': 'CY', 'cu. yd': 'CY', 'cu yd.': 'CY',
  'cu yds': 'CY', 'cu. yds.': 'CY', 'cu. yds': 'CY', 'cu yds.': 'CY',
  'cubic yards': 'CY', 'cubic yard': 'CY', yds3: 'CY', yd3: 'CY', m3: 'CY', 'm³': 'CY', 'cu m': 'CY', 'cu. m': 'CY', 'cu. m.': 'CY',
  'cubic meters': 'CY', 'cubic meter': 'CY',

  // Square Feet / Area
  sf: 'SF', 's.f.': 'SF', 's.f': 'SF', 'sq ft': 'SF', 'sq. ft.': 'SF', 'sq. ft': 'SF', 'sq ft.': 'SF',
  'sq feet': 'SF', 'square feet': 'SF', 'square foot': 'SF', ft2: 'SF', 'ft²': 'SF', sqft: 'SF', 'sq.ft.': 'SF', 'sq.ft': 'SF',
  m2: 'SF', 'm²': 'SF', 'sq m': 'SF', 'sq. m.': 'SF', 'sq. m': 'SF', 'square meter': 'SF', 'square meters': 'SF',
  area: 'SF',

  // Square Yards
  sy: 'SY', 's.y.': 'SY', 's.y': 'SY', 'sq yd': 'SY', 'sq. yd.': 'SY', 'sq. yd': 'SY', 'sq yd.': 'SY',
  'sq yds': 'SY', 'sq. yds.': 'SY', 'sq. yds': 'SY', 'sq yds.': 'SY',
  'square yards': 'SY', 'square yard': 'SY', yd2: 'SY', 'yd²': 'SY', sqyd: 'SY',

  // Tons / Weight
  tn: 'TON', 't.n.': 'TON', 't.n': 'TON', ton: 'TON', tons: 'TON', 'tn.': 'TON', tonne: 'TON', tonnes: 'TON',
  to: 'TON', t: 'TON',

  // Lump Sum / Global
  ls: 'LS', 'l.s.': 'LS', 'l.s': 'LS', lump: 'LS', 'lump sum': 'LS', gl: 'LS', global: 'LS',
  sum: 'LS', lot: 'LS', set: 'LS',

  // Hours / Labor Time
  hr: 'HR', 'hr.': 'HR', hrs: 'HR', 'hrs.': 'HR', hour: 'HR', hours: 'HR', h: 'HR', mh: 'HR', 'man hours': 'HR', 'man-hours': 'HR',
};

export const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.xlsb'];

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB limit
export const MAX_FILE_SIZE_LABEL = '15 MB';

export const PRESETS_STORAGE_KEY = 'takeoff_engine_vendor_presets';

