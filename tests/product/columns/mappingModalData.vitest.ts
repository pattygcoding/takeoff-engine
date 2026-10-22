import { describe, it, expect } from 'vitest';
import { buildMappingModalDataFromItems, getTargetFields } from '@/product/lib/csv';
import type { ColumnDefinition, TakeoffItem } from '@/types/models';

/**
 * The "Match Columns" modal can be opened straight from the items in state, with no raw file. The
 * passthrough columns and their values must survive that path, or re-mapping would silently drop the
 * extra data the estimator imported.
 */
describe('buildMappingModalDataFromItems with passthrough columns', () => {
  const t = (key: string) => key;
  const fieldLabels = getTargetFields(t).map((field) => field.label);

  const items: TakeoffItem[] = [
    {
      id: 'row-1',
      system: 'Sanitary',
      description: 'Pipe',
      sizeSpec: '6" PVC',
      quantity: 10,
      unit: 'LF',
      customFields: { col_po_number: 'PO-1', col_area: 12 },
    },
    {
      id: 'row-2',
      system: 'Storm',
      description: 'Basin',
      quantity: 2,
      unit: 'EA',
    },
  ];

  it('keeps the canonical headers and rows when there is nothing extra to carry', () => {
    const data = buildMappingModalDataFromItems([{ id: 'a', description: 'Pipe' }], t);

    expect(data.headers).toEqual(fieldLabels);
    expect(data.columns?.filter((column) => column.source === 'canonical')).toHaveLength(fieldLabels.length);
    expect(data.columns?.some((column) => column.source !== 'canonical')).toBe(false);
  });

  it('adds a column per passthrough key found on the items', () => {
    const data = buildMappingModalDataFromItems(items, t);

    // Generated keys are prettified back into a readable header.
    expect(data.headers).toEqual([...fieldLabels, 'Po Number', 'Area']);
  });

  it('carries the passthrough values into the preview rows', () => {
    const data = buildMappingModalDataFromItems(items, t);
    const [first, second] = data.rawRows ?? [];

    expect(first['Po Number']).toBe('PO-1');
    expect(first.Area).toBe('12');
    // A row without the column keeps an empty cell rather than dropping the column.
    expect(second['Po Number']).toBe('');
    expect(second.Area).toBe('');
  });

  it('infers the value kind of each reconstructed column', () => {
    const data = buildMappingModalDataFromItems(items, t);
    const byLabel = Object.fromEntries((data.columns ?? []).map((column) => [column.label, column]));

    expect(byLabel['Po Number'].type).toBe('text');
    expect(byLabel.Area.type).toBe('number');
  });

  it('prefers an explicit schema, so a user rename is preserved', () => {
    const columns: ColumnDefinition[] = [
      { key: 'col_po_number', label: 'Purchase Order', type: 'text', field: null, source: 'user', includeInDocuments: true },
    ];

    const data = buildMappingModalDataFromItems(items, t, columns);

    expect(data.headers).toEqual([...fieldLabels, 'Purchase Order']);
    expect((data.rawRows ?? [])[0]['Purchase Order']).toBe('PO-1');
    const custom = (data.columns ?? []).filter((column) => column.source !== 'canonical');
    expect(custom).toHaveLength(1);
    expect(custom[0].includeInDocuments).toBe(true);
  });

  it('never lifts a canonical field into a passthrough column', () => {
    const data = buildMappingModalDataFromItems(items, t);
    const customKeys = (data.columns ?? []).filter((column) => column.source !== 'canonical').map((column) => column.key);

    expect(customKeys).not.toContain('quantity');
    expect(customKeys).not.toContain('item_description');
    expect(customKeys).toEqual(['col_po_number', 'col_area']);
  });
});
