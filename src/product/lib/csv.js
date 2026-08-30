/**
 * CSV / Takeoff Client Adapter
 * Thin adapter calling server-side /api/takeoffs parser endpoints.
 */
import Papa from 'papaparse';
import { getTranslation } from '@/core/lib/shared/i18n.js';
import { takeoffsApi } from '@/product/lib/takeoffs.js';
import {
  CSV_COLUMNS,
  TARGET_FIELDS,
  EXCEL_EXTENSIONS,
  PRESETS_STORAGE_KEY,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
} from '@/product/constants/csv.constants.js';

export {
  CSV_COLUMNS,
  TARGET_FIELDS,
  EXCEL_EXTENSIONS,
  PRESETS_STORAGE_KEY,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
};

let idCounter = 0;
export function nextId() {
  idCounter += 1;
  return `item-${Date.now()}-${idCounter}`;
}

export function getTargetFields(customT = null) {
  const t = customT || getTranslation;
  return [
    { key: 'system', label: t('csvParser.targetFields.systemLabel'), required: true, description: t('csvParser.targetFields.systemDesc') },
    { key: 'item_description', label: t('csvParser.targetFields.itemDescriptionLabel'), required: true, description: t('csvParser.targetFields.itemDescriptionDesc') },
    { key: 'size_spec', label: t('csvParser.targetFields.sizeSpecLabel'), required: false, description: t('csvParser.targetFields.sizeSpecDesc') },
    { key: 'quantity', label: t('csvParser.targetFields.quantityLabel'), required: true, description: t('csvParser.targetFields.quantityDesc') },
    { key: 'unit', label: t('csvParser.targetFields.unitLabel'), required: true, description: t('csvParser.targetFields.unitDesc') },
    { key: 'avg_depth_ft', label: t('csvParser.targetFields.avgDepthFtLabel'), required: false, description: t('csvParser.targetFields.avgDepthFtDesc') },
    { key: 'material_cost_per_unit', label: t('csvParser.targetFields.materialCostPerUnitLabel', 'Material $/Unit'), required: false, description: t('csvParser.targetFields.materialCostPerUnitDesc', 'Unit material price or cost per unit') },
    { key: 'labor_hours_per_unit', label: t('csvParser.targetFields.laborHoursPerUnitLabel', 'Labor Hrs/Unit'), required: false, description: t('csvParser.targetFields.laborHoursPerUnitDesc', 'Crew productivity hours per unit') },
    { key: 'labor_unit_cost', label: t('csvParser.targetFields.laborUnitCostLabel', 'Labor $/Unit'), required: false, description: t('csvParser.targetFields.laborUnitCostDesc', 'Labor dollar rate per unit') },
  ];
}

