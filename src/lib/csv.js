import Papa from 'papaparse';

export const CSV_COLUMNS = [
  'system',
  'item_description',
  'size_spec',
  'quantity',
  'unit',
  'avg_depth_ft',
];

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
 * Validates and normalizes an array of raw row objects (from CSV or Excel) into
 * takeoff item objects. Returns { items, errors }.
 */
function normalizeRows(rawRows) {
  const errors = [];
  const items = [];

  rawRows.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // account for header row
    // Normalize keys to lowercase/trimmed to tolerate Excel header variations.
    const row = {};
    Object.keys(rawRow).forEach((key) => {
      row[key.trim().toLowerCase()] = rawRow[key];
    });

    const missing = CSV_COLUMNS.filter((col) => col !== 'avg_depth_ft' && !String(row[col] ?? '').trim());
    if (missing.length) {
      errors.push(`Row ${rowNum}: missing required field(s): ${missing.join(', ')}`);
      return;
    }

    const quantity = Number(row.quantity);
    if (Number.isNaN(quantity)) {
      errors.push(`Row ${rowNum}: "quantity" is not a valid number (${row.quantity})`);
      return;
    }

    const avgDepthRaw = row.avg_depth_ft;
    const avgDepthFt = avgDepthRaw === undefined || avgDepthRaw === '' ? 0 : Number(avgDepthRaw);
    if (Number.isNaN(avgDepthFt)) {
      errors.push(`Row ${rowNum}: "avg_depth_ft" is not a valid number (${avgDepthRaw})`);
      return;
    }

    items.push({
      id: nextId(),
      system: String(row.system).trim(),
      description: String(row.item_description).trim(),
      sizeSpec: String(row.size_spec).trim(),
      quantity,
      unit: String(row.unit).trim().toUpperCase(),
      avgDepthFt,
      materialCostPerUnit: 0,
      laborHoursPerUnit: 0,
    });
  });

  return { items, errors };
}

/**
 * Parses a raw CSV file/text into normalized takeoff item objects.
 * Returns { items, errors } where errors is a list of human-readable validation issues.
 */
export function parseTakeoffCsv(fileOrText) {
  return new Promise((resolve) => {
    const handleResults = (results) => {
      const parseErrors = (results.errors || []).map((e) => `Row ${e.row + 2}: ${e.message}`);
      const { items, errors } = normalizeRows(results.data);
      resolve({ items, errors: [...parseErrors, ...errors] });
    };

    const config = {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: handleResults,
    };

    if (typeof fileOrText === 'string') {
      handleResults(Papa.parse(fileOrText, { header: true, skipEmptyLines: true, transformHeader: config.transformHeader }));
    } else {
      Papa.parse(fileOrText, config);
    }
  });
}

const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.xlsm'];

export function isExcelFile(file) {
  const name = (file?.name || '').toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Parses an uploaded Excel (.xlsx/.xls) file into normalized takeoff item objects.
 * Reads the first worksheet. Returns { items, errors }.
 */
export async function parseTakeoffExcel(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  return normalizeRows(rawRows);
}

/**
 * Parses either a CSV or Excel file into normalized takeoff item objects,
 * automatically detecting the file type by extension.
 */
export async function parseTakeoffFile(file) {
  if (isExcelFile(file)) {
    return parseTakeoffExcel(file);
  }
  return parseTakeoffCsv(file);
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
