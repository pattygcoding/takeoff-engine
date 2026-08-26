import { describe, it } from 'vitest';
import assert from 'node:assert';
import {
  sanitizeCellString,
  parseMultilineCell,
  cleanFormulaError,
  cleanNumericValue,
  detectSideBySideTables,
  sniffHeaderBoundary,
  extractHeadersAndRowsAtHeaderRow,
  normalizeRowsWithMapping,
  deconstructDescription,
  normalizeUnit,
  parseRawExcel,
  autoDetectColumnMapping,
} from '@/lib/product/csv.js';
import * as XLSX from 'xlsx';

describe('Excel & CSV Import Edge Cases (US-031 / 4 Friction Points)', () => {
  describe('1. Side-by-Side (Multi-Table) Sheets', () => {
    it('detects two horizontal side-by-side tables separated by empty column gaps', () => {
      // Table 1 (Domestic Water): Cols 0..3
      // Gap: Col 4
      // Table 2 (Sanitary Sewer): Cols 5..8
      const matrix = [
        ['System', 'Item Description', 'Size / Spec', 'Quantity', '', 'System', 'Item Description', 'Size / Spec', 'Quantity'],
        ['Domestic Water', 'Gate Valve', '6" DI', '3', '', 'Sanitary', 'Manhole', '48" Precast', '2'],
        ['Domestic Water', 'C900 Pipe', '8" PVC', '150', '', 'Sanitary', 'SDR-35 Pipe', '8" PVC', '320'],
      ];

      const subTables = detectSideBySideTables(matrix);
      assert.strictEqual(subTables.length, 2, 'Should detect 2 distinct sub-tables');
      assert.strictEqual(subTables[0].headers.length, 4);
      assert.strictEqual(subTables[0].rows.length, 2);
      assert.strictEqual(subTables[0].rows[0]['System'], 'Domestic Water');

      assert.strictEqual(subTables[1].headers.length, 4);
      assert.strictEqual(subTables[1].rows.length, 2);
      assert.strictEqual(subTables[1].rows[0]['System'], 'Sanitary');
    });

    it('returns empty array when matrix has only a single contiguous table', () => {
      const singleTable = [
        ['System', 'Item Description', 'Size / Spec', 'Quantity'],
        ['Storm', 'Catch Basin', '24" Precast', '5'],
      ];
      const subTables = detectSideBySideTables(singleTable);
      assert.strictEqual(subTables.length, 0, 'Single table should not return sub-tables');
    });
  });

  describe('2. Visual Multi-Line Wraps & Manual Line Breaks (Alt + Enter)', () => {
    it('sanitizes embedded CRLF/newlines into single clean spaces', () => {
      const messyCell = '8" SDR-35\r\nClass 1 Bedding\nExcludes tapping sleeve';
      const cleaned = sanitizeCellString(messyCell);
      assert.strictEqual(cleaned, '8" SDR-35 Class 1 Bedding Excludes tapping sleeve');
    });

    it('splits multiline cell into primary description and scope notes', () => {
      const multiline = '8" SDR-35 Gravity Main\nClass 1 Bedding\nExcludes tapping sleeve';
      const parsed = parseMultilineCell(multiline);
      assert.strictEqual(parsed.primaryText, '8" SDR-35 Gravity Main');
      assert.strictEqual(parsed.notes, 'Class 1 Bedding | Excludes tapping sleeve');
    });

    it('handles non-string or clean inputs gracefully', () => {
      assert.strictEqual(sanitizeCellString(null), '');
      assert.strictEqual(sanitizeCellString(1250), '1250');
      assert.strictEqual(sanitizeCellString('Clean Pipe'), 'Clean Pipe');
    });
  });

  describe('3. Broken External References & Formulas (#REF!, #VALUE!, #N/A)', () => {
    it('cleans formula error tokens to null', () => {
      assert.strictEqual(cleanFormulaError('#REF!'), null);
      assert.strictEqual(cleanFormulaError('#VALUE!'), null);
      assert.strictEqual(cleanFormulaError('#N/A'), null);
      assert.strictEqual(cleanFormulaError('#NAME?'), null);
      assert.strictEqual(cleanFormulaError('#DIV/0!'), null);
      assert.strictEqual(cleanFormulaError('1250'), '1250');
    });

    it('returns NaN for numeric parsing when cell is a broken formula', () => {
      assert.ok(Number.isNaN(cleanNumericValue('#REF!')));
      assert.ok(Number.isNaN(cleanNumericValue('#VALUE!')));
      assert.ok(Number.isNaN(cleanNumericValue('#N/A')));
      assert.strictEqual(cleanNumericValue('1,250.50'), 1250.5);
    });

    it('captures an invalid row error when quantity evaluates to broken formula', () => {
      const rawRows = [
        {
          system: 'Water',
          item_description: 'Broken Pipe Reference',
          size_spec: '6"',
          quantity: '#REF!',
          unit: 'LF',
        },
      ];
      const mapping = {
        system: 'system',
        item_description: 'item_description',
        size_spec: 'size_spec',
        quantity: 'quantity',
        unit: 'unit',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping);
      assert.strictEqual(result.items.length, 0, 'Broken item should not be imported');
      assert.strictEqual(result.errors.length, 1);
      assert.ok(result.errors[0].includes('Missing or invalid numeric quantity'));
    });
  });

  describe('4. Hidden Rows & Strikethrough Scope Elimination Handling', () => {
    it('normalizes valid rows while stripping sanitized whitespace', () => {
      const rawRows = [
        {
          system: 'Storm\r\nDrainage',
          item_description: '18" RCP Pipe\nClass III',
          size_spec: '18" RCP',
          quantity: '450',
          unit: 'LF',
          avg_depth_ft: '6.5',
        },
      ];
      const mapping = {
        system: 'system',
        item_description: 'item_description',
        size_spec: 'size_spec',
        quantity: 'quantity',
        unit: 'unit',
        avg_depth_ft: 'avg_depth_ft',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping);
      assert.strictEqual(result.items.length, 1);
      assert.strictEqual(result.items[0].system, 'Storm Drainage');
      assert.strictEqual(result.items[0].quantity, 450);
      assert.strictEqual(result.items[0].avgDepthFt, 6.5);
    });

    it('filters out hidden rows when parsing raw Excel worksheets', async () => {
      // Create an Excel workbook in memory with a header row, active rows, and a hidden row
      const ws_data = [
        ['System', 'Item Description', 'Size / Spec', 'Quantity', 'Unit'],
        ['Plumbing', '4" Schedule 40 PVC Drain', '4" SCH 40', '120', 'LF'],
        ['Plumbing', '4" Two-Way Cleanout Assembly (Deleted per Addendum 3)', '4"', '2', 'EA'],
        ['Plumbing', 'Floor Drain 3" Nickel Bronze Strainer', '3"', '6', 'EA'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      // Mark row index 2 (1-based row 3) as hidden
      ws['!rows'] = [
        { hidden: false },
        { hidden: false },
        { hidden: true },
        { hidden: false },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Takeoff');

      const rawBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // Mock File object
      const mockFile = {
        name: 'takeoff_hidden_row.xlsx',
        arrayBuffer: async () => rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength),
      };

      const parsed = await parseRawExcel(mockFile);
      assert.strictEqual(parsed.rows.length, 2, 'Hidden row (4" Two-Way Cleanout Assembly) must be filtered out');
      assert.strictEqual(parsed.rows[0]['Item Description'], '4" Schedule 40 PVC Drain');
      assert.strictEqual(parsed.rows[1]['Item Description'], 'Floor Drain 3" Nickel Bronze Strainer');
    });
  });

  describe('5. True Header Row Sniffing Past Merged Title Rows & Header Selection', () => {
    it('automatically skips top merged title banners and locates the true header row at Row 5 (index 4)', () => {
      const sheetWithBanner = [
        ['PROJECT TAKEOFF: Phase 2 - Commercial Buildout (DRAFT)', '', '', '', ''],
        ['General Contractor: ACME Heavy Civil', '', '', '', ''],
        ['Date: October 24, 2024', '', '', '', ''],
        ['', '', '', '', ''],
        ['Trade / System', 'Item Description', 'Size / Spec', 'Estimated Qty', 'UOM'],
        ['Sanitary Sewer', '8" SDR-35 PVC Pipe', '8 Inch', '450', 'LF'],
        ['Sanitary Sewer', '48" Sanitary Manhole', '48" Dia', '3', 'EA'],
      ];

      const { headerRowIndex, headers } = sniffHeaderBoundary(sheetWithBanner);
      assert.strictEqual(headerRowIndex, 4, 'Should detect Row 5 (index 4) as the true header row');
      assert.deepStrictEqual(headers, ['Trade / System', 'Item Description', 'Size / Spec', 'Estimated Qty', 'UOM']);
    });

    it('supports manually extracting headers and rows at any chosen row index', () => {
      const matrix = [
        ['Company Confidential - Project Estimator'],
        ['Notes: All quantities subject to field verification'],
        ['Trade', 'Description', 'Size', 'Qty', 'Unit'],
        ['Water', 'Gate Valve', '6" DI', '4', 'EA'],
      ];

      const result = extractHeadersAndRowsAtHeaderRow(matrix, 2);
      assert.strictEqual(result.headerRowIndex, 2);
      assert.deepStrictEqual(result.headers, ['Trade', 'Description', 'Size', 'Qty', 'Unit']);
      assert.strictEqual(result.rows.length, 1);
      assert.strictEqual(result.rows[0]['Description'], 'Gate Valve');
      assert.strictEqual(result.rows[0]['Qty'], '4');
    });
  });

  describe('6. Data Sanitization & Mapping Deficiencies (Bug Report Fixes)', () => {
    it('Issue 1: parses formatted currency strings and prices under materialCostPerUnit ($42.50, $1,350.00)', () => {
      const rawRows = [
        {
          system: 'Electrical',
          item_description: 'Panelboard 200A',
          size_spec: '200A 3P 4W',
          quantity: '2',
          unit: 'EA',
          material_cost_per_unit: '$1,350.00',
        },
        {
          system: 'Civil',
          item_description: 'Aggregate Base',
          size_spec: '3/4" Crushed',
          quantity: '500',
          unit: 'TON',
          material_cost_per_unit: ' $42.50 ',
        },
      ];

      const mapping = {
        system: 'system',
        item_description: 'item_description',
        size_spec: 'size_spec',
        quantity: 'quantity',
        unit: 'unit',
        material_cost_per_unit: 'material_cost_per_unit',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping);
      assert.strictEqual(result.items.length, 2);
      assert.strictEqual(result.items[0].materialCostPerUnit, 1350);
      assert.strictEqual(result.items[1].materialCostPerUnit, 42.5);
    });

    it('Issue 2: expands UOM aliases (TONS, EA, m², SQ FT, CY, SY) and preserves unmatched custom raw units without forcing LF', () => {
      const rawRows = [
        { system: 'Metals', item_description: 'Steel Beam', size_spec: 'W12x26', quantity: '10', unit: 'TONS' },
        { system: 'Finishes', item_description: 'Drywall Partition', size_spec: '5/8" Type X', quantity: '250', unit: 'm²' },
        { system: 'Paving', item_description: 'Asphalt Top Coat', size_spec: '2 Inch', quantity: '800', unit: 'SQ YDS' },
        { system: 'Specialty', item_description: 'Geotextile Fabric', size_spec: 'Non-woven', quantity: '5', unit: 'ROLLS' },
      ];

      const mapping = {
        system: 'system',
        item_description: 'item_description',
        size_spec: 'size_spec',
        quantity: 'quantity',
        unit: 'unit',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping);
      assert.strictEqual(result.items[0].unit, 'TON');
      assert.strictEqual(result.items[1].unit, 'SF');
      assert.strictEqual(result.items[2].unit, 'SY');
      assert.strictEqual(result.items[3].unit, 'ROLLS', 'Unmatched custom unit should preserve raw string in uppercase');
    });

    it('Issue 3: retains accounting-formatted negative rows e.g. (350.00) / -$6,680.00 for deductive change orders', () => {
      const rawRows = [
        {
          system: '05 - Metals',
          item_description: 'Cold-Formed Metal Joist Framing (Deduction)',
          size_spec: '10K1',
          quantity: '(350.00)',
          unit: 'LF',
          material_cost_per_unit: '$19.0857',
        },
      ];

      const mapping = {
        system: 'system',
        item_description: 'item_description',
        size_spec: 'size_spec',
        quantity: 'quantity',
        unit: 'unit',
        material_cost_per_unit: 'material_cost_per_unit',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping);
      assert.strictEqual(result.items.length, 1, 'Deductive change order row must not be dropped');
      assert.strictEqual(result.items[0].quantity, -350);
      assert.strictEqual(result.items[0].materialCostPerUnit, 19.0857);
    });

    it('Issue 4: maps CSI codes and MasterFormat division prefixes (02-31-00, 03 21 00, 09 22 00, 26 24 16) directly to internal trade systems', () => {
      const rawRows = [
        { system: '02-31-00', item_description: 'Rough Grading', size_spec: 'Site Prep', quantity: '1000', unit: 'CY' },
        { system: '03 21 00', item_description: 'Reinforcing Steel', size_spec: '#4 Rebar', quantity: '5', unit: 'TON' },
        { system: '09 22 00', item_description: 'Non-Structural Metal Framing', size_spec: '3-5/8" Studs', quantity: '400', unit: 'LF' },
        { system: '26 24 16', item_description: 'Panelboard', size_spec: '400A', quantity: '1', unit: 'EA' },
      ];

      const mapping = {
        system: 'system',
        item_description: 'item_description',
        size_spec: 'size_spec',
        quantity: 'quantity',
        unit: 'unit',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping);
      assert.strictEqual(result.items[0].system, '02 - Existing Conditions');
      assert.strictEqual(result.items[1].system, '03 - Concrete');
      assert.strictEqual(result.items[2].system, '09 - Finishes');
      assert.strictEqual(result.items[3].system, '26 - Electrical');
    });

    it('Issue 5: ingests placeholder tokens (TBD, N/A, HOLD, BY OTHERS) with quantity 0 and missing scope badge metadata', () => {
      const rawRows = [
        {
          system: '26 24 16',
          item_description: 'Switchboard 2000A Main Service',
          size_spec: '2000A NEMA 3R',
          quantity: 'TBD',
          unit: 'EA',
          material_cost_per_unit: '$0.00',
        },
        {
          system: '33 - Utilities',
          item_description: 'Water Main Connection Tap',
          size_spec: '8" Hot Tap',
          quantity: 'N/A',
          unit: 'EA',
        },
      ];

      const mapping = {
        system: 'system',
        item_description: 'item_description',
        size_spec: 'size_spec',
        quantity: 'quantity',
        unit: 'unit',
        material_cost_per_unit: 'material_cost_per_unit',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping);
      assert.strictEqual(result.items.length, 2, 'Placeholder items must be ingested instead of silently rejected');
      assert.strictEqual(result.items[0].quantity, 0);
      assert.strictEqual(result.items[0].hasMissingScope, true);
      assert.strictEqual(result.items[0].missingScopeReason, 'TBD');
      assert.strictEqual(result.items[1].quantity, 0);
      assert.strictEqual(result.items[1].hasMissingScope, true);
      assert.strictEqual(result.items[1].missingScopeReason, 'N/A');
    });
  });

  describe('7. Standard Construction & Plumbing Data Model Alignments', () => {
    it('1. Labor Hours vs Labor Cost: maps labor productivity hours and calculates hours from labor $/unit using hourly billing rate', () => {
      const rawRows = [
        {
          system: 'Plumbing',
          item_description: 'Water Heater 50 Gal',
          size_spec: '50 Gallon Gas',
          quantity: '2',
          unit: 'EA',
          labor_hours_per_unit: '4.5',
        },
        {
          system: 'Sanitary',
          item_description: 'Cleanout Assembly',
          size_spec: '4" PVC',
          quantity: '6',
          unit: 'EA',
          labor_unit_cost: '$130.00', // At $65/hr -> 2.0 hrs/unit
        },
      ];

      const mapping = {
        system: 'system',
        item_description: 'item_description',
        size_spec: 'size_spec',
        quantity: 'quantity',
        unit: 'unit',
        labor_hours_per_unit: 'labor_hours_per_unit',
        labor_unit_cost: 'labor_unit_cost',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping, null, 65.0);
      assert.strictEqual(result.items[0].laborHoursPerUnit, 4.5);
      assert.strictEqual(result.items[1].laborHoursPerUnit, 2);
      assert.strictEqual(result.items[1].laborUnitCost, 130);
    });

    it('2. Size / Spec deconstruction and string fallback: never defaults to numeric 0 and extracts embedded pipe spec from description', () => {
      const rawRows = [
        {
          system: 'Plumbing',
          item_description: '2-1/2" Type L Copper Domestic Water Piping',
          quantity: '180',
          unit: 'LF',
        },
        {
          system: 'HVAC',
          item_description: 'Exhaust Fan Roof Mount',
          quantity: '3',
          unit: 'EA',
        },
      ];

      const mapping = {
        system: 'system',
        item_description: 'item_description',
        quantity: 'quantity',
        unit: 'unit',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping);
      assert.strictEqual(result.items[0].sizeSpec, '2-1/2" Type L Copper');
      assert.strictEqual(result.items[0].description, 'Domestic Water Piping');
      assert.strictEqual(result.items[1].sizeSpec, '', 'Missing sizeSpec should be empty string, never numeric 0');

      // Test masonry dimension extraction: 8x8x16
      const masonryRow = [{ system: 'Masonry', item_description: 'Architectural Concrete Masonry Units 8x8x16', quantity: '100', unit: 'EA' }];
      const masonryResult = normalizeRowsWithMapping(masonryRow, mapping);
      assert.strictEqual(masonryResult.items[0].sizeSpec, '8x8x16');
      assert.strictEqual(masonryResult.items[0].description, 'Architectural Concrete Masonry Units');
    });

    it('2b. Derived labor hours rounds to 2 decimal places to avoid floating-point drift', () => {
      const rawRows = [
        {
          system: 'Electrical',
          item_description: 'Service Entrance Cable',
          quantity: '100',
          unit: 'LF',
          labor_unit_cost: '$14.27', // $14.27 / 65 = 0.219538... -> 0.22
        },
        {
          system: 'Drywall',
          item_description: 'Sheetrock 5/8',
          quantity: '500',
          unit: 'SF',
          labor_unit_cost: '$8.75', // $8.75 / 65 = 0.134615... -> 0.13
        },
      ];

      const mapping = {
        system: 'system',
        item_description: 'item_description',
        quantity: 'quantity',
        unit: 'unit',
        labor_unit_cost: 'labor_unit_cost',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping, null, 65.0);
      assert.strictEqual(result.items[0].laborHoursPerUnit, 0.22);
      assert.strictEqual(result.items[1].laborHoursPerUnit, 0.13);
    });

    it('3. Optional Trench / Civil Dimensions: preserves null when avg_depth_ft column is omitted from sheet', () => {
      const rawRows = [
        {
          system: 'Electrical',
          item_description: 'Conduit 2" EMT',
          size_spec: '2" EMT',
          quantity: '200',
          unit: 'LF',
        },
      ];

      const mappingWithoutDepth = {
        system: 'system',
        item_description: 'item_description',
        size_spec: 'size_spec',
        quantity: 'quantity',
        unit: 'unit',
      };

      const result = normalizeRowsWithMapping(rawRows, mappingWithoutDepth);
      assert.strictEqual(result.items[0].avgDepthFt, null, 'Omitted avg_depth_ft should be null');
    });

    it('4. Placeholder Scope & Cost Flags: detects placeholders (TBD, N/A, PENDING, HOLD, UNKNOWN) in cost cells and sets has_placeholder_scope flag', () => {
      const rawRows = [
        {
          system: 'Masonry',
          item_description: 'Concrete Masonry Unit 8x8x16',
          size_spec: '8x8x16 Lightweight',
          quantity: '1200',
          unit: 'EA',
          material_cost_per_unit: 'N/A',
          labor_unit_cost: 'TBD',
        },
        {
          system: 'Site Utilities',
          item_description: '6" Storm Drain SDR-35',
          size_spec: 'SDR-35',
          quantity: '500',
          unit: 'cu. yds',
          material_cost_per_unit: 'HOLD',
          labor_unit_cost: 'UNKNOWN',
        },
      ];

      const mapping = {
        system: 'system',
        item_description: 'item_description',
        size_spec: 'size_spec',
        quantity: 'quantity',
        unit: 'unit',
        material_cost_per_unit: 'material_cost_per_unit',
        labor_unit_cost: 'labor_unit_cost',
      };

      const result = normalizeRowsWithMapping(rawRows, mapping);
      assert.strictEqual(result.items[0].has_placeholder_scope, true);
      assert.strictEqual(result.items[0].hasMissingScope, true);
      assert.strictEqual(result.items[0].materialCostPerUnit, 0);
      assert.strictEqual(result.items[0].missingScopeReason, 'N/A');

      assert.strictEqual(result.items[1].has_placeholder_scope, true);
      assert.strictEqual(result.items[1].unit, 'CY');
      assert.strictEqual(result.items[1].materialCostPerUnit, 0);
      assert.strictEqual(result.items[1].laborHoursPerUnit, 0);
      assert.strictEqual(result.items[1].missingScopeReason, 'HOLD');
    });

    it('5. Refined composite size extraction: prioritizes compound specs like SDR-35, SCH-40 over bare numbers', () => {
      const testCases = [
        { input: 'Direct Burial SDR-35', expectedSize: 'SDR-35', expectedDesc: 'Direct Burial' },
        { input: '4" SCH-40 PVC Conduit', expectedSize: '4" SCH-40 PVC', expectedDesc: 'Conduit' },
        { input: '8x8x16 CMU Block', expectedSize: '8x8x16', expectedDesc: 'CMU Block' },
        { input: 'Reinforced Concrete Pipe Class III', expectedSize: 'Class III', expectedDesc: 'Reinforced Concrete Pipe' },
      ];

      for (const tc of testCases) {
        const { cleanDescription, sizeSpec } = deconstructDescription(tc.input);
        assert.strictEqual(sizeSpec, tc.expectedSize, `Failed size extraction for: ${tc.input}`);
        assert.strictEqual(cleanDescription, tc.expectedDesc, `Failed desc extraction for: ${tc.input}`);
      }
    });

    it('6. Expanded UOM normalization: converts plural and dotted variants to standard abbreviations', () => {
      const uomCases = [
        { raw: 'cu. yds', expected: 'CY' },
        { raw: 'cu. yd.', expected: 'CY' },
        { raw: 'cu yds', expected: 'CY' },
        { raw: 'sq. yds', expected: 'SY' },
        { raw: 'l.f.', expected: 'LF' },
        { raw: 'ft.', expected: 'LF' },
        { raw: 'hrs.', expected: 'HR' },
        { raw: 'm³', expected: 'CY' },
      ];

      for (const { raw, expected } of uomCases) {
        assert.strictEqual(normalizeUnit(raw), expected, `UOM mismatch for '${raw}'`);
      }
    });

    it('7. Benchmark header mapping: avoids mapping Item # into item_description and maps Scope / Line Item Description', () => {
      const benchmarkHeaders = [
        'Item #',
        'CSI MasterFormat',
        'Scope / Line Item Description',
        'Est Qty',
        'UOM',
        'Material Unit Rate',
        'Labor Unit Rate'
      ];
      const { mapping } = autoDetectColumnMapping(benchmarkHeaders);

      assert.strictEqual(mapping.system, 'CSI MasterFormat');
      assert.strictEqual(mapping.item_description, 'Scope / Line Item Description');
      assert.strictEqual(mapping.quantity, 'Est Qty');
      assert.strictEqual(mapping.unit, 'UOM');
      assert.strictEqual(mapping.material_cost_per_unit, 'Material Unit Rate');
      assert.strictEqual(mapping.labor_unit_cost, 'Labor Unit Rate');
    });

    it('8. Civil bid sheet with Pipe Size / Dimension, UOM, extensions, and trailer summary rows', () => {
      const civilHeaders = [
        'Item Description',
        'Pipe Size / Dimension',
        'Avg Depth (ft)',
        'Takeoff Qty',
        'UOM',
        'Material Cost / Unit',
        'Labor Cost / Unit',
        'Equipment Rate',
        'Total Mat Extension',
        'Total Lbr Extension',
        'Total Line Budget',
      ];

      const { mapping, unmappedRequired } = autoDetectColumnMapping(civilHeaders);
      assert.deepStrictEqual(unmappedRequired, ['system']); // System/Trade header is absent in single-discipline civil sheet
      assert.strictEqual(mapping.item_description, 'Item Description');
      assert.strictEqual(mapping.size_spec, 'Pipe Size / Dimension');
      assert.strictEqual(mapping.avg_depth_ft, 'Avg Depth (ft)');
      assert.strictEqual(mapping.quantity, 'Takeoff Qty');
      assert.strictEqual(mapping.unit, 'UOM');
      assert.strictEqual(mapping.material_cost_per_unit, 'Material Cost / Unit');
      assert.strictEqual(mapping.labor_unit_cost, 'Labor Cost / Unit');

      const rawRows = [
        {
          'Item Description': 'RCP Storm Pipe',
          'Pipe Size / Dimension': '18" RCP Bell & Spigot',
          'Avg Depth (ft)': '6.2',
          'Takeoff Qty': '1,420',
          'UOM': 'LF',
          'Material Cost / Unit': '$34.50',
          'Labor Cost / Unit': '$18.00',
          'Equipment Rate': '$14.50',
          'Total Mat Extension': '$48,990.00',
          'Total Lbr Extension': '$46,150.00',
          'Total Line Budget': '$95,140.00',
        },
        {
          'Item Description': 'TOTAL BASE DIRECT CIVIL ESTIMATE',
          'Pipe Size / Dimension': '',
          'Avg Depth (ft)': '',
          'Takeoff Qty': '',
          'UOM': '',
          'Material Cost / Unit': '$434,726.00',
          'Labor Cost / Unit': '$619,185.00',
          'Equipment Rate': '',
          'Total Mat Extension': '',
          'Total Lbr Extension': '',
          'Total Line Budget': '$1,053,911.00',
        },
        {
          'Item Description': 'NPDES SWPPP & Erosion Control Compliance (3.5%)',
          'Pipe Size / Dimension': '',
          'Avg Depth (ft)': '',
          'Takeoff Qty': '',
          'UOM': '',
          'Material Cost / Unit': '',
          'Labor Cost / Unit': '',
          'Equipment Rate': '',
          'Total Mat Extension': '',
          'Total Lbr Extension': '',
          'Total Line Budget': '$36,886.89',
        },
      ];

      const { items, errors } = normalizeRowsWithMapping(rawRows, mapping);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].description, 'RCP Storm Pipe');
      assert.strictEqual(items[0].sizeSpec, '18" RCP Bell & Spigot');
      assert.strictEqual(items[0].quantity, 1420);
      assert.strictEqual(items[0].unit, 'LF');
      assert.strictEqual(items[0].avgDepthFt, 6.2);
      assert.strictEqual(items[0].materialCostPerUnit, 34.5);
      assert.strictEqual(errors.length, 0);
    });

    it('9. Ambiguous "Labor" header heuristics: differentiates $/unit vs hrs/unit based on values & formatting', () => {
      // Case A: Ambiguous "Labor" column with currency formatting & >10 values ($19.50) -> maps to labor_unit_cost
      const dollarHeaders = ['Description', 'Qty', 'Unit', 'Labor'];
      const dollarDataRows = [
        { Description: 'C900 Pipe', Qty: '100', Unit: 'LF', Labor: '$19.50' },
        { Description: 'Gate Valve', Qty: '2', Unit: 'EA', Labor: '$35.00' },
      ];
      const dollarMapping = autoDetectColumnMapping(dollarHeaders, dollarDataRows);
      assert.strictEqual(dollarMapping.mapping.labor_unit_cost, 'Labor');
      assert.strictEqual(dollarMapping.mapping.labor_hours_per_unit, undefined);

      // Ingestion with base rate $65/hr: $19.50 / $65 = 0.30 hrs/LF
      const normalizedDollar = normalizeRowsWithMapping(dollarDataRows, dollarMapping.mapping, null, 65.0);
      assert.strictEqual(normalizedDollar.items[0].laborHoursPerUnit, 0.3);
      assert.strictEqual(normalizedDollar.items[0].laborUnitCost, 19.5);
      assert.strictEqual(normalizedDollar.detectedLaborMode, 'cost', 'Labor $/unit column should auto-detect cost mode');

      // Case B: Ambiguous "Labor" column with small fractional production rates (0.05 hrs/LF) -> maps to labor_hours_per_unit
      const hoursDataRows = [
        { Description: 'C900 Pipe', Qty: '100', Unit: 'LF', Labor: '0.06' },
        { Description: 'Gate Valve', Qty: '2', Unit: 'EA', Labor: '0.75' },
      ];
      const hoursMapping = autoDetectColumnMapping(dollarHeaders, hoursDataRows);
      assert.strictEqual(hoursMapping.mapping.labor_hours_per_unit, 'Labor');
      assert.strictEqual(hoursMapping.mapping.labor_unit_cost, undefined);

      // Ingestion with base rate $65/hr: 0.06 hrs/LF * $65 = $3.90/LF
      const normalizedHours = normalizeRowsWithMapping(hoursDataRows, hoursMapping.mapping, null, 65.0);
      assert.strictEqual(normalizedHours.items[0].laborHoursPerUnit, 0.06);
      assert.strictEqual(normalizedHours.items[0].laborUnitCost, 3.9);
      assert.strictEqual(normalizedHours.detectedLaborMode, 'hours', 'Labor hrs/unit column should auto-detect hours mode');
    });
  });
});
