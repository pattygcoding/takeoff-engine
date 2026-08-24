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
];

export const COLUMN_ALIASES = {
  system: [
    'system', 'trade', 'phase', 'division', 'category', 'discipline',
    'work_type', 'work type', 'system / trade', 'system/trade', 'utility',
    'utility_type', 'utility type', 'spec division', 'spec_division', 'group',
    'section', 'subsystem', 'cost code description', 'cost code', 'area',
    'classification', 'layer', 'markuptype', 'markup type', 'subject',
    'space', 'page label', 'sheet', 'drawing', 'zone', 'folder', 'tree',
    'surface', 'boundary', 'stratum', 'region', 'strata', 'stage',
    'csi', 'csi code', 'csi division', 'masterformat',
    'sistema', 'fase', 'categoria', 'rubro'
  ],
  item_description: [
    'item_description', 'item description', 'description', 'item', 'name',
    'item_name', 'item name', 'scope', 'detail', 'work detail', 'work_detail',
    'scope description', 'scope_description', 'material_description', 'material description',
    'line item', 'line_item', 'activity', 'takeoff item', 'takeoff_item',
    'material name', 'material_name', 'spec item', 'label', 'comments', 'comment',
    'measurement', 'markup', 'markups', 'markups list', 'tool', 'tool name',
    'part description', 'task', 'component', 'material / assembly', 'assembly',
    'item title', 'surface name', 'material surface', 'cut/fill', 'feature',
    'descripcion', 'concepto'
  ],
  size_spec: [
    'size_spec', 'size / spec', 'size spec', 'size', 'spec', 'specification',
    'dimension', 'dimensions', 'material', 'material class', 'class',
    'size / specification', 'pipe size', 'pipe_size', 'diameter', 'dia',
    'thickness', 'rating', 'type', 'custom 1', 'custom 2', 'custom field',
    'spec / size', 'size & spec', 'schedule', 'strata type', 'material type',
    'compaction', 'expansion', 'shrink/swell', 'subgrade', 'medida', 'especificacion', 'calibre',
    'pipe diameter'
  ],
  quantity: [
    'quantity', 'qty', 'quant', 'amount', 'count', 'length', 'takeoff_qty',
    'takeoff qty', 'takeoff quantity', 'total qty', 'total quantity', 'qty.',
    'volume', 'footage', 'linear feet', 'cant', 'cantidad', 'est qty',
    'estimated qty', 'net qty', 'gross qty', 'units', 'medicion', 'total length',
    'measurement value', 'markup value', 'total', 'net volume', 'cut volume',
    'fill volume', 'adjusted volume', 'raw qty', 'net area', 'takeoff value'
  ],
  unit: [
    'unit', 'uom', 'unit_of_measure', 'unit of measure', 'unit of measurement',
    'measure', 'units', 'unit type', 'measurement unit', 'markup unit',
    'qty unit', 'volume unit', 'area unit',
    'unidad', 'medida', 'u.m.', 'um', 'unidades'
  ],
  avg_depth_ft: [
    'avg_depth_ft', 'avg depth (ft)', 'average depth (ft)', 'avg depth',
    'average depth', 'depth', 'trench_depth', 'trench depth', 'trench_depth_ft',
    'cut_depth', 'cut depth', 'avg. depth', 'depth (ft)', 'depth_ft',
    'avg cut', 'average cut', 'avg cut (ft)', 'avg fill (ft)', 'avg depth/cut',
    'profundidad', 'cut (ft)', 'trench depth (ft)', 'invert depth', 'cover depth'
  ],
  material_cost_per_unit: [
    'material_cost_per_unit', 'material cost per unit', 'material cost/unit', 'material $/unit',
    'mat $/unit', 'mat $/uom', 'material unit cost', 'material rate', 'unit cost', 'unit price',
    'unit rate', 'mat unit cost', 'material cost', 'material price', 'mat cost', 'price/unit',
    'cost/unit', 'price / unit', 'cost / unit', 'material $/uom', 'precio unitario', 'costo unitario',
    'mat $/ea', 'mat $/lf', 'mat price', 'mat rate', 'unit $/mat', 'material $'
  ],
  labor_hours_per_unit: [
    'labor_hours_per_unit', 'labor hours per unit', 'labor hrs/unit', 'labor hrs / unit',
    'hours/unit', 'hours / unit', 'hrs/unit', 'hrs / unit', 'man hours', 'manhours',
    'man hours/unit', 'labor hours', 'labor hrs', 'hrs/lf', 'hrs/ea', 'hrs/cy', 'hrs/sf',
    'horas de trabajo', 'horas/unidad', 'heures de travail', 'horas de mao de obra'
  ],
  labor_unit_cost: [
    'labor_unit_cost', 'labor unit cost', 'labor $/unit', 'labor $/uom', 'labor cost/unit',
    'labor cost per unit', 'labor rate', 'labor unit price', 'labor price/unit', 'labor cost',
    'labor price', 'labor $', 'labor $/ea', 'labor $/lf', 'labor $/sf', 'labor $/cy',
    'costo de mano de obra', 'precio mano de obra', 'cout de main d oeuvre'
  ],
};

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

export const PRESETS_STORAGE_KEY = 'takeoff_engine_vendor_presets';
