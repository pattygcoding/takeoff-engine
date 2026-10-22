import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CALCULATION_COLUMNS,
  CANONICAL_COLUMNS,
  MAX_COLUMN_WIDTH,
  MAX_CUSTOM_COLUMNS,
  MIN_COLUMN_WIDTH,
  addColumn,
  canonicalColumnDefinitions,
  clearCustomColumnValues,
  coerceCustomFieldValue,
  columnKeyFromLabel,
  customColumnsOf,
  documentColumns,
  formatColumnValue,
  getCustomFieldValue,
  hiddenColumns,
  inferTypeFromValues,
  isCalculationColumn,
  isCanonicalColumn,
  isNumericColumnType,
  mergeColumns,
  moveColumn,
  normalizeColumnWidth,
  normalizeCustomColumn,
  removeColumn,
  renameColumn,
  restoreColumn,
  setColumnIncludeInDocuments,
  setColumnType,
  setColumnWidth,
  setCustomFieldValue,
  visibleColumns,
} from '../../../src/product/lib/takeoffColumns.ts';

/** Mirrors the `t` fallback contract: the dictionary string, else the English fallback. */
const resolveLabel = (labelKey: string, fallback: string) => `${labelKey}|${fallback}`;

describe('Dynamic takeoff column helpers', () => {
  describe('mergeColumns', () => {
    it('always keeps every canonical column, in canonical order', () => {
      const merged = mergeColumns(null, resolveLabel);
      const canonical = merged.filter((column) => column.source === 'canonical');

      assert.equal(merged.length, CANONICAL_COLUMNS.length);
      assert.deepEqual(
        canonical.map((column) => column.key),
        CANONICAL_COLUMNS.map((column) => column.key),
      );
    });

    it('appends passthrough columns and ignores canonical entries from the incoming schema', () => {
      const merged = mergeColumns(
        [
          { key: 'quantity', label: 'Quantity', type: 'number', field: 'quantity', source: 'canonical' },
          { key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported' },
          { key: 'col_total_area', label: 'Total Area', type: 'number', field: null, source: 'imported' },
        ],
        resolveLabel,
      );

      const custom = customColumnsOf(merged);
      assert.deepEqual(custom.map((column) => column.key), ['col_po_number', 'col_total_area']);
      // The duplicate canonical entry must not be added a second time.
      assert.equal(merged.filter((column) => column.key === 'quantity').length, 1);
    });

    it('drops duplicate and malformed passthrough entries', () => {
      const merged = mergeColumns(
        [
          { key: 'col_po', label: 'PO', type: 'text', source: 'imported' },
          { key: 'col_po', label: 'PO (duplicate)', type: 'text', source: 'imported' },
          { key: '', label: 'No key', type: 'text', source: 'imported' },
        ] as never,
        resolveLabel,
      );

      assert.equal(customColumnsOf(merged).length, 1);
      assert.equal(customColumnsOf(merged)[0].label, 'PO');
    });

    it('caps the number of passthrough columns', () => {
      const many = Array.from({ length: MAX_CUSTOM_COLUMNS + 5 }, (_, index) => ({
        key: `col_extra_${index}`,
        label: `Extra ${index}`,
        type: 'text' as const,
        field: null,
        source: 'imported' as const,
      }));

      assert.equal(customColumnsOf(mergeColumns(many, resolveLabel)).length, MAX_CUSTOM_COLUMNS);
    });
  });

  describe('normalizeCustomColumn', () => {
    it('rejects canonical keys and unknown value kinds', () => {
      assert.equal(normalizeCustomColumn({ key: 'quantity', label: 'Qty', type: 'number', source: 'imported' }), null);
      assert.equal(normalizeCustomColumn({ key: '', label: 'x', type: 'text', source: 'imported' }), null);
      const column = normalizeCustomColumn({ key: 'col_x', label: 'X', type: 'nope' as never, source: 'imported' });
      assert.equal(column?.type, 'text');
      assert.equal(column?.field, null);
    });
  });

  describe('canonicalColumnDefinitions', () => {
    it('resolves canonical labels through the label resolver', () => {
      const [first] = canonicalColumnDefinitions(resolveLabel);
      assert.equal(first.label, `${CANONICAL_COLUMNS[0].labelKey}|${CANONICAL_COLUMNS[0].fallback}`);
      assert.equal(first.source, 'canonical');
      assert.equal(first.includeInDocuments, false);
    });
  });

  describe('add / rename / retype / delete', () => {
    const base = mergeColumns(
      [{ key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported' }],
      resolveLabel,
    );

    it('adds a user column with a stable, collision-proof key', () => {
      const last = customColumnsOf(addColumn(base, { label: 'Vendor Ref' })).at(-1);
      assert.equal(last?.key, 'col_vendor_ref');
      assert.equal(last?.label, 'Vendor Ref');
      assert.equal(last?.source, 'user');
      assert.equal(last?.includeInDocuments, false);
    });

    it('suffixes a new column whose slug collides', () => {
      assert.equal(customColumnsOf(addColumn(base, { label: 'PO Number' })).at(-1)?.key, 'col_po_number_2');
    });

    it('never removes or renames a canonical column', () => {
      assert.equal(removeColumn(base, 'quantity').length, base.length);
      assert.deepEqual(renameColumn(base, 'quantity', 'Qty!'), base);
      assert.ok(isCanonicalColumn('quantity'));
    });

    it('removes, renames and retypes a passthrough column', () => {
      assert.equal(customColumnsOf(removeColumn(base, 'col_po_number')).length, 0);
      assert.equal(customColumnsOf(renameColumn(base, 'col_po_number', 'Purchase Order'))[0].label, 'Purchase Order');
      assert.equal(customColumnsOf(setColumnType(base, 'col_po_number', 'number'))[0].type, 'number');
    });

    it('flags a column for client documents, and lists it separately', () => {
      const flagged = setColumnIncludeInDocuments(base, 'col_po_number', true);
      assert.deepEqual(documentColumns(flagged).map((column) => column.key), ['col_po_number']);
      assert.equal(documentColumns(base).length, 0);
      // Canonical columns are already in every document.
      assert.deepEqual(setColumnIncludeInDocuments(base, 'quantity', true), base);
    });

    it('treats numeric value kinds as right-aligned figures', () => {
      assert.ok(isNumericColumnType('number'));
      assert.ok(isNumericColumnType('currency'));
      assert.ok(isNumericColumnType('percent'));
      assert.ok(!isNumericColumnType('text'));
      assert.ok(!isNumericColumnType('date'));
    });
  });

  describe('schema order and per-column view state', () => {
    it('takes the incoming order and keeps a canonical column width and visibility', () => {
      const merged = mergeColumns(
        [
          { key: 'quantity', label: 'Qty', type: 'number', field: 'quantity', source: 'canonical', width: 96 },
          { key: 'size_spec', label: 'Size', type: 'text', field: 'sizeSpec', source: 'canonical', hidden: true },
          { key: 'col_a', label: 'A', type: 'text', field: null, source: 'imported', width: 300 },
        ],
        resolveLabel,
      );

      // The saved order leads; canonical columns it omits are appended in canonical order.
      assert.deepEqual(merged.slice(0, 3).map((column) => column.key), ['quantity', 'size_spec', 'col_a']);
      assert.equal(merged.length, CANONICAL_COLUMNS.length + 1);
      assert.equal(merged.find((column) => column.key === 'quantity')?.width, 96);
      assert.equal(merged.find((column) => column.key === 'size_spec')?.hidden, true);
      assert.equal(merged.find((column) => column.key === 'col_a')?.width, 300);
      // A canonical label is always resolved locally, never taken from the payload.
      assert.equal(merged.find((column) => column.key === 'quantity')?.label, 'product.takeoffGrid.quantity|Qty');
    });

    it('ignores canonical payload entries the client does not model', () => {
      const merged = mergeColumns(
        [
          { key: 'labor_hours_per_unit', label: 'Labor Hrs/Unit', type: 'number', field: 'labor_hours_per_unit', source: 'canonical' },
          { key: 'labor_unit_cost', label: 'Labor $/Unit', type: 'currency', field: 'labor_unit_cost', source: 'canonical' },
        ],
        resolveLabel,
      );

      // Both are edited through the single labor column, so neither becomes a passthrough column.
      assert.deepEqual(customColumnsOf(merged), []);
      assert.equal(merged.length, CANONICAL_COLUMNS.length);
    });
  });

  describe('move, width and visibility', () => {
    /** A saved schema: the engine-bound columns first, then the imported extras. */
    const base = mergeColumns(
      [
        ...canonicalColumnDefinitions(resolveLabel),
        { key: 'col_a', label: 'A', type: 'text', field: null, source: 'imported' },
        { key: 'col_b', label: 'B', type: 'text', field: null, source: 'imported' },
      ],
      resolveLabel,
    );

    it('moves a column one step, and stops at either end', () => {
      assert.deepEqual(moveColumn(base, 'col_b', -1).slice(-3).map((column) => column.key), ['labor', 'col_b', 'col_a']);
      assert.deepEqual(moveColumn(base, 'col_b', 1), base);
      assert.deepEqual(moveColumn(base, 'system', -1), base);
      assert.deepEqual(moveColumn(base, 'col_missing', 1), base);
    });

    it('steps over a hidden column so a single click always has a visible effect', () => {
      const schema = mergeColumns(
        [
          { key: 'system', label: 'System', type: 'text', field: 'system', source: 'canonical' },
          { key: 'size_spec', label: 'Size', type: 'text', field: 'sizeSpec', source: 'canonical', hidden: true },
          { key: 'quantity', label: 'Qty', type: 'number', field: 'quantity', source: 'canonical' },
        ],
        resolveLabel,
      );

      assert.deepEqual(moveColumn(schema, 'quantity', -1).slice(0, 2).map((column) => column.key), ['quantity', 'system']);
    });

    it('clamps a width into the resizeable range, and clears it with null', () => {
      assert.equal(normalizeColumnWidth(undefined), null);
      assert.equal(normalizeColumnWidth(0), null);
      assert.equal(normalizeColumnWidth(10), MIN_COLUMN_WIDTH);
      assert.equal(normalizeColumnWidth(5000), MAX_COLUMN_WIDTH);
      assert.equal(normalizeColumnWidth(240), 240);

      assert.equal(customColumnsOf(setColumnWidth(base, 'col_a', 240))[0].width, 240);
      assert.equal(customColumnsOf(setColumnWidth(base, 'col_a', 10))[0].width, MIN_COLUMN_WIDTH);
      assert.equal(customColumnsOf(setColumnWidth(base, 'col_a', null))[0].width, null);
    });

    it('keeps every calculation column and hides the display-only canonical ones', () => {
      for (const key of CALCULATION_COLUMNS) {
        const after = removeColumn(base, key);
        assert.equal(after.length, base.length, `${key} must survive a delete`);
        assert.equal(after.find((column) => column.key === key)?.hidden, undefined);
      }
      assert.ok(isCalculationColumn('quantity'));
      assert.ok(!isCalculationColumn('size_spec'));

      // A display-only canonical column leaves the view but stays in the schema.
      const hiddenSize = removeColumn(base, 'size_spec');
      assert.equal(hiddenSize.length, base.length);
      assert.equal(hiddenSize.find((column) => column.key === 'size_spec')?.hidden, true);

      // A passthrough column is dropped outright.
      assert.deepEqual(customColumnsOf(removeColumn(base, 'col_a')).map((column) => column.key), ['col_b']);
    });

    it('lists what is shown and what is hidden, and restores a hidden column', () => {
      const schema = removeColumn(base, 'size_spec');

      assert.equal(visibleColumns(schema).some((column) => column.key === 'size_spec'), false);
      assert.deepEqual(hiddenColumns(schema).map((column) => column.key), ['size_spec']);
      assert.equal(restoreColumn(schema, 'size_spec').find((column) => column.key === 'size_spec')?.hidden, false);
    });
  });

  describe('columnKeyFromLabel', () => {
    it('slugifies labels and avoids collisions', () => {
      assert.equal(columnKeyFromLabel('PO Number'), 'col_po_number');
      assert.equal(columnKeyFromLabel('PO Number', ['col_po_number']), 'col_po_number_2');
      assert.equal(columnKeyFromLabel('PO Number', ['col_po_number', 'col_po_number_2']), 'col_po_number_3');
    });
  });

  describe('inferTypeFromValues', () => {
    it('infers the value kind from sample values', () => {
      assert.equal(inferTypeFromValues(['$12.50', '$1,250.00']), 'currency');
      assert.equal(inferTypeFromValues([12, 40]), 'number');
      assert.equal(inferTypeFromValues(['10%', '2.5%']), 'percent');
      assert.equal(inferTypeFromValues(['yes', 'no']), 'boolean');
      assert.equal(inferTypeFromValues(['2024-05-01']), 'date');
      assert.equal(inferTypeFromValues(['SDR-35', 'PVC']), 'text');
      assert.equal(inferTypeFromValues([]), 'text');
    });
  });

  describe('coerceCustomFieldValue', () => {
    it('coerces raw cell input to the column value kind', () => {
      assert.equal(coerceCustomFieldValue('', 'text'), null);
      assert.equal(coerceCustomFieldValue('  PO-1 ', 'text'), 'PO-1');
      assert.equal(coerceCustomFieldValue('$1,250.50', 'currency'), 1250.5);
      assert.equal(coerceCustomFieldValue('12%', 'percent'), 12);
      assert.equal(coerceCustomFieldValue('yes', 'boolean'), true);
      assert.equal(coerceCustomFieldValue('no', 'boolean'), false);
      assert.equal(coerceCustomFieldValue('abc', 'number'), 'abc');
    });
  });

  describe('custom cell values', () => {
    const items = [
      { id: 'a', description: 'Pipe', customFields: { col_po_number: 'PO-1', col_area: 12 } },
      { id: 'b', description: 'Basin' },
    ];

    it('reads a passthrough cell, null when absent', () => {
      assert.equal(getCustomFieldValue(items[0] as never, 'col_po_number'), 'PO-1');
      assert.equal(getCustomFieldValue(items[1] as never, 'col_po_number'), null);
    });

    it('writes a passthrough cell without touching other rows', () => {
      const updated = setCustomFieldValue(items as never, 'b', 'col_po_number', 'PO-2');
      assert.equal(getCustomFieldValue(updated[1] as never, 'col_po_number'), 'PO-2');
      assert.equal(getCustomFieldValue(updated[0] as never, 'col_po_number'), 'PO-1');
    });

    it('clears a cell when the value is emptied', () => {
      const updated = setCustomFieldValue(items as never, 'a', 'col_po_number', null);
      assert.deepEqual(updated[0].customFields, { col_area: 12 });
    });

    it('strips a deleted column from every row', () => {
      const cleared = clearCustomColumnValues(items as never, 'col_po_number');
      assert.deepEqual(cleared[0].customFields, { col_area: 12 });
      assert.equal(cleared[1].customFields, undefined);
    });
  });

  describe('formatColumnValue', () => {
    it('formats each value kind for export', () => {
      assert.equal(formatColumnValue('text', 'PO-1'), 'PO-1');
      assert.equal(formatColumnValue('currency', 1250.5), '1250.50');
      assert.equal(formatColumnValue('percent', 12), '12%');
      assert.equal(formatColumnValue('number', '1,250'), '1250');
      assert.equal(formatColumnValue('boolean', true), 'Yes');
      assert.equal(formatColumnValue('boolean', false), 'No');
      assert.equal(formatColumnValue('text', null), '');
    });
  });

  describe('persistence round trip', () => {
    it('keeps keys, labels, types and flags through a JSON round trip', () => {
      const schema = setColumnIncludeInDocuments(
        renameColumn(
          setColumnType(
            mergeColumns(
              [
                { key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported' },
                { key: 'col_area', label: 'Area', type: 'number', field: null, source: 'imported' },
              ],
              resolveLabel,
            ),
            'col_area',
            'currency',
          ),
          'col_po_number',
          'Purchase Order',
        ),
        'col_area',
        true,
      );

      // The schema travels to the database and back as JSON.
      const restored = mergeColumns(JSON.parse(JSON.stringify(schema)) as never, resolveLabel);
      const custom = customColumnsOf(restored);

      assert.deepEqual(custom, [
        {
          key: 'col_po_number',
          label: 'Purchase Order',
          type: 'text',
          field: null,
          source: 'imported',
          includeInDocuments: false,
        },
        {
          key: 'col_area',
          label: 'Area',
          type: 'currency',
          field: null,
          source: 'imported',
          includeInDocuments: true,
        },
      ]);
    });

    it('keeps a user-added column marked as a user column across the round trip', () => {
      const schema = addColumn(mergeColumns(null, resolveLabel), { label: 'Vendor Ref', type: 'text' });
      const restored = customColumnsOf(mergeColumns(JSON.parse(JSON.stringify(schema)) as never, resolveLabel));

      assert.equal(restored.length, 1);
      assert.equal(restored[0].source, 'user');
    });
  });

  describe('documentColumns', () => {
    it('returns only the flagged columns, in schema order', () => {
      let schema = mergeColumns(
        [
          { key: 'col_a', label: 'A', type: 'text', field: null, source: 'imported' },
          { key: 'col_b', label: 'B', type: 'text', field: null, source: 'imported' },
          { key: 'col_c', label: 'C', type: 'text', field: null, source: 'imported' },
        ],
        resolveLabel,
      );
      schema = setColumnIncludeInDocuments(schema, 'col_c', true);
      schema = setColumnIncludeInDocuments(schema, 'col_a', true);

      assert.deepEqual(documentColumns(schema).map((column) => column.key), ['col_a', 'col_c']);
    });

    it('unflags a column again', () => {
      let schema = mergeColumns(
        [{ key: 'col_a', label: 'A', type: 'text', field: null, source: 'imported' }],
        resolveLabel,
      );
      schema = setColumnIncludeInDocuments(schema, 'col_a', true);
      schema = setColumnIncludeInDocuments(schema, 'col_a', false);

      assert.deepEqual(documentColumns(schema), []);
    });

    it('never treats a canonical column as a document column', () => {
      assert.deepEqual(documentColumns(canonicalColumnDefinitions(resolveLabel)), []);
    });
  });
});
