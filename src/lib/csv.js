import Papa from 'papaparse';

export const CSV_COLUMNS = [
  'system',
  'item_description',
  'size_spec',
  'quantity',
  'unit',
  'avg_depth_ft',
];

export const TARGET_FIELDS = [
  { key: 'system', label: 'System / Trade', required: true },
  { key: 'item_description', label: 'Item / Description', required: true },
  { key: 'size_spec', label: 'Size / Spec', required: true },
  { key: 'quantity', label: 'Quantity', required: true },
  { key: 'unit', label: 'Unit of Measure', required: true },
  { key: 'avg_depth_ft', label: 'Avg Trench Depth (FT)', required: false },
];

export const COLUMN_ALIASES = {
  system: [
    'system',
    'trade',
    'phase',
    'division',
    'category',
    'discipline',
    'work_type',
    'work type',
    'system / trade',
    'utility',
    'utility_type',
    'spec division',
  ],
  item_description: [
    'item_description',
    'item description',
    'description',
    'item',
    'name',
    'item_name',
    'item name',
    'scope',
    'detail',
    'work detail',
    'scope description',
    'scope_description',
    'material_description',
    'line item',
    'line_item',
    'activity',
  ],
  size_spec: [
    'size_spec',
    'size / spec',
    'size spec',
    'size',
    'spec',
    'specification',
    'dimension',
    'material',
    'class',
    'material class',
    'dimensions',
    'size / specification',
    'pipe size',
  ],
  quantity: [
    'quantity',
    'qty',
    'amount',
    'count',
    'length',
    'takeoff_qty',
    'takeoff qty',
    'takeoff quantity',
    'total qty',
    'qty.',
    'volume',
  ],
  unit: [
    'unit',
    'uom',
    'unit_of_measure',
    'unit of measure',
    'measure',
    'units',
    'unit type',
  ],
  avg_depth_ft: [
    'avg_depth_ft',
    'avg depth (ft)',
    'average depth (ft)',
    'avg depth',
    'average depth',
    'depth',
    'trench_depth',
    'trench depth',
    'trench_depth_ft',
    'cut_depth',
    'cut depth',
    'avg. depth',
    'depth (ft)',
    'depth_ft',
  ],
};

export const SAMPLE_CSV_ROWS = [
  { system: 'Sanitary', item_description: 'Pipe', size_spec: '6" PVC SDR-35', quantity: 275, unit: 'LF', avg_depth_ft: 4 },
  { system: 'Sanitary', item_description: 'Pipe', size_spec: '8" PVC SDR-35', quantity: 140, unit: 'LF', avg_depth_ft: 6 },
  { system: 'Sanitary', item_description: '45 Elbow', size_spec: '6" PVC', quantity: 6, unit: 'EA', avg_depth_ft: '' },
  { system: 'Sanitary', item_description: 'Cleanout', size_spec: '6" PVC', quantity: 4, unit: 'EA', avg_depth_ft: '' },
  { system: 'Sanitary', item_description: 'Manhole', size_spec: '48" Precast', quantity: 3, unit: 'EA', avg_depth_ft: '' },
  { system: 'Storm', item_description: 'Pipe', size_spec: '12" HDPE', quantity: 320, unit: 'LF', avg_depth_ft: 3 },
  { system: 'Storm', item_description: 'Pipe', size_spec: '18" RCP', quantity: 95, unit: 'LF', avg_depth_ft: 5 },
  { system: 'Storm', item_description: 'Catch Basin', size_spec: '24" x 24"', quantity: 5, unit: 'EA', avg_depth_ft: '' },
  { system: 'Storm', item_description: 'Flared End Section', size_spec: '18" RCP', quantity: 2, unit: 'EA', avg_depth_ft: '' },
  { system: 'Domestic Water', item_description: 'Pipe', size_spec: '6" C900', quantity: 410, unit: 'LF', avg_depth_ft: 3.5 },
  { system: 'Domestic Water', item_description: 'Gate Valve', size_spec: '6"', quantity: 3, unit: 'EA', avg_depth_ft: '' },
  { system: 'Domestic Water', item_description: 'Fire Hydrant Assembly', size_spec: 'Standard', quantity: 2, unit: 'EA', avg_depth_ft: '' },
  { system: 'Domestic Water', item_description: 'Tapping Sleeve & Valve', size_spec: '6" x 6"', quantity: 1, unit: 'EA', avg_depth_ft: '' },
];

/**
 * Builds a downloadable sample CSV template string.
 */
export function buildSampleCsv() {
  return Papa.unparse(SAMPLE_CSV_ROWS, { columns: CSV_COLUMNS });
}

export function downloadSampleCsv(filename = 'takeoff_sample_template.csv') {
  const csv = buildSampleCsv();
  triggerDownload(csv, filename, 'text/csv');
}

/**
 * Builds and downloads a sample Excel (.xlsx) template with the same data as the CSV template.
 */
export async function downloadSampleExcel(filename = 'takeoff_sample_template.xlsx') {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_CSV_ROWS, { header: CSV_COLUMNS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Takeoff');
  XLSX.writeFile(workbook, filename);
}

export function triggerDownload(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `item-${Date.now()}-${idCounter}`;
}

/**
 * Strips currency symbols ($ € £), commas, and spaces from a string to extract a clean number.
 */
export function cleanNumericValue(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[$€£,\s]/g, '').trim();
  if (cleaned === '') return NaN;
  return Number(cleaned);
}

