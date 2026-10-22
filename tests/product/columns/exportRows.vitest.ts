import { describe, it, expect } from 'vitest';
import { buildTakeoffExportRows } from '@/product/components/ResultsStep';
import type { ColumnDefinition, Estimate } from '@/types/models';

/**
 * The CSV export is the estimator's data escape hatch, so every passthrough column the grid shows must
 * come out in the same order it appears on screen.
 */
describe('buildTakeoffExportRows', () => {
  const columns: ColumnDefinition[] = [
    { key: 'quantity', label: 'Quantity', type: 'number', field: 'quantity', source: 'canonical' },
    { key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported' },
    { key: 'col_area', label: 'Total Area', type: 'number', field: null, source: 'imported' },
  ];

  const bySystem: Estimate['bySystem'] = [
    {
      system: 'Sanitary',
      items: [
        {
          id: 'a',
          system: 'Sanitary',
          description: 'Pipe',
          sizeSpec: '6" PVC',
          quantity: 10,
          unit: 'LF',
          materialCost: 50,
          laborHours: 1.5,
          laborCost: 30,
          directCost: 100,
          customFields: { col_po_number: 'PO-1', col_area: 12 },
        },
      ],
    },
  ];

  it('keeps the canonical columns and appends the passthrough ones in schema order', () => {
    const [row] = buildTakeoffExportRows(bySystem, false, columns);

    expect(row.System).toBe('Sanitary');
    expect(row.Quantity).toBe(10);
    expect(row['PO Number']).toBe('PO-1');
    expect(row['Total Area']).toBe('12');

    const keys = Object.keys(row);
    expect(keys.indexOf('PO Number')).toBeGreaterThan(keys.indexOf('Unit'));
    expect(keys.indexOf('PO Number')).toBeLessThan(keys.indexOf('Total Area'));
    expect(keys.indexOf('Total Area')).toBeLessThan(keys.indexOf('Material Cost'));
  });

  it('includes the internal cost breakdown in the internal mode', () => {
    const [row] = buildTakeoffExportRows(bySystem, false, columns);

    expect(row['Material Cost']).toBe('50.00');
    expect(row['Labor Hours']).toBe('1.50');
    expect(row['Labor Cost']).toBe('30.00');
    expect(row['Direct Cost']).toBe('100.00');
    expect(row['Line Total']).toBeUndefined();
  });

  it('switches to a single line total in the client-facing mode', () => {
    const [row] = buildTakeoffExportRows(bySystem, true, columns);

    expect(row['Line Total']).toBe('100.00');
    expect(row['Material Cost']).toBeUndefined();
    // Passthrough data is still exported for the client-facing summary.
    expect(row['PO Number']).toBe('PO-1');
  });

  it('adds no extra columns when the project has none', () => {
    const [row] = buildTakeoffExportRows(bySystem, false);

    expect(row['PO Number']).toBeUndefined();
    expect(row['Total Area']).toBeUndefined();
    expect(Object.keys(row)).toEqual([
      'System', 'Description', 'Size/Spec', 'Quantity', 'Unit',
      'Material Cost', 'Labor Hours', 'Labor Cost', 'Direct Cost',
    ]);
  });

  it('emits one row per item across every system', () => {
    const rows = buildTakeoffExportRows(
      [
        bySystem[0],
        {
          system: 'Storm',
          items: [{ id: 'b', system: 'Storm', description: 'Basin', quantity: 2, unit: 'EA', customFields: { col_po_number: 'PO-2' } }],
        },
      ] as Estimate['bySystem'],
      false,
      columns,
    );

    expect(rows).toHaveLength(2);
    expect(rows[1]['PO Number']).toBe('PO-2');
    // An item with no value for a column still produces the column, just empty.
    expect(rows[1]['Total Area']).toBe('');
  });

  it('tolerates an empty estimate', () => {
    expect(buildTakeoffExportRows([], false, columns)).toEqual([]);
    expect(buildTakeoffExportRows(undefined, false, columns)).toEqual([]);
  });
});
