import { describe, it } from 'node:test';
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
} from '../src/lib/csv.js';

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
});