/**
 * Detects mapping from raw spreadsheet column headers to standard target fields.
 * Returns: { mapping: { [targetKey]: rawColumnName }, unmappedRequired: string[] }
 */
export function autoDetectColumnMapping(headers) {
  const normalizedHeaders = headers.map((h) => ({
    raw: h,
    clean: h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  const mapping = {};
  const matchedRawCols = new Set();

  TARGET_FIELDS.forEach(({ key }) => {
    const aliases = COLUMN_ALIASES[key] || [key];
    const cleanAliases = aliases.map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // 1. Exact or cleaned alias match
    for (const h of normalizedHeaders) {
      if (!matchedRawCols.has(h.raw) && cleanAliases.includes(h.clean)) {
        mapping[key] = h.raw;
        matchedRawCols.add(h.raw);
        return;
      }
    }

    // 2. Partial / substring match
    for (const h of normalizedHeaders) {
      if (!matchedRawCols.has(h.raw)) {
        const found = cleanAliases.some((alias) => h.clean.includes(alias) || alias.includes(h.clean));
        if (found) {
          mapping[key] = h.raw;
          matchedRawCols.add(h.raw);
          return;
        }
      }
    }
  });

  const unmappedRequired = TARGET_FIELDS
    .filter((f) => f.required && !mapping[f.key])
    .map((f) => f.key);

  return { mapping, unmappedRequired };
}

/**
 * Validates and normalizes an array of raw row objects using a field-to-column mapping.
 * Returns { items, errors }.
 */
export function normalizeRowsWithMapping(rawRows, mapping) {
  const errors = [];
  const items = [];

  rawRows.forEach((rawRow, idx) => {
    const rowNum = idx + 2;

    const system = String(rawRow[mapping.system] ?? '').trim();
    const description = String(rawRow[mapping.item_description] ?? '').trim();
    const sizeSpec = String(rawRow[mapping.size_spec] ?? '').trim();
    const unit = String(rawRow[mapping.unit] ?? '').trim().toUpperCase();

    const missingFields = [];
    if (!system) missingFields.push('System');
    if (!description) missingFields.push('Description');
    if (!sizeSpec) missingFields.push('Size/Spec');
    if (!unit) missingFields.push('Unit');

    if (missingFields.length > 0) {
      errors.push(`Row ${rowNum}: missing required value for ${missingFields.join(', ')}`);
      return;
    }

    const rawQty = rawRow[mapping.quantity];
    const quantity = cleanNumericValue(rawQty);
    if (Number.isNaN(quantity)) {
      errors.push(`Row ${rowNum}: "Quantity" is not a valid number (${rawQty})`);
      return;
    }

    const rawDepth = mapping.avg_depth_ft ? rawRow[mapping.avg_depth_ft] : undefined;
    let avgDepthFt = 0;
    if (rawDepth !== undefined && rawDepth !== '') {
      avgDepthFt = cleanNumericValue(rawDepth);
      if (Number.isNaN(avgDepthFt)) {
        errors.push(`Row ${rowNum}: "Avg Depth" is not a valid number (${rawDepth})`);
        return;
      }
    }

    items.push({
      id: nextId(),
      system,
      description,
      sizeSpec,
      quantity,
      unit,
      avgDepthFt,
      materialCostPerUnit: 0,
      laborHoursPerUnit: 0,
    });
  });

  return { items, errors };
}

/**
 * Parses raw CSV text or File into raw JSON rows and headers.
 */
export function parseRawCsv(fileOrText) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta?.fields || [];
        resolve({ headers, rows: results.data, parseErrors: results.errors || [] });
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Parses raw Excel file into raw JSON rows and headers.
 */
export async function parseRawExcel(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows, parseErrors: [] };
}

const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.xlsm'];

export function isExcelFile(file) {
  const name = (file?.name || '').toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * High-level parser that attempts smart column auto-mapping.
 * If all required columns are auto-detected, normalizes immediately.
 * Otherwise, returns { requiresMappingModal: true, headers, rawRows, currentMapping }.
 */
export async function parseTakeoffFile(file) {
  let rawData;
  if (isExcelFile(file)) {
    rawData = await parseRawExcel(file);
  } else {
    rawData = await parseRawCsv(file);
  }

  const { headers, rows, parseErrors } = rawData;
  if (!rows || rows.length === 0) {
    return { items: [], errors: ['Uploaded file is empty or has no readable rows.'] };
  }

  const { mapping, unmappedRequired } = autoDetectColumnMapping(headers);

  if (unmappedRequired.length > 0) {
    return {
      requiresMappingModal: true,
      headers,
      rawRows: rows,
      currentMapping: mapping,
      unmappedRequired,
      parseErrors,
    };
  }

  const { items, errors } = normalizeRowsWithMapping(rows, mapping);
  const formattedParseErrors = (parseErrors || []).map((e) => `Row ${e.row + 2}: ${e.message}`);
  return { items, errors: [...formattedParseErrors, ...errors] };
}

export function createBlankItem() {
  return {
    id: nextId(),
    system: 'Sanitary',
    description: '',
    sizeSpec: '',
    quantity: 0,
    unit: 'LF',
    avgDepthFt: 0,
    materialCostPerUnit: 0,
    laborHoursPerUnit: 0,
  };
}
