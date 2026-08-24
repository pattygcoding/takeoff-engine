import Papa from 'papaparse';
import { getTranslation } from './i18n.js';
import {
  CSV_COLUMNS,
  TARGET_FIELDS,
  COLUMN_ALIASES,
  IGNORED_INDEX_HEADER_ALIASES,
  CSI_DIVISIONS,
  UNIT_NORMALIZATIONS,
  EXCEL_EXTENSIONS,
  PRESETS_STORAGE_KEY,
} from '../constants/csv.constants.js';

export {
  CSV_COLUMNS,
  TARGET_FIELDS,
  COLUMN_ALIASES,
  IGNORED_INDEX_HEADER_ALIASES,
  CSI_DIVISIONS,
  UNIT_NORMALIZATIONS,
  EXCEL_EXTENSIONS,
  PRESETS_STORAGE_KEY,
};

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

/**
 * Resolves CSI Code or Division string (e.g. "02-31-00", "03 21 00", "09 22 00", "26 24 16", "Div 03")
 * into a human-readable trade system.
 */
export function resolveCsiSystem(rawSystem = '') {
  if (!rawSystem) return '';
  const str = String(rawSystem).trim();

  // Check for leading 2-digit CSI division: e.g. "02-31-00", "03 21 00", "092200", "Div 02", "Division 31"
  const match = str.match(/^(?:div(?:ision)?\s*)?(\d{2})(?:[-\s.]?\d{2}[-\s.]?\d{2})?/i);
  if (match) {
    const divNum = match[1].padStart(2, '0');
    if (CSI_DIVISIONS[divNum]) {
      return `${divNum} - ${CSI_DIVISIONS[divNum]}`;
    }
  }

  // Check if string contains division name
  for (const [divNum, divName] of Object.entries(CSI_DIVISIONS)) {
    if (str.toLowerCase() === divName.toLowerCase() || str.toLowerCase() === `division ${divNum}`.toLowerCase()) {
      return `${divNum} - ${divName}`;
    }
  }

  return str;
}

/**
 * Sanitizes multi-line cell values (e.g. Alt + Enter in Excel).
 * Replaces newlines and carriage returns with a single clean space.
 */
