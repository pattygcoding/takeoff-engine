import Papa from 'papaparse';
import { getTranslation } from './i18n';

export const CSV_COLUMNS = [
  'system',
  'item_description',
  'size_spec',
  'quantity',
  'unit',
  'avg_depth_ft',
];

export function getTargetFields(customT = null) {
  const t = customT || getTranslation;
  return [
    { key: 'system', label: t('csvParser.targetFields.systemLabel'), required: true, description: t('csvParser.targetFields.systemDesc') },
    { key: 'item_description', label: t('csvParser.targetFields.itemDescriptionLabel'), required: true, description: t('csvParser.targetFields.itemDescriptionDesc') },
    { key: 'size_spec', label: t('csvParser.targetFields.sizeSpecLabel'), required: true, description: t('csvParser.targetFields.sizeSpecDesc') },
    { key: 'quantity', label: t('csvParser.targetFields.quantityLabel'), required: true, description: t('csvParser.targetFields.quantityDesc') },
    { key: 'unit', label: t('csvParser.targetFields.unitLabel'), required: true, description: t('csvParser.targetFields.unitDesc') },
    { key: 'avg_depth_ft', label: t('csvParser.targetFields.avgDepthFtLabel'), required: false, description: t('csvParser.targetFields.avgDepthFtDesc') },
  ];
}

export const TARGET_FIELDS = [
  { key: 'system', label: 'System / Trade', required: true, description: 'Category, Trade, Division, or Phase group' },
  { key: 'item_description', label: 'Item / Description', required: true, description: 'Material name, scope description, or line item' },
  { key: 'size_spec', label: 'Size / Spec', required: true, description: 'Pipe diameter, material class, or dimension spec' },
  { key: 'quantity', label: 'Quantity', required: true, description: 'Length (LF), count (EA), area (SF), or volume (CY)' },
  { key: 'unit', label: 'Unit of Measure', required: true, description: 'LF, EA, CY, SF, TON, LS, etc.' },
  { key: 'avg_depth_ft', label: 'Avg Trench Depth (FT)', required: false, description: 'Optional depth for trench earthwork & backfill math' },
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
};

/**
 * Standard Unit Normalization Table
 */
export const UNIT_NORMALIZATIONS = {
  // Linear Feet
  lf: 'LF', 'l.f.': 'LF', 'lin ft': 'LF', 'lin. ft.': 'LF', 'linear feet': 'LF',
  'linear foot': 'LF', ft: 'LF', feet: 'LF', lft: 'LF', ml: 'LF', meter: 'LF', meters: 'LF',
  // Each / Item
  ea: 'EA', 'e.a.': 'EA', each: 'EA', pcs: 'EA', piece: 'EA', pieces: 'EA',
  item: 'EA', items: 'EA', count: 'EA', un: 'EA', und: 'EA', unit: 'EA', units: 'EA',
  // Cubic Yards
  cy: 'CY', 'c.y.': 'CY', 'cu yd': 'CY', 'cu. yd.': 'CY', 'cu yds': 'CY', 'cu. yds.': 'CY',
  'cubic yards': 'CY', 'cubic yard': 'CY', yds3: 'CY', yd3: 'CY', m3: 'CY',
  // Square Feet
  sf: 'SF', 's.f.': 'SF', 'sq ft': 'SF', 'sq. ft.': 'SF', 'sq feet': 'SF',
  'square feet': 'SF', 'square foot': 'SF', ft2: 'SF', sqft: 'SF', m2: 'SF',
  // Tons
  tn: 'TON', 't.n.': 'TON', ton: 'TON', tons: 'TON', 'tn.': 'TON', tonne: 'TON', tonnes: 'TON',
  // Lump Sum
  ls: 'LS', 'l.s.': 'LS', lump: 'LS', 'lump sum': 'LS', gl: 'LS', global: 'LS',
  // Hours
  hr: 'HR', hrs: 'HR', hour: 'HR', hours: 'HR',
};

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
 */
export function normalizeUnit(rawUnit = '') {
  if (!rawUnit) return 'LF';
  const clean = String(rawUnit).trim().toLowerCase().replace(/[^a-z0-9.]/g, '');
  return UNIT_NORMALIZATIONS[clean] || rawUnit.toUpperCase().trim().slice(0, 6) || 'LF';
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

  // Check for accounting negative (123.45)
  let isNegative = false;
  if (/^\((.*)\)$/.test(str)) {
    isNegative = true;
    str = str.replace(/^\((.*)\)$/, '$1');
  }

  // Check for embedded unit suffixes
  const unitMatch = str.match(/(cu\s*yd|cy|sq\s*ft|sf|lf|ft|ea|pcs|pallet|tn|ton|hrs?|ls)/i);
  let extractedUnit = null;
  if (unitMatch) {
    extractedUnit = normalizeUnit(unitMatch[0]);
  }

  // Remove currency symbols, commas, trailing text, non-numeric artifacts
  // Keep decimals and hyphens
  const cleaned = str.replace(/[$€£,\s]/g, '').replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return NaN;

  const num = Number(cleaned) * (isNegative ? -1 : 1);
  return Number.isNaN(num) ? NaN : num;
}