export function isExcelFile(file) {
  const name = (file?.name || '').toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Saved Vendor / Subcontractor Presets Management (LocalStorage)
 */
export function getSavedVendorPresets() {
  try {
    const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveVendorPreset(presetName, mapping) {
  if (!presetName || !mapping) return;
  try {
    const current = getSavedVendorPresets();
    current[presetName.trim()] = mapping;
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Could not save vendor preset:', err);
  }
}

export function deleteVendorPreset(presetName) {
  if (!presetName) return;
  try {
    const current = getSavedVendorPresets();
    delete current[presetName.trim()];
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Could not delete vendor preset:', err);
  }
}

/**
 * High-level Parser Entrypoint:
 * Reads CSV / Excel bytes and dispatches directly to server-side parser engine.
 */
export async function parseTakeoffFile(file, sheetName = null, tableId = null, customPreset = null) {
  if (file?.size && file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(getTranslation('uploadStep.fileTooLarge', `File size exceeds the ${MAX_FILE_SIZE_LABEL} limit. Please upload a smaller file.`));
  }

  let fileContent = null;
  let fileBase64 = null;
  const isExcel = isExcelFile(file);

  if (isExcel) {
    if (file && typeof file.arrayBuffer === 'function') {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      fileBase64 = btoa(binary);
    }
  } else {
    if (file && typeof file.text === 'function') {
      fileContent = await file.text();
    } else if (typeof file === 'string') {
      fileContent = file;
    }
  }

  // Check saved vendor presets matching filename
  const savedPresets = getSavedVendorPresets();
  let appliedPreset = customPreset || null;
  if (!appliedPreset && file?.name) {
    const fname = file.name.toLowerCase();
    for (const [name, presetMap] of Object.entries(savedPresets)) {
      if (fname.includes(name.toLowerCase())) {
        appliedPreset = presetMap;
        break;
      }
    }
  }

  return takeoffsApi.parseTakeoffPayload({
    fileContent,
    fileBase64,
    fileName: file?.name || (isExcel ? 'takeoff.xlsx' : 'takeoff.csv'),
    sheetName,
    tableId,
    customPreset: appliedPreset,
  });
}

/**
 * Server-side row normalization with user mapping
 */
export async function normalizeRowsWithMapping(rawRows = [], mapping = {}, defaultLaborRate = null) {
  return takeoffsApi.normalizeMapping({
    rawRows,
    mapping,
    defaultLaborRate,
  });
}

/**
 * Server-side header extraction from matrix
 */
export async function extractHeadersAndRowsAtHeaderRow(matrix = [], headerRowIndex = 0) {
  return takeoffsApi.sniffHeaders({
    matrix,
    headerRowIndex,
  });
}

export function getSampleCsvRows(customT = null) {
  const t = customT || getTranslation;
  return [
    { system: t('csvParser.sampleRows.sanitary'), item_description: t('csvParser.sampleRows.pipe'), size_spec: '6" PVC SDR-35', quantity: 275, unit: 'LF', avg_depth_ft: 4, material_cost_per_unit: 18.50, labor_hours_per_unit: 0.15 },
    { system: t('csvParser.sampleRows.sanitary'), item_description: t('csvParser.sampleRows.pipe'), size_spec: '8" PVC SDR-35', quantity: 140, unit: 'LF', avg_depth_ft: 6, material_cost_per_unit: 24.00, labor_hours_per_unit: 0.22 },
    { system: t('csvParser.sampleRows.sanitary'), item_description: t('csvParser.sampleRows.elbow'), size_spec: '6" PVC', quantity: 6, unit: 'EA', avg_depth_ft: '', material_cost_per_unit: 45.00, labor_hours_per_unit: 0.75 },
    { system: t('csvParser.sampleRows.sanitary'), item_description: t('csvParser.sampleRows.cleanout'), size_spec: '6" PVC', quantity: 4, unit: 'EA', avg_depth_ft: '', material_cost_per_unit: 120.00, labor_hours_per_unit: 1.20 },
    { system: t('csvParser.sampleRows.sanitary'), item_description: t('csvParser.sampleRows.manhole'), size_spec: '48" Precast', quantity: 3, unit: 'EA', avg_depth_ft: '', material_cost_per_unit: 1850.00, labor_hours_per_unit: 6.50 },
    { system: t('csvParser.sampleRows.storm'), item_description: t('csvParser.sampleRows.pipe'), size_spec: '12" HDPE', quantity: 320, unit: 'LF', avg_depth_ft: 3, material_cost_per_unit: 28.00, labor_hours_per_unit: 0.18 },
    { system: t('csvParser.sampleRows.storm'), item_description: t('csvParser.sampleRows.pipe'), size_spec: '18" RCP', quantity: 95, unit: 'LF', avg_depth_ft: 5, material_cost_per_unit: 52.00, labor_hours_per_unit: 0.35 },
    { system: t('csvParser.sampleRows.storm'), item_description: t('csvParser.sampleRows.catchBasin'), size_spec: '24" x 24"', quantity: 5, unit: 'EA', avg_depth_ft: '', material_cost_per_unit: 850.00, labor_hours_per_unit: 3.00 },
    { system: t('csvParser.sampleRows.storm'), item_description: t('csvParser.sampleRows.flaredEndSection'), size_spec: '18" RCP', quantity: 2, unit: 'EA', avg_depth_ft: '', material_cost_per_unit: 420.00, labor_hours_per_unit: 1.50 },
    { system: t('csvParser.sampleRows.domesticWater'), item_description: t('csvParser.sampleRows.pipe'), size_spec: '6" C900', quantity: 410, unit: 'LF', avg_depth_ft: 3.5, material_cost_per_unit: 32.00, labor_hours_per_unit: 0.20 },
  ];
}

export function buildSampleCsv(customT = null) {
  const rows = getSampleCsvRows(customT);
  return Papa.unparse(rows, { columns: CSV_COLUMNS });
}

export function downloadSampleCsv(filename = 'takeoff_sample_template.csv', customT = null) {
  const csv = buildSampleCsv(customT);
  triggerDownload(csv, filename, 'text/csv');
}

export async function downloadSampleExcel(filename = 'takeoff_sample_template.xlsx', customT = null) {
  const t = customT || getTranslation;
  const XLSX = await import('xlsx');
  const rows = getSampleCsvRows(customT);
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: CSV_COLUMNS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t('csvParser.errors.takeoffSheet') || 'Takeoff Estimate');
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

export function createBlankItem(customT = null) {
  const t = customT || getTranslation;
  return {
    id: nextId(),
    system: t('csvParser.sampleRows.sanitary') || 'Sanitary',
    description: '',
    sizeSpec: '',
    quantity: 0,
    unit: 'LF',
    avgDepthFt: 0,
    materialCostPerUnit: 0,
    laborHoursPerUnit: 0,
  };
}

/**
 * Builds ColumnMappingModal data directly from existing takeoff items in state.
 */
export function buildMappingModalDataFromItems(items = [], customT = null) {
  const t = customT || getTranslation;
  const targetFields = getTargetFields(t);
  const headers = targetFields.map((f) => f.label);

  const keyToHeader = {};
  const currentMapping = {};
  const matchConfidences = {};

  targetFields.forEach((f) => {
    keyToHeader[f.key] = f.label;
    currentMapping[f.key] = f.label;
    matchConfidences[f.key] = 1.0;
  });

  const rawRows = (items || []).map((it) => {
    const row = {};
    row[keyToHeader['system']] = it.system || '';
    row[keyToHeader['item_description']] = it.description || '';
    row[keyToHeader['size_spec']] = it.sizeSpec || '';
    row[keyToHeader['quantity']] = it.quantity !== undefined && it.quantity !== null ? String(it.quantity) : '';
    row[keyToHeader['unit']] = it.unit || 'LF';
    row[keyToHeader['avg_depth_ft']] = it.avgDepthFt !== undefined && it.avgDepthFt !== null ? String(it.avgDepthFt) : '';
    row[keyToHeader['material_cost_per_unit']] = it.materialCostPerUnit !== undefined && it.materialCostPerUnit !== null ? String(it.materialCostPerUnit) : '';
    row[keyToHeader['labor_hours_per_unit']] = it.laborHoursPerUnit !== undefined && it.laborHoursPerUnit !== null ? String(it.laborHoursPerUnit) : '';
    row[keyToHeader['labor_unit_cost']] = it.laborUnitCost !== undefined && it.laborUnitCost !== null ? String(it.laborUnitCost) : '';
    return row;
  });

  const sampleMatrix = [
    headers,
    ...rawRows.map((r) => headers.map((h) => r[h])),
  ];

  return {
    requiresMappingModal: true,
    headers,
    rawRows,
    mapping: currentMapping,
    currentMapping,
    matchConfidences,
    overallConfidence: 1.0,
    sampleMatrix,
    headerRowIndex: 0,
    sheetNames: [],
    activeSheetName: '',
    subTables: [],
    activeTableId: null,
  };
}