export function sanitizeCellString(val) {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string') return String(val);
  return val.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parses composite multiline cell (Alt+Enter) splitting into primary description
 * and supplementary scope notes.
 */
export function parseMultilineCell(rawCell = '') {
  if (rawCell === null || rawCell === undefined) return { primaryText: '', notes: '' };
  const str = String(rawCell).trim();
  const lines = str.split(/\r?\n|\r/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return { primaryText: str.replace(/\s+/g, ' ').trim(), notes: '' };
  }
  return {
    primaryText: lines[0],
    notes: lines.slice(1).join(' | '),
  };
}

/**
 * Cleans formula error representations (#REF!, #VALUE!, #N/A, #NAME?, #DIV/0!, #NULL!, #NUM!)
 * Returns null for broken formula values, or the cleaned string/number.
 */
export function cleanFormulaError(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (/^#(REF!|VALUE!|N\/A|NAME\?|DIV\/0!|NULL!|NUM!|ERROR!)/i.test(str)) {
    return null;
  }
  return val;
}

export function getSampleCsvRows(customT = null) {
  const t = customT || getTranslation;
  return [
    { system: t('csvParser.sampleRows.sanitary'), item_description: t('csvParser.sampleRows.pipe'), size_spec: '6" PVC SDR-35', quantity: 275, unit: 'LF', avg_depth_ft: 4 },
    { system: t('csvParser.sampleRows.sanitary'), item_description: t('csvParser.sampleRows.pipe'), size_spec: '8" PVC SDR-35', quantity: 140, unit: 'LF', avg_depth_ft: 6 },
    { system: t('csvParser.sampleRows.sanitary'), item_description: t('csvParser.sampleRows.elbow'), size_spec: '6" PVC', quantity: 6, unit: 'EA', avg_depth_ft: '' },
    { system: t('csvParser.sampleRows.sanitary'), item_description: t('csvParser.sampleRows.cleanout'), size_spec: '6" PVC', quantity: 4, unit: 'EA', avg_depth_ft: '' },
    { system: t('csvParser.sampleRows.sanitary'), item_description: t('csvParser.sampleRows.manhole'), size_spec: '48" Precast', quantity: 3, unit: 'EA', avg_depth_ft: '' },
    { system: t('csvParser.sampleRows.storm'), item_description: t('csvParser.sampleRows.pipe'), size_spec: '12" HDPE', quantity: 320, unit: 'LF', avg_depth_ft: 3 },
    { system: t('csvParser.sampleRows.storm'), item_description: t('csvParser.sampleRows.pipe'), size_spec: '18" RCP', quantity: 95, unit: 'LF', avg_depth_ft: 5 },
    { system: t('csvParser.sampleRows.storm'), item_description: t('csvParser.sampleRows.catchBasin'), size_spec: '24" x 24"', quantity: 5, unit: 'EA', avg_depth_ft: '' },
    { system: t('csvParser.sampleRows.storm'), item_description: t('csvParser.sampleRows.flaredEndSection'), size_spec: '18" RCP', quantity: 2, unit: 'EA', avg_depth_ft: '' },
    { system: t('csvParser.sampleRows.domesticWater'), item_description: t('csvParser.sampleRows.pipe'), size_spec: '6" C900', quantity: 410, unit: 'LF', avg_depth_ft: 3.5 },
    { system: t('csvParser.sampleRows.domesticWater'), item_description: t('csvParser.sampleRows.gateValve'), size_spec: '6"', quantity: 3, unit: 'EA', avg_depth_ft: '' },
    { system: t('csvParser.sampleRows.domesticWater'), item_description: t('csvParser.sampleRows.fireHydrantAssembly'), size_spec: t('csvParser.sampleRows.specStandard'), quantity: 2, unit: 'EA', avg_depth_ft: '' },
    { system: t('csvParser.sampleRows.domesticWater'), item_description: t('csvParser.sampleRows.tappingSleeveValve'), size_spec: '6" x 6"', quantity: 1, unit: 'EA', avg_depth_ft: '' },
  ];
}

let idCounter = 0;
export function nextId() {
  idCounter += 1;
  return `item-${Date.now()}-${idCounter}`;
}

/**
 * Levenshtein distance algorithm for deterministic fuzzy string similarity.
 * Returns ratio between 0.0 (no match) and 1.0 (identical).
 */
export function calculateStringSimilarity(a = '', b = '') {
  const str1 = String(a).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const str2 = String(b).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const len1 = str1.length;
  const len2 = str2.length;
  const track = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

  for (let i = 0; i <= len1; i += 1) track[0][i] = i;
  for (let j = 0; j <= len2; j += 1) track[j][0] = j;

  for (let j = 1; j <= len2; j += 1) {
    for (let i = 1; i <= len1; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = track[len2][len1];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Clean & normalize messy construction unit strings.
 * Preserves unmatched custom unit strings in clean uppercase rather than forcing LF.
 */
export function normalizeUnit(rawUnit = '') {
  if (!rawUnit) return 'LF';
  const rawStr = String(rawUnit).trim();
  if (!rawStr) return 'LF';

  const clean = rawStr.toLowerCase().replace(/[^a-z0-9.²³]/g, '');
  if (UNIT_NORMALIZATIONS[clean]) {
    return UNIT_NORMALIZATIONS[clean];
  }

  // Check direct lookup in UNIT_NORMALIZATIONS with lowercase raw string
  if (UNIT_NORMALIZATIONS[rawStr.toLowerCase()]) {
    return UNIT_NORMALIZATIONS[rawStr.toLowerCase()];
  }

  // Preserve raw unmatched unit string (e.g. "ROLL", "BUNDLE", "PALLET", "TRIP", "PKG")
  return rawStr.toUpperCase().slice(0, 8);
}

/**
 * Strips currency symbols, commas, spaces, and handles accounting parenthesis negatives e.g. (150.00).
 * Also extracts embedded units e.g. "1,250 LF" -> { number: 1250, extractedUnit: 'LF' }.
 */
export function cleanNumericValue(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === 'number') return Number.isFinite(val) ? val : NaN;

  let str = String(val).trim();
  if (str === '') return NaN;

  // If cell contains broken formula reference (#REF!, #VALUE!, #N/A), return NaN immediately
  if (cleanFormulaError(str) === null) {
    return NaN;
  }

  // Check for accounting negative e.g. (123.45), ( $1,350.00 ), ($6,680.00)
  let isNegative = false;
  if (/^\s*\((.*)\)\s*$/.test(str)) {
    isNegative = true;
    str = str.replace(/^\s*\((.*)\)\s*$/, '$1');
  }

  // Check for explicit leading negative sign with currency: -$6,680.00 or $-6,680.00
  if (/^\s*-\s*[$€£]/.test(str) || /^\s*[$€£]\s*-/.test(str)) {
    isNegative = true;
  }

  // Check for embedded unit suffixes
  const unitMatch = str.match(/(cu\s*yds?|c\.y\.|cy|sq\s*ft|s\.f\.|sf|m2|m²|sq\s*yds?|sy|lin\s*ft|lf|feet|ft|each|ea|pcs|pallet|tn|tons?|hrs?|ls)/i);
  let extractedUnit = null;
  if (unitMatch) {
    extractedUnit = normalizeUnit(unitMatch[0]);
  }

  // Remove currency symbols ($ € £ ¥), commas, trailing text, non-numeric artifacts
  // Keep decimals and hyphens
  const cleaned = str.replace(/[$€£¥,\s]/g, '').replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return NaN;

  const parsedFloat = parseFloat(cleaned);
  if (Number.isNaN(parsedFloat)) return NaN;

  const num = Math.abs(parsedFloat) * (isNegative || parsedFloat < 0 ? -1 : 1);
  return Number.isNaN(num) ? NaN : num;
}

/**
 * Extract embedded units & clean number from composite cells.
 * Also detects placeholder / TBD tokens (e.g. "TBD", "N/A", "HOLD", "PENDING", "UNKNOWN", "BY OTHERS", "TBA").
 */
export function parseQuantityAndUnit(rawVal, fallbackUnit = 'LF') {
  if (rawVal === null || rawVal === undefined) return { quantity: 0, unit: fallbackUnit, isPlaceholder: false };
  if (typeof rawVal === 'number') return { quantity: rawVal, unit: fallbackUnit, isPlaceholder: false };

  const str = String(rawVal).trim();
  const isPlaceholder = /^(tbd|n\/a|na|pending|hold|unknown|t\.b\.d\.|to\s*be\s*determined|by\s*others|tba)$/i.test(str);

  if (isPlaceholder) {
    return {
      quantity: 0,
      unit: fallbackUnit,
      isPlaceholder: true,
      rawToken: str,
    };
  }

  const unitMatch = str.match(/(cu\s*yds?|c\.y\.|cy|sq\s*ft|s\.f\.|sf|m2|m²|sq\s*yds?|sy|linear\s*feet|lin\s*ft|lf|feet|ft|each|ea|pcs|tn|tons?|hrs?|ls)/i);
  const detectedUnit = unitMatch ? normalizeUnit(unitMatch[0]) : fallbackUnit;
  const num = cleanNumericValue(str);

  return {
    quantity: Number.isNaN(num) ? 0 : num,
    unit: detectedUnit || fallbackUnit,
    isPlaceholder: false,
  };
}

/**
 * Deconstruct composite description string if size or pipe diameter is embedded inside it.
 * Prioritizes compound construction specs before dimensional tokens, and avoids matching isolated bare integers.
 * e.g. "Direct Burial SDR-35" -> { description: "Direct Burial", sizeSpec: "SDR-35" }
 * e.g. "8\" PVC SDR-35 Mainline" -> { description: "Mainline", sizeSpec: "8\" PVC SDR-35" }
 * e.g. "2-1/2\" Type L Copper Domestic Water Piping" -> { description: "Domestic Water Piping", sizeSpec: "2-1/2\" Type L Copper" }
 * e.g. "Architectural Concrete Masonry Units 8x8x16" -> { description: "Architectural Concrete Masonry Units", sizeSpec: "8x8x16" }
 */
export function deconstructDescription(rawDesc = '', currentSize = '', customT = null) {
  const t = customT || getTranslation;
  if (currentSize !== null && currentSize !== undefined && String(currentSize).trim() !== '') {
    const cleanDesc = String(rawDesc || '').trim();
    return {
      description: cleanDesc,
      cleanDescription: cleanDesc,
      sizeSpec: String(currentSize).trim(),
    };
  }

  const desc = String(rawDesc || '').trim();
  if (!desc) return { description: '', cleanDescription: '', sizeSpec: '' };

  // 1. Full composite with dimension AND specification/material (e.g. '8" PVC SDR-35', '2-1/2" Type L Copper', '24" Class III RCP')
  // We exclude general product type nouns like 'cmu' or 'pipe' from the sizeSpec itself unless preceded by a standard pipe/structural material spec
  const compositeMatch = desc.match(/\b(\d+(?:[-/]\d+)?(?:\/\d+)?(?:\.\d+)?(?:\s*(?:\"|inch|in|'|mm|cm)|\s*-\s*inch)?(?:\s*(?:type\s*[a-z0-9]+|class\s+[ivx\d]+|class\s*\d+|sdr-?\d+|sch(?:edule)?-?\d+|c\d{3}))?(?:\s+(?:pvc|hdpe|rcp|dip|c900|copper|ductile\s*iron|steel|iron|brass))?)\b/i);

  if (compositeMatch && compositeMatch[0].trim().length >= 2 && /[0-9]/.test(compositeMatch[0])) {
    const candidate = compositeMatch[0].trim();
    // Ensure candidate is not just a bare un-dimensioned word or number
    if (/(?:\"|inch|in|'|mm|cm|x|by|\*|sdr|sch|class|type|c\d{3}|pvc|hdpe|rcp|dip|c900|copper|precast)/i.test(candidate)) {
      let cleanDesc = desc.replace(candidate, '').replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();
      if (!cleanDesc) cleanDesc = desc;
      return { description: cleanDesc, cleanDescription: cleanDesc, sizeSpec: candidate };
    }
  }

  // 2. Standalone Compound Specifications: SDR-35, SCH-40, Schedule 80, Class III, Class 52, C900, C905
  const compoundSpecMatch = desc.match(/\b(SDR[-\s]?\d+|SCH(?:EDULE)?[-\s]?\d+|C\d{3}|Class\s+[IVX\d]+|Type\s+[A-Z0-9]+)\b/i);
  if (compoundSpecMatch) {
    const specToken = compoundSpecMatch[0].trim();
    let cleanDesc = desc.replace(specToken, '').replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();
    if (!cleanDesc) cleanDesc = desc;
    return { description: cleanDesc, cleanDescription: cleanDesc, sizeSpec: specToken };
  }

  // 3. Multi-dimensional specs: 8x8x16, 24" x 24", 12x12
  const multiDimMatch = desc.match(/\b(\d+(?:[-/]\d+)?(?:\.\d+)?(?:\s*(?:\"|inch|in|'|mm|cm))?\s*(?:x|by|\*)\s*\d+(?:[-/]\d+)?(?:\.\d+)?(?:\s*(?:\"|inch|in|'|mm|cm))?(?:\s*(?:x|by|\*)\s*\d+(?:[-/]\d+)?(?:\.\d+)?(?:\s*(?:\"|inch|in|'|mm|cm))?)?)\b/i);
  if (multiDimMatch) {
    const dimToken = multiDimMatch[0].trim();
    let cleanDesc = desc.replace(dimToken, '').replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();
    if (!cleanDesc) cleanDesc = desc;
    return { description: cleanDesc, cleanDescription: cleanDesc, sizeSpec: dimToken };
  }

  // 4. Explicit Single Dimensions: 6", 8-Inch, 24-in, 48' (must have dimension suffix or 'dia' to prevent matching bare numbers)
  const singleDimMatch = desc.match(/\b(\d+(?:[-/]\d+)?(?:\/\d+)?(?:\.\d+)?\s*(?:\"|inch|inches|in\b|'|mm\b|cm\b|\s*-\s*inch|dia(?:\.|\b)|diameter))\b/i);
  if (singleDimMatch) {
    const dimToken = singleDimMatch[0].trim();
    let cleanDesc = desc.replace(dimToken, '').replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();
    if (!cleanDesc) cleanDesc = desc;
    return { description: cleanDesc, cleanDescription: cleanDesc, sizeSpec: dimToken };
  }

  return {
    description: desc,
    cleanDescription: desc,
    sizeSpec: currentSize ? String(currentSize).trim() : '',
  };
}

/**
 * Dynamic 2D Header Sniffer:
 * Inspects a matrix of raw 2D array rows and scores each row based on density of non-empty text,
 * distinct keyword matches against canonical estimating fields (e.g., Description, Qty, Unit, Cost, Code, CSI),
 * and lack of numeric-only data.
 * Skips merged title banners (which usually only contain 1 broad text item or single keyword match)
 * by requiring at least 2 distinct estimating keywords across separate columns.
 * Also handles stacked multi-row headers and left column offset.
 */
export function sniffHeaderBoundary(matrix = []) {
  if (!matrix || matrix.length === 0) {
    return { headerRowIndex: 0, headers: [], startColIndex: 0, confidence: 0 };
  }

  const maxScanRows = Math.min(matrix.length, 30);
  let bestRowIndex = 0;
  let highestScore = -Infinity;

  const allKeywords = Object.values(COLUMN_ALIASES).flat().map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  // Canonical distinct field categories for keyword validation
  const targetCategories = Object.entries(COLUMN_ALIASES).map(([field, aliases]) => ({
    field,
    aliases: aliases.map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, '')),
  }));

  for (let r = 0; r < maxScanRows; r++) {
    const row = matrix[r] || [];
    let textCells = 0;
    let keywordMatches = 0;
    let numericCells = 0;
    let emptyCells = 0;
    const matchedCategories = new Set();

    row.forEach((cell) => {
      if (cell === null || cell === undefined || String(cell).trim() === '') {
        emptyCells++;
        return;
      }
      const valStr = String(cell).trim();
      const numVal = cleanNumericValue(valStr);

      if (!Number.isNaN(numVal) && !/[a-zA-Z]/.test(valStr)) {
        numericCells++;
      } else {
        textCells++;
        const cleanCell = valStr.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanCell.length > 0) {
          let matched = false;
          for (const { field, aliases } of targetCategories) {
            if (aliases.some((kw) => cleanCell === kw || cleanCell.includes(kw) || kw.includes(cleanCell))) {
              matchedCategories.add(field);
              matched = true;
            }
          }
          if (matched) {
            keywordMatches++;
          }
        }
      }
    });

    const distinctCategoryCount = matchedCategories.size;

    // Requirement: A true header row must have at least 2 distinct keyword matches (or at least 2 distinct target categories)
    // to distinguish it from merged title banners / project notes on rows above the table.
    const isHeaderCandidate = distinctCategoryCount >= 2 || (keywordMatches >= 2 && textCells >= 2);

    // Heuristic score: heavily reward distinct keyword categories & column matches, text density, penalize numeric rows
    const score = (distinctCategoryCount * 10) + (keywordMatches * 4) + (textCells * 2) - (numericCells * 5) - (emptyCells * 0.5);

    if (isHeaderCandidate && score > highestScore) {
      highestScore = score;
      bestRowIndex = r;
    }
  }

  // Fallback if no multi-keyword row was found: pick the first row with any text or row 0
  if (highestScore === -Infinity) {
    for (let r = 0; r < maxScanRows; r++) {
      const row = matrix[r] || [];
      const hasText = row.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
      if (hasText) {
        bestRowIndex = r;
        break;
      }
    }
  }

  // Check if row bestRowIndex + 1 is a stacked/sub-header row
  const primaryHeaderRow = matrix[bestRowIndex] || [];
  let stackedHeaderRow = null;
  if (bestRowIndex + 1 < matrix.length) {
    const nextRow = matrix[bestRowIndex + 1] || [];
    const hasKeywords = nextRow.some((c) => {
      const clean = String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return allKeywords.some((kw) => clean === kw);
    });
    const hasNumbers = nextRow.some((c) => {
      const num = cleanNumericValue(c);
      return !Number.isNaN(num) && !/[a-zA-Z]/.test(String(c));
    });
    if (hasKeywords && !hasNumbers) {
      stackedHeaderRow = nextRow;
    }
  }

  // Find left column start offset (skip completely blank leading columns)
  let startColIndex = 0;
  for (let c = 0; c < primaryHeaderRow.length; c++) {
    const hasData = matrix.slice(bestRowIndex, bestRowIndex + 10).some((row) => row[c] !== undefined && String(row[c]).trim() !== '');
    if (hasData) {
      startColIndex = c;
      break;
    }
  }

  // Build combined header names
  const headers = [];
  const maxCols = Math.max(primaryHeaderRow.length, stackedHeaderRow ? stackedHeaderRow.length : 0);

  for (let c = startColIndex; c < maxCols; c++) {
    const top = String(primaryHeaderRow[c] || '').trim();
    const bottom = stackedHeaderRow ? String(stackedHeaderRow[c] || '').trim() : '';

    let headerName = '';
    if (top && bottom && top !== bottom) {
      headerName = `${top} - ${bottom}`;
    } else {
      headerName = top || bottom || `Column_${c + 1}`;
    }
    headers.push(headerName);
  }

  const effectiveHeaderRowIndex = stackedHeaderRow ? bestRowIndex + 1 : bestRowIndex;
  return {
    headerRowIndex: effectiveHeaderRowIndex,
    headers,
    startColIndex,
    confidence: highestScore > 0 ? Math.max(0.5, Math.min(1.0, highestScore / 25)) : 0.4,
  };
}

/**
 * Re-indexes a 2D matrix at a specific chosen header row index.
 * Useful when user manually selects which row contains their headers in the UI.
 */
export function extractHeadersAndRowsAtHeaderRow(matrix = [], headerRowIndex = 0) {
  if (!matrix || matrix.length === 0) {
    return { headers: [], rows: [], headerRowIndex: 0 };
  }

  const validRowIdx = Math.max(0, Math.min(headerRowIndex, matrix.length - 1));
  const rawHeaderRow = matrix[validRowIdx] || [];

  // Find left column start offset (first non-empty column in the matrix from header row onwards)
  let startColIndex = 0;
  for (let c = 0; c < rawHeaderRow.length; c++) {
    const hasData = matrix.slice(validRowIdx, validRowIdx + 10).some((r) => r[c] !== undefined && String(r[c]).trim() !== '');
    if (hasData) {
      startColIndex = c;
      break;
    }
  }

  const headers = [];
  for (let c = startColIndex; c < rawHeaderRow.length; c++) {
    const val = String(rawHeaderRow[c] || '').trim();
    headers.push(val || `Column_${c + 1}`);
  }

  const rows = [];
  for (let r = validRowIdx + 1; r < matrix.length; r++) {
    const rowArr = matrix[r] || [];
    if (rowArr.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      continue;
    }
    const rowObj = {};
    headers.forEach((h, hIdx) => {
      const val = rowArr[startColIndex + hIdx];
      rowObj[h] = val !== undefined ? val : '';
    });
    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    headerRowIndex: validRowIdx,
    startColIndex,
  };
}

/**
 * Multi-layer deterministic fuzzy column alias matcher with Levenshtein & data-type profiling lookahead.
 */
export function autoDetectColumnMapping(headers = [], sampleDataRows = []) {
  const ignoredIndexClean = IGNORED_INDEX_HEADER_ALIASES.map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const normalizedHeaders = headers.map((h, index) => ({
    raw: h,
    index,
    clean: String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  const mapping = {};
  const matchedRawCols = new Set();
  const matchConfidences = {};

  // 1. Exact & Synonym Dictionary Match
  TARGET_FIELDS.forEach(({ key }) => {
    const aliases = COLUMN_ALIASES[key] || [key];
    const cleanAliases = aliases.map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, ''));

    for (const h of normalizedHeaders) {
      if (key === 'item_description' && ignoredIndexClean.includes(h.clean)) {
        continue;
      }
      // Ambiguous generic headers like "Labor" are handled via step 3 profiling lookahead
      if (h.clean === 'labor' && (key === 'labor_hours_per_unit' || key === 'labor_unit_cost')) {
        continue;
      }
      if (!matchedRawCols.has(h.raw) && cleanAliases.includes(h.clean)) {
        mapping[key] = h.raw;
        matchedRawCols.add(h.raw);
        matchConfidences[key] = 1.0;
        return;
      }
    }
  });

  // 2. Substring & High-Similarity Levenshtein Match (Threshold >= 0.80)
  TARGET_FIELDS.forEach(({ key }) => {
    if (mapping[key]) return;
    const aliases = COLUMN_ALIASES[key] || [key];

    let bestScore = 0;
    let bestCol = null;

    for (const h of normalizedHeaders) {
      if (matchedRawCols.has(h.raw)) continue;
      if (key === 'item_description' && ignoredIndexClean.includes(h.clean)) continue;

      for (const alias of aliases) {
        // Direct substring match
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        // For ambiguous generic terms like 'labor', avoid substring matching a short single token against longer aliases
        if (h.clean === 'labor' && (key === 'labor_hours_per_unit' || key === 'labor_unit_cost')) {
          continue;
        }

        if (h.clean.includes(cleanAlias) || cleanAlias.includes(h.clean)) {
          const score = Math.max(0.88, cleanAlias.length / Math.max(h.clean.length, cleanAlias.length));
          if (score > bestScore) {
            bestScore = score;
            bestCol = h.raw;
          }
        } else {
          // Levenshtein fuzzy distance
          const similarity = calculateStringSimilarity(h.clean, cleanAlias);
          if (similarity >= 0.80 && similarity > bestScore) {
            bestScore = similarity;
            bestCol = h.raw;
          }
        }
      }
    }

    if (bestCol && bestScore >= 0.80) {
      mapping[key] = bestCol;
      matchedRawCols.add(bestCol);
      matchConfidences[key] = bestScore;
    }
  });

  // 3. Column Data-Type Profiling & Heuristic Lookahead (Break ties on unmapped fields)
  // Check for ambiguous "Labor" column (e.g. determine if it's Labor Hrs or Labor $/Unit)
  if (!mapping.labor_hours_per_unit && !mapping.labor_unit_cost && sampleDataRows.length > 0) {
    for (const h of normalizedHeaders) {
      if (matchedRawCols.has(h.raw)) continue;
      if (/^(labor|labour|mano de obra|main d'oeuvre|mao de obra)$/i.test(h.clean)) {
        // Sample rows to check if values have currency symbols or are > 10.0 (likely $/unit)
        let hasCurrency = false;
        let hasLargeValue = false;
        for (const r of sampleDataRows.slice(0, 10)) {
          const rawVal = String(r[h.raw] || '');
          if (/[$€£¥]/.test(rawVal)) hasCurrency = true;
          const num = cleanNumericValue(rawVal);
          if (!Number.isNaN(num) && num > 10) hasLargeValue = true;
        }

        if (hasCurrency || hasLargeValue) {
          mapping.labor_unit_cost = h.raw;
          matchedRawCols.add(h.raw);
          matchConfidences.labor_unit_cost = 0.85;
        } else {
          mapping.labor_hours_per_unit = h.raw;
          matchedRawCols.add(h.raw);
          matchConfidences.labor_hours_per_unit = 0.85;
        }
        break;
      }
    }
  }

  if (!mapping.quantity && sampleDataRows.length > 0) {
    for (const h of normalizedHeaders) {
      if (matchedRawCols.has(h.raw)) continue;
      const isMostlyNumeric = sampleDataRows.slice(0, 8).every((r) => {
        const val = r[h.raw];
        return val === undefined || val === '' || !Number.isNaN(cleanNumericValue(val));
      });
      if (isMostlyNumeric) {
        mapping.quantity = h.raw;
        matchedRawCols.add(h.raw);
        matchConfidences.quantity = 0.75;
        break;
      }
    }
  }

  const unmappedRequired = TARGET_FIELDS
    .filter((f) => f.required && !mapping[f.key])
    .map((f) => f.key);

  const matchedRequiredCount = TARGET_FIELDS.filter((f) => f.required && mapping[f.key]).length;
  const totalRequiredCount = TARGET_FIELDS.filter((f) => f.required).length;
  const overallConfidence = totalRequiredCount > 0 ? (matchedRequiredCount / totalRequiredCount) : 1;

  return { mapping, unmappedRequired, matchConfidences, overallConfidence };
}

/**
 * Deterministic Row Classifier:
 * Categorizes rows into Valid Line Items, Category Headers, Subtotals, and Notes/Metadata.
 */
export function classifyRow(rawRow, mapping) {
  const rowValues = Object.values(rawRow || {}).map((v) => String(v ?? '').trim());
  const rowText = rowValues.join(' ').toLowerCase();

  // 1. Check for empty row or blank/zero divider rows (e.g. decorative divider bars or formula error rows)
  const nonEmptyValues = rowValues.filter((v) => v !== '');
  if (nonEmptyValues.length === 0 || nonEmptyValues.every((v) => v === '0' || v === '0.00' || v === '-')) {
    return { type: 'empty' };
  }

  // 2. Check for Subtotal / Grand Total / Formula Summary Row / Cost Rollup Footer
  if (
    /^(total|subtotal|sub-total|sum|summary|grand\s*total|balance|net\s*total|direct\s*cost|direct\s*cost\s*sub-?total|total\s*base\s*direct|base\s*direct|total\s*line\s*budget)/i.test(rowText) ||
    rowValues.some((v) => /^sub-?total/i.test(v) || /^total/i.test(v) || /^direct\s*cost/i.test(v) || /^total\s*base\s*direct/i.test(v) || /^=(sum|subtotal)/i.test(v))
  ) {
    const qtyVal = mapping.quantity ? cleanNumericValue(rawRow[mapping.quantity]) : NaN;
    return {
      type: 'subtotal',
      extractedTotal: Number.isNaN(qtyVal) ? null : qtyVal,
    };
  }

  // 3. Check for Metadata / Notes / Signatures / Markups & Overhead / Trailer / Compliance Items
  if (
    /(page\s*\d+\s*of\s*\d+|prepared\s*by|approved\s*by|terms\s*and\s*conditions|date:|authorized\s*signature|notice:|disclaimer|project\s*management|overhead|supervision|profit\s*margin|field\s*conditions|contingency|npdes|swppp|erosion\s*control|site\s*survey|layout\s*engineering|general\s*liability|bonding\s*(&|and)\s*insurance|contractor\s*fee|gross\s*profit)/i.test(rowText)
  ) {
    return { type: 'metadata' };
  }

  // 4. Check for Category / Group Banner (e.g. text in first col, all numeric cols blank, or banner markers)
  const descVal = mapping.item_description ? String(rawRow[mapping.item_description] ?? '').trim() : '';
  const systemVal = mapping.system ? String(rawRow[mapping.system] ?? '').trim() : '';
  const qtyRaw = mapping.quantity ? rawRow[mapping.quantity] : undefined;
  const qtyNum = cleanNumericValue(qtyRaw);

  const isBannerMarker = /^([=\-—_*~#]{2,}|\[.*\]|phase\s*\d+|section\s*\d+|division\s*\d+)/i.test(descVal || systemVal || rowValues[0]);
  const hasNoNumericData = Number.isNaN(qtyNum) && (!mapping.avg_depth_ft || Number.isNaN(cleanNumericValue(rawRow[mapping.avg_depth_ft])));

  if (isBannerMarker || (hasNoNumericData && (systemVal || descVal) && rowValues.filter(Boolean).length <= 2)) {
    const groupName = (systemVal || descVal || rowValues[0]).replace(/^[=\-—_*~#\s]+|[=\-—_*~#\s]+$/g, '').trim();
    return { type: 'category_banner', groupName: groupName || getTranslation('csvParser.defaultCategory') };
  }

  // 5. Valid Line Item
  return { type: 'line_item' };
}

/**
 * Normalizes raw rows using deterministic schema mapping, category hierarchy inheritance,
 * dirty unit splitting, and subtotal checksum calculation.
 */
export function normalizeRowsWithMapping(rawRows = [], mapping = {}, customT = null, defaultLaborRate = null) {
  const t = customT || getTranslation;
  const errors = [];
  const items = [];
  let currentGroup = t('csvParser.defaultCategory');
  let totalDetectedSubtotals = 0;
  let parsedQuantitySum = 0;

  // Check if default crew/labor hourly rate is supplied, or fallback to default standard rate ($65/hr)
  const fallbackLaborHourlyRate = typeof defaultLaborRate === 'number' && defaultLaborRate > 0 ? defaultLaborRate : 65.0;

  rawRows.forEach((rawRow, idx) => {
    const rowNum = idx + 2;
    const classification = classifyRow(rawRow, mapping);

    if (classification.type === 'empty' || classification.type === 'metadata') {
      return;
    }

    if (classification.type === 'category_banner') {
      currentGroup = classification.groupName || currentGroup;
      return;
    }

    if (classification.type === 'subtotal') {
      if (classification.extractedTotal !== null) {
        totalDetectedSubtotals += classification.extractedTotal;
      }
      return;
    }

    // Process line item
    const rawSystem = mapping.system ? sanitizeCellString(rawRow[mapping.system]) : '';
    const rawDescription = mapping.item_description ? sanitizeCellString(rawRow[mapping.item_description]) : '';
    const rawSize = mapping.size_spec ? sanitizeCellString(rawRow[mapping.size_spec]) : '';
    const rawUnit = mapping.unit ? sanitizeCellString(rawRow[mapping.unit]) : '';
    const rawQty = mapping.quantity ? cleanFormulaError(rawRow[mapping.quantity]) : undefined;
    const rawMatCost = mapping.material_cost_per_unit ? cleanFormulaError(rawRow[mapping.material_cost_per_unit]) : undefined;
    const rawLaborHrs = mapping.labor_hours_per_unit ? cleanFormulaError(rawRow[mapping.labor_hours_per_unit]) : undefined;
    const rawLaborCost = mapping.labor_unit_cost ? cleanFormulaError(rawRow[mapping.labor_unit_cost]) : undefined;

    // Resolve CSI division / system codes (e.g. 02-31-00 -> 02 - Existing Conditions)
    const resolvedSystem = resolveCsiSystem(rawSystem);

    // Use currentGroup as fallback if system is blank on row
    const system = resolvedSystem || currentGroup || t('csvParser.defaultCategory');

    // Deconstruct description & size if size is embedded in description
    const { description, sizeSpec } = deconstructDescription(rawDescription, rawSize, t);

    // Extract quantity and embedded unit (supports accounting negatives and placeholder tokens like TBD)
    const { quantity, unit: detectedUnit, isPlaceholder: isQtyPlaceholder, rawToken: qtyToken } = parseQuantityAndUnit(rawQty, rawUnit ? normalizeUnit(rawUnit) : 'LF');

    if (!description && !rawSize) {
      // Row has no identifying text description
      return;
    }

    // If quantity is NaN or 0 without being an intentional placeholder (TBD/N/A), flag validation warning
    if (Number.isNaN(quantity) || (quantity === 0 && !isQtyPlaceholder)) {
      if (description) {
        errors.push(t('csvParser.errors.invalidRowQuantity', { row: rowNum, description, rawQty: rawQty !== undefined && rawQty !== null ? rawQty : 'N/A' }));
      }
      return;
    }

    // Material Cost per Unit extraction ($/unit) and placeholder check
    let materialCostPerUnit = 0;
    let isMatPlaceholder = false;
    let matPlaceholderToken = null;
    if (rawMatCost !== undefined && rawMatCost !== null && rawMatCost !== '') {
      const matStr = String(rawMatCost).trim();
      if (/^(tbd|n\/a|na|pending|hold|unknown|t\.b\.d\.|to\s*be\s*determined|by\s*others|tba)$/i.test(matStr)) {
        isMatPlaceholder = true;
        matPlaceholderToken = matStr;
        materialCostPerUnit = 0;
      } else {
        const parsedMatCost = cleanNumericValue(rawMatCost);
        if (!Number.isNaN(parsedMatCost)) {
          materialCostPerUnit = parsedMatCost;
        }
      }
    }

    // Labor Hours vs Labor Cost Resolution
    let laborHoursPerUnit = 0;
    let laborUnitCost = 0;
    let isLaborPlaceholder = false;
    let laborPlaceholderToken = null;

    if (rawLaborHrs !== undefined && rawLaborHrs !== null && rawLaborHrs !== '') {
      const laborHrsStr = String(rawLaborHrs).trim();
      if (/^(tbd|n\/a|na|pending|hold|unknown|t\.b\.d\.|to\s*be\s*determined|by\s*others|tba)$/i.test(laborHrsStr)) {
        isLaborPlaceholder = true;
        laborPlaceholderToken = laborHrsStr;
      } else {
        const parsedHrs = cleanNumericValue(rawLaborHrs);
        if (!Number.isNaN(parsedHrs)) {
          laborHoursPerUnit = parsedHrs;
        }
      }
    }

    if (rawLaborCost !== undefined && rawLaborCost !== null && rawLaborCost !== '') {
      const laborCostStr = String(rawLaborCost).trim();
      if (/^(tbd|n\/a|na|pending|hold|unknown|t\.b\.d\.|to\s*be\s*determined|by\s*others|tba)$/i.test(laborCostStr)) {
        isLaborPlaceholder = true;
        laborPlaceholderToken = laborCostStr;
      } else {
        const parsedCost = cleanNumericValue(rawLaborCost);
        if (!Number.isNaN(parsedCost)) {
          laborUnitCost = parsedCost;
          // If labor hours per unit wasn't explicitly supplied, compute labor_hours_per_unit from dollar cost
          // Round to 2 decimal places to avoid floating-point drift (e.g. 0.1346... -> 0.13, 64.6154... -> 64.62)
          if (laborHoursPerUnit === 0 && fallbackLaborHourlyRate > 0) {
            laborHoursPerUnit = Math.round((parsedCost / fallbackLaborHourlyRate) * 100) / 100;
          }
        }
      }
    }

    // Depth extraction: Preserve null if column is not mapped / omitted from the sheet
    let avgDepthFt = null;
    if (mapping.avg_depth_ft && rawRow[mapping.avg_depth_ft] !== undefined && rawRow[mapping.avg_depth_ft] !== null && rawRow[mapping.avg_depth_ft] !== '') {
      const depthVal = cleanFormulaError(rawRow[mapping.avg_depth_ft]);
      const depthNum = cleanNumericValue(depthVal);
      if (!Number.isNaN(depthNum)) {
        avgDepthFt = depthNum;
      } else {
        avgDepthFt = 0;
      }
    } else if (mapping.avg_depth_ft && (rawRow[mapping.avg_depth_ft] === 0 || rawRow[mapping.avg_depth_ft] === '0')) {
      avgDepthFt = 0;
    }

    const hasPlaceholderScope = isQtyPlaceholder || isMatPlaceholder || isLaborPlaceholder;
    const placeholderReason = qtyToken || matPlaceholderToken || laborPlaceholderToken || 'TBD';

    parsedQuantitySum += quantity;

    items.push({
      id: nextId(),
      system,
      description: description || t('csvParser.defaultDescription'),
      sizeSpec: sizeSpec || '',
      quantity,
      unit: detectedUnit || 'LF',
      avgDepthFt,
      materialCostPerUnit,
      laborHoursPerUnit,
      laborUnitCost: laborUnitCost || (laborHoursPerUnit * fallbackLaborHourlyRate),
      hasMissingScope: !!hasPlaceholderScope,
      has_placeholder_scope: !!hasPlaceholderScope,
      missingScopeReason: hasPlaceholderScope ? placeholderReason : null,
    });
  });

  // Mathematical checksum comparison
  const checksumMatches = totalDetectedSubtotals > 0 && Math.abs(totalDetectedSubtotals - parsedQuantitySum) < 0.01;

  return {
    items,
    errors,
    checksum: {
      hasSubtotals: totalDetectedSubtotals > 0,
      detectedSubtotals: totalDetectedSubtotals,
      parsedSum: parsedQuantitySum,
      checksumMatches,
    },
  };
}

/**
 * Helper to unmerge merged cells in Excel and forward-fill values across rectangles.
 */
function forwardFillMergedCells(worksheet, XLSX) {
  if (!worksheet || !worksheet['!merges']) return;

  worksheet['!merges'].forEach((range) => {
    const startCellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c });
    const masterCell = worksheet[startCellAddress];
    if (!masterCell) return;

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (r === range.s.r && c === range.s.c) continue;
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        worksheet[cellAddr] = { ...masterCell };
      }
    }
  });
}

/**
 * Parses raw CSV into 2D matrix and JSON objects using dynamic sniffing,
 * carriage return sanitization, and side-by-side multi-table detection.
 */
export function parseRawCsv(fileOrText, selectedTableId = null) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrText, {
      skipEmptyLines: false,
      complete: (results) => {
        const rawMatrix = results.data || [];
        // Sanitize cells from multi-line Alt+Enter formatting & formula errors
        const matrix = rawMatrix.map((row) =>
          (row || []).map((cell) => {
            const cleanFormula = cleanFormulaError(cell);
            return cleanFormula === null ? '' : sanitizeCellString(cleanFormula);
          })
        );

        // Check for Side-by-Side (Multi-Table) layout in CSV
        const detectedSubTables = detectSideBySideTables(matrix);

        if (detectedSubTables.length >= 2) {
          const activeTable = detectedSubTables.find((t) => t.id === selectedTableId) || detectedSubTables[0];
          return resolve({
            headers: activeTable.headers,
            rows: activeTable.rows,
            sampleMatrix: activeTable.sampleMatrix,
            headerRowIndex: activeTable.headerRowIndex,
            confidence: activeTable.confidence,
            sheetNames: [getTranslation('csvParser.errors.csvUploadSheet')],
            activeSheetName: getTranslation('csvParser.errors.csvUploadSheet'),
            subTables: detectedSubTables,
            activeTableId: activeTable.id,
            parseErrors: results.errors || [],
          });
        }

        const { headerRowIndex, headers, startColIndex, confidence } = sniffHeaderBoundary(matrix);

        // Convert 2D matrix from data rows into structured JSON rows
        const rows = [];
        for (let r = headerRowIndex + 1; r < matrix.length; r++) {
          const rowArr = matrix[r] || [];
          if (rowArr.every((c) => c === null || c === undefined || String(c).trim() === '')) {
            continue;
          }
          const rowObj = {};
          headers.forEach((h, hIdx) => {
            const val = rowArr[startColIndex + hIdx];
            rowObj[h] = val !== undefined ? val : '';
          });
          rows.push(rowObj);
        }

        resolve({
          headers,
          rows,
          sampleMatrix: matrix.slice(0, 30),
          rawMatrix: matrix,
          headerRowIndex,
          confidence,
          sheetNames: [getTranslation('csvParser.errors.csvUploadSheet')],
          activeSheetName: getTranslation('csvParser.errors.csvUploadSheet'),
          subTables: [],
          activeTableId: null,
          parseErrors: results.errors || [],
        });
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Detects side-by-side (multi-table) sub-matrices in a 2D matrix.
 * Identifies contiguous column island blocks separated by 1 or more completely blank column gaps.
 * Returns array of sub-table descriptors { id, label, startCol, endCol, headers, rows, sampleMatrix, headerRowIndex, confidence }
 */
export function detectSideBySideTables(matrix = [], t = getTranslation) {
  if (!matrix || matrix.length === 0) return [];

  // Determine total columns width across top rows
  const maxScanRows = Math.min(matrix.length, 40);
  let maxCols = 0;
  for (let r = 0; r < maxScanRows; r++) {
    if (matrix[r] && matrix[r].length > maxCols) {
      maxCols = matrix[r].length;
    }
  }

  if (maxCols < 4) return []; // Too small for side-by-side tables

  // Build column occupation mask: true if column has non-empty text in scan rows
  const colOccupied = Array(maxCols).fill(false);
  for (let c = 0; c < maxCols; c++) {
    for (let r = 0; r < maxScanRows; r++) {
      const val = matrix[r]?.[c];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        colOccupied[c] = true;
        break;
      }
    }
  }

  // Find column island segments: [startCol, endCol]
  const islands = [];
  let inIsland = false;
  let startCol = 0;

  for (let c = 0; c < maxCols; c++) {
    if (colOccupied[c] && !inIsland) {
      inIsland = true;
      startCol = c;
    } else if (!colOccupied[c] && inIsland) {
      inIsland = false;
      if (c - startCol >= 2) {
        // Must be at least 2 columns wide
        islands.push({ startCol, endCol: c - 1 });
      }
    }
  }
  if (inIsland && (maxCols - startCol >= 2)) {
    islands.push({ startCol, endCol: maxCols - 1 });
  }

  // If only 1 island, no side-by-side split is needed
  if (islands.length <= 1) return [];

  // Check if each island contains distinct non-empty header/data keywords
  const subTables = [];
  islands.forEach((island, idx) => {
    // Slice sub-matrix for this column segment
    const subMatrix = matrix.map((row) => (row || []).slice(island.startCol, island.endCol + 1));
    const sniffResult = sniffHeaderBoundary(subMatrix);
    const { headerRowIndex, headers, startColIndex, confidence } = sniffResult;

    if (headers.length >= 2 && confidence > 0.3) {
      // Build structured rows for this sub-table
      const rows = [];
      for (let r = headerRowIndex + 1; r < subMatrix.length; r++) {
        const rowArr = subMatrix[r] || [];
        if (rowArr.every((c) => c === null || c === undefined || String(c).trim() === '')) {
          continue;
        }
        const rowObj = {};
        headers.forEach((h, hIdx) => {
          const val = rowArr[startColIndex + hIdx];
          rowObj[h] = val !== undefined ? sanitizeCellString(val) : '';
        });
        rows.push(rowObj);
      }

      if (rows.length > 0) {
        // Generate column range label (e.g. Cols A-F or Island 1)
        const colLetter = (colIdx) => {
          let temp, letter = '';
          let num = colIdx + 1;
          while (num > 0) {
            temp = (num - 1) % 26;
            letter = String.fromCharCode(65 + temp) + letter;
            num = Math.floor((num - temp) / 26);
          }
          return letter;
        };

        const rangeLabel = `Table ${idx + 1} (${colLetter(island.startCol)}–${colLetter(island.endCol)}: ${headers.slice(0, 3).join(', ')})`;

        subTables.push({
          id: `table_${idx + 1}`,
          label: rangeLabel,
          startCol: island.startCol,
          endCol: island.endCol,
          headers,
          rows,
          sampleMatrix: subMatrix.slice(0, 15),
          headerRowIndex,
          confidence,
        });
      }
    }
  });

  return subTables.length >= 2 ? subTables : [];
}

/**
 * Multi-worksheet smart Excel (.xlsx, .xls, .xlsm, .xlsb) parser.
 * Unmerges merged cells, filters hidden rows,
 * extracts cached calculated values, and detects side-by-side tables.
 */
export async function parseRawExcel(file, selectedSheetName = null, selectedTableId = null) {
  const XLSX = await import('xlsx');

  const buffer = await file.arrayBuffer();
  // cellFormula: false / cellNF / cellHTML: false / dense: false ensures cached values and row metadata are read
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellFormula: true,
    cellDates: true,
    cellNF: true,
    cellStyles: true,
  });

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    return { headers: [], rows: [], sheetNames: [], parseErrors: [getTranslation('csvParser.errors.noSheetsFound')] };
  }

  // Auto-score sheets to pick best takeoff tab if not specified
  let targetSheetName = selectedSheetName || sheetNames[0];
  if (!selectedSheetName && sheetNames.length > 1) {
    let topScore = -1;
    sheetNames.forEach((name) => {
      const lower = name.toLowerCase();
      let score = 0;
      if (lower.includes('takeoff') || lower.includes('estimate') || lower.includes('quant')) score += 10;
      if (lower.includes('pipe') || lower.includes('civil') || lower.includes('earthwork')) score += 8;
      if (lower.includes('summary') || lower.includes('data')) score += 5;
      if (lower.includes('instruction') || lower.includes('readme') || lower.includes('notes')) score -= 10;

      if (score > topScore) {
        topScore = score;
        targetSheetName = name;
      }
    });
  }

  const worksheet = workbook.Sheets[targetSheetName];
  // Unmerge and propagate header labels across merged rectangles
  forwardFillMergedCells(worksheet, XLSX);

  // Filter hidden rows (row.hidden === true or hpx === 0 or hpt === 0)
  const hiddenRowSet = new Set();
  if (Array.isArray(worksheet['!rows'])) {
    worksheet['!rows'].forEach((rowMeta, rIdx) => {
      if (rowMeta && (rowMeta.hidden === true || rowMeta.hpx === 0 || rowMeta.hpt === 0)) {
        hiddenRowSet.add(rIdx);
      }
    });
  }

  // Convert worksheet to raw 2D array matrix for sniffing using cached values and hidden row filters
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const matrix = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    // Skip hidden rows completely
    if (hiddenRowSet.has(r)) {
      continue;
    }

    const rowArr = [];

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellAddress];

      if (!cell) {
        rowArr.push('');
        continue;
      }

      // Read cached evaluated value (.v or formatted .w) rather than broken unevaluated formula string
      let cellValue = cell.v !== undefined ? cell.v : (cell.w !== undefined ? cell.w : '');
      
      // Clean broken formula errors (#REF!, #VALUE!, #N/A) to null
      cellValue = cleanFormulaError(cellValue);
      if (cellValue === null) {
        cellValue = '';
      }

      // Sanitize carriage returns (Alt + Enter)
      rowArr.push(sanitizeCellString(cellValue));
    }

    matrix.push(rowArr);
  }

  // Check for Side-by-Side (Multi-Table) layout in the matrix
  const detectedSubTables = detectSideBySideTables(matrix);

  if (detectedSubTables.length >= 2) {
    // If specific sub-table is chosen, return that sub-table
    const activeTable = detectedSubTables.find((t) => t.id === selectedTableId) || detectedSubTables[0];
    return {
      headers: activeTable.headers,
      rows: activeTable.rows,
      sampleMatrix: activeTable.sampleMatrix,
      headerRowIndex: activeTable.headerRowIndex,
      confidence: activeTable.confidence,
      sheetNames,
      activeSheetName: targetSheetName,
      subTables: detectedSubTables,
      activeTableId: activeTable.id,
      parseErrors: [],
    };
  }

  const { headerRowIndex, headers, startColIndex, confidence } = sniffHeaderBoundary(matrix);

  const rows = [];
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const rowArr = matrix[r] || [];
    if (rowArr.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      continue;
    }
    const rowObj = {};
    headers.forEach((h, hIdx) => {
      const val = rowArr[startColIndex + hIdx];
      rowObj[h] = val !== undefined ? val : '';
    });
    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    sampleMatrix: matrix.slice(0, 30),
    rawMatrix: matrix,
    headerRowIndex,
    confidence,
    sheetNames,
    activeSheetName: targetSheetName,
    subTables: [],
    activeTableId: null,
    parseErrors: [],
  };
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

/**
 * High-level Mega-Resilient Parser Entrypoint:
 * Reads CSV/Excel, runs 2D header sniffing, auto-matches aliases, checks confidence.
 * Prompts interactive column mapping modal if confidence < 90% or required fields unmapped
 * or if multiple side-by-side tables are detected.
 */
export async function parseTakeoffFile(file, sheetName = null, tableId = null, customPreset = null, customT = null) {
  const t = customT || getTranslation;
  let rawData;
  if (isExcelFile(file)) {
    rawData = await parseRawExcel(file, sheetName, tableId);
  } else {
    rawData = await parseRawCsv(file, tableId);
  }

  const {
    headers,
    rows,
    sheetNames,
    activeSheetName,
    sampleMatrix,
    rawMatrix,
    headerRowIndex,
    confidence: headerConfidence,
    subTables,
    activeTableId,
    parseErrors,
  } = rawData;

  if (!rows || rows.length === 0) {
    return {
      items: [],
      errors: [t('csvParser.errors.emptyOrNoRows')],
      sheetNames: sheetNames || [],
      activeSheetName,
      subTables: subTables || [],
      activeTableId,
    };
  }

  // Check saved vendor presets matching filename
  const savedPresets = getSavedVendorPresets();
  let appliedPresetMapping = customPreset || null;

  if (!appliedPresetMapping && file?.name) {
    const fname = file.name.toLowerCase();
    for (const [name, presetMap] of Object.entries(savedPresets)) {
      if (fname.includes(name.toLowerCase())) {
        appliedPresetMapping = presetMap;
        break;
      }
    }
  }

  const { mapping: autoMapping, unmappedRequired, matchConfidences, overallConfidence } = autoDetectColumnMapping(headers, rows);
  const effectiveMapping = appliedPresetMapping ? { ...autoMapping, ...appliedPresetMapping } : autoMapping;

  // If required fields are unmapped, confidence is below 90%, or side-by-side tables detected, prompt confirmation UI
  const missingRequired = TARGET_FIELDS.filter((f) => f.required && !effectiveMapping[f.key]).map((f) => f.key);
  const hasMultipleTables = subTables && subTables.length >= 2;

  if (missingRequired.length > 0 || overallConfidence < 0.90 || hasMultipleTables) {
    return {
      requiresMappingModal: true,
      headers,
      rawRows: rows,
      currentMapping: effectiveMapping,
      unmappedRequired: missingRequired,
      matchConfidences,
      overallConfidence,
      sampleMatrix,
      rawMatrix: rawMatrix || sampleMatrix,
      headerRowIndex,
      sheetNames: sheetNames || [],
      activeSheetName,
      subTables: subTables || [],
      activeTableId,
      parseErrors,
    };
  }

  const { items, errors, checksum } = normalizeRowsWithMapping(rows, effectiveMapping, t);
  const formattedParseErrors = (parseErrors || []).map((e) => `Row ${e.row + 2}: ${e.message}`);

  return {
    items,
    errors: [...formattedParseErrors, ...errors],
    checksum,
    headers,
    sheetNames: sheetNames || [],
    activeSheetName,
    subTables: subTables || [],
    activeTableId,
    confidence: overallConfidence,
  };
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
  XLSX.utils.book_append_sheet(workbook, worksheet, t('csvParser.errors.takeoffSheet'));
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