/**
 * Extract embedded units & clean number from composite cells.
 */
export function parseQuantityAndUnit(rawVal, fallbackUnit = 'LF') {
  if (rawVal === null || rawVal === undefined) return { quantity: 0, unit: fallbackUnit };
  if (typeof rawVal === 'number') return { quantity: rawVal, unit: fallbackUnit };

  const str = String(rawVal).trim();
  const unitMatch = str.match(/(cu\s*yds?|c\.y\.|cy|sq\s*ft|s\.f\.|sf|linear\s*feet|lin\s*ft|lf|feet|ft|each|ea|pcs|tn|tons?|hrs?|ls)/i);
  const detectedUnit = unitMatch ? normalizeUnit(unitMatch[0]) : fallbackUnit;
  const num = cleanNumericValue(str);

  return {
    quantity: Number.isNaN(num) ? 0 : num,
    unit: detectedUnit || fallbackUnit,
  };
}

/**
 * Deconstruct composite description string if size or pipe diameter is embedded inside it.
 * e.g. "8\" PVC SDR-35 Mainline" -> { description: "Mainline", sizeSpec: "8\" PVC SDR-35" }
 */
export function deconstructDescription(rawDesc = '', currentSize = '', customT = null) {
  const t = customT || getTranslation;
  if (currentSize && currentSize.trim() !== '') {
    return { description: rawDesc.trim(), sizeSpec: currentSize.trim() };
  }

  const desc = String(rawDesc || '').trim();
  // Match common pipe size patterns: 6", 8-Inch, 24" x 24", 12' HDPE, etc.
  const sizeMatch = desc.match(/(\d+(?:\.\d+)?(?:\/\d+)?(?:\s*(?:\"|inch|in|')|\s*-\s*inch)?(?:\s*(?:pvc|hdpe|rcp|dip|c900|sdr-?\d+|class\s*\d+|type\s*[a-z0-9]+|dia|diameter|precast|iron))?)/i);

  if (sizeMatch && sizeMatch[0].length >= 2) {
    const sizeSpec = sizeMatch[0].trim();
    let cleanDesc = desc.replace(sizeSpec, '').replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();
    if (!cleanDesc) cleanDesc = desc;
    return { description: cleanDesc, sizeSpec };
  }

  return { description: desc, sizeSpec: currentSize || t('csvParser.defaultSizeSpec') };
}

/**
 * Dynamic 2D Header Sniffer:
 * Inspects a matrix of raw 2D array rows and scores each row based on density of non-empty text,
 * keyword matches against canonical estimating fields, and lack of numeric-only data.
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

  for (let r = 0; r < maxScanRows; r++) {
    const row = matrix[r] || [];
    let textCells = 0;
    let keywordMatches = 0;
    let numericCells = 0;
    let emptyCells = 0;

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
        if (allKeywords.some((kw) => cleanCell.includes(kw) || kw.includes(cleanCell))) {
          keywordMatches++;
        }
      }
    });

    // Heuristic score: heavily reward keyword matches and text density, penalize pure numeric data rows
    const score = (keywordMatches * 6) + (textCells * 2) - (numericCells * 4) - (emptyCells * 0.5);
    if (score > highestScore && keywordMatches > 0) {
      highestScore = score;
      bestRowIndex = r;
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
    confidence: Math.max(0.5, Math.min(1.0, highestScore / 20)),
  };
}

/**
 * Multi-layer deterministic fuzzy column alias matcher with Levenshtein & data-type profiling lookahead.
 */
export function autoDetectColumnMapping(headers = [], sampleDataRows = []) {
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

      for (const alias of aliases) {
        // Direct substring match
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
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

  // 3. Column Data-Type Profiling Lookahead (Break ties on unmapped fields)
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

  // 1. Check for empty row
  if (rowValues.every((v) => v === '')) {
    return { type: 'empty' };
  }

  // 2. Check for Subtotal / Grand Total / Formula Summary Row
  if (
    /^(total|subtotal|sub-total|sum|summary|grand\s*total|balance|net\s*total)/i.test(rowText) ||
    rowValues.some((v) => /^=(sum|subtotal)/i.test(v))
  ) {
    const qtyVal = mapping.quantity ? cleanNumericValue(rawRow[mapping.quantity]) : NaN;
    return {
      type: 'subtotal',
      extractedTotal: Number.isNaN(qtyVal) ? null : qtyVal,
    };
  }

  // 3. Check for Metadata / Notes / Signatures
  if (
    /(page\s*\d+\s*of\s*\d+|prepared\s*by|approved\s*by|terms\s*and\s*conditions|date:|authorized\s*signature|notice:|disclaimer)/i.test(rowText)
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
export function normalizeRowsWithMapping(rawRows = [], mapping = {}, customT = null) {
  const t = customT || getTranslation;
  const errors = [];
  const items = [];
  let currentGroup = t('csvParser.defaultCategory');
  let totalDetectedSubtotals = 0;
  let parsedQuantitySum = 0;

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
    const rawSystem = mapping.system ? String(rawRow[mapping.system] ?? '').trim() : '';
    const rawDescription = mapping.item_description ? String(rawRow[mapping.item_description] ?? '').trim() : '';
    const rawSize = mapping.size_spec ? String(rawRow[mapping.size_spec] ?? '').trim() : '';
    const rawUnit = mapping.unit ? String(rawRow[mapping.unit] ?? '').trim() : '';
    const rawQty = mapping.quantity ? rawRow[mapping.quantity] : undefined;

    // Use currentGroup as fallback if system is blank on row
    const system = rawSystem || currentGroup || t('csvParser.defaultCategory');

    // Deconstruct description & size if size is embedded in description
    const { description, sizeSpec } = deconstructDescription(rawDescription, rawSize, t);

    // Extract quantity and embedded unit
    const { quantity, unit: detectedUnit } = parseQuantityAndUnit(rawQty, rawUnit ? normalizeUnit(rawUnit) : 'LF');

    if (!description && !rawSize) {
      // Row has no identifying text description
      return;
    }

    if (Number.isNaN(quantity) || quantity <= 0) {
      // If quantity is missing or 0 on an explicit item, record error
      if (description) {
        errors.push(t('csvParser.errors.invalidRowQuantity', { row: rowNum, description, rawQty: rawQty !== undefined ? rawQty : '' }));
      }
      return;
    }

    // Depth extraction
    let avgDepthFt = 0;
    if (mapping.avg_depth_ft && rawRow[mapping.avg_depth_ft] !== undefined && rawRow[mapping.avg_depth_ft] !== '') {
      const depthNum = cleanNumericValue(rawRow[mapping.avg_depth_ft]);
      if (!Number.isNaN(depthNum)) {
        avgDepthFt = depthNum;
      }
    }

    parsedQuantitySum += quantity;

    items.push({
      id: nextId(),
      system,
      description: description || t('csvParser.defaultDescription'),
      sizeSpec: sizeSpec || t('csvParser.defaultSizeSpec'),
      quantity,
      unit: detectedUnit || 'LF',
      avgDepthFt,
      materialCostPerUnit: 0,
      laborHoursPerUnit: 0,
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
 * Parses raw CSV into 2D matrix and JSON objects using dynamic sniffing.
 */
export function parseRawCsv(fileOrText) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrText, {
      skipEmptyLines: false,
      complete: (results) => {
        const matrix = results.data || [];
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
          sampleMatrix: matrix.slice(0, 15),
          headerRowIndex,
          confidence,
          sheetNames: [getTranslation('csvParser.errors.csvUploadSheet')],
          activeSheetName: getTranslation('csvParser.errors.csvUploadSheet'),
          parseErrors: results.errors || [],
        });
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Multi-worksheet smart Excel (.xlsx, .xls, .xlsm, .xlsb) parser.
 * Unmerges merged cells, auto-scores worksheet tabs for takeoff content, and sniffs headers.
 */
export async function parseRawExcel(file, selectedSheetName = null) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellFormula: true, cellDates: true });

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

  // Convert worksheet to raw 2D array matrix for sniffing
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
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
    sampleMatrix: matrix.slice(0, 15),
    headerRowIndex,
    confidence,
    sheetNames,
    activeSheetName: targetSheetName,
    parseErrors: [],
  };
}

const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.xlsb'];

export function isExcelFile(file) {
  const name = (file?.name || '').toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Saved Vendor / Subcontractor Presets Management (LocalStorage)
 */
const PRESETS_STORAGE_KEY = 'takeoff_engine_vendor_presets';

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
 * Prompts interactive column mapping modal if confidence < 90% or required fields unmapped.
 */
export async function parseTakeoffFile(file, sheetName = null, customPreset = null, customT = null) {
  const t = customT || getTranslation;
  let rawData;
  if (isExcelFile(file)) {
    rawData = await parseRawExcel(file, sheetName);
  } else {
    rawData = await parseRawCsv(file);
  }

  const { headers, rows, sheetNames, activeSheetName, sampleMatrix, headerRowIndex, confidence: headerConfidence, parseErrors } = rawData;

  if (!rows || rows.length === 0) {
    return {
      items: [],
      errors: [t('csvParser.errors.emptyOrNoRows')],
      sheetNames: sheetNames || [],
      activeSheetName,
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

  // If required fields are unmapped or confidence is below 90%, fallback to confirmation UI
  const missingRequired = TARGET_FIELDS.filter((f) => f.required && !effectiveMapping[f.key]).map((f) => f.key);

  if (missingRequired.length > 0 || overallConfidence < 0.90) {
    return {
      requiresMappingModal: true,
      headers,
      rawRows: rows,
      currentMapping: effectiveMapping,
      unmappedRequired: missingRequired,
      matchConfidences,
      overallConfidence,
      sampleMatrix,
      headerRowIndex,
      sheetNames: sheetNames || [],
      activeSheetName,
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
