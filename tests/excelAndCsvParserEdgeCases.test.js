import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeCellString,
  parseMultilineCell,
  cleanFormulaError,
  cleanNumericValue,
  detectSideBySideTables,
  sniffHeaderBoundary,
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
});
