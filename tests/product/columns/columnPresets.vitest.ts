import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyColumnPreset, columnPresetsApi, presetColumns } from '@/product/lib/columnPresets';
import {
  CANONICAL_COLUMNS,
  MAX_CUSTOM_COLUMNS,
  customColumnsOf,
  mergeColumns,
} from '@/product/lib/takeoffColumns';
import type { ColumnDefinition, ColumnPreset } from '@/types/models';

/** Mirrors the `t` fallback contract used by the grid. */
const resolveLabel = (labelKey: string, fallback: string) => `${labelKey}|${fallback}`;

const PO_COLUMN: ColumnDefinition = {
  key: 'col_po_number',
  label: 'PO Number',
  type: 'text',
  field: null,
  source: 'imported',
};

const currentSchema = (): ColumnDefinition[] => mergeColumns([PO_COLUMN], resolveLabel);

const canonicalKeys = () => CANONICAL_COLUMNS.map((column) => column.key);

function presetRow(columns: ColumnDefinition[]): ColumnPreset {
  return { id: 'preset-1', name: 'House layout', columns_json: columns } as ColumnPreset;
}

/** A minimal fetch double returning the given JSON payload. */
function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as unknown as Response;
}

describe('applyColumnPreset', () => {
  it('keeps the canonical set complete while applying the preset order, width and visibility', () => {
    const applied = applyColumnPreset(
      currentSchema(),
      [
        { key: 'col_vendor', label: 'Vendor', type: 'text', field: null, source: 'user' },
        {
          key: 'quantity',
          label: 'Qty',
          type: 'number',
          field: 'quantity',
          source: 'canonical',
          width: 120,
          hidden: true,
        },
      ],
      resolveLabel,
    );

    expect(applied[0].key).toBe('col_vendor');
    const quantity = applied.find((column) => column.key === 'quantity');
    expect(quantity?.width).toBe(120);
    expect(quantity?.hidden).toBe(true);

    for (const key of canonicalKeys()) {
      expect(applied.some((column) => column.key === key)).toBe(true);
    }
  });

  it('never orphans a passthrough column the project already holds', () => {
    const applied = applyColumnPreset(
      currentSchema(),
      [{ key: 'col_vendor', label: 'Vendor', type: 'text', field: null, source: 'user' }],
      resolveLabel,
    );

    expect(applied.some((column) => column.key === 'col_po_number')).toBe(true);
    expect(applied.some((column) => column.key === 'col_vendor')).toBe(true);
  });

  it('lets the preset redefine a column it shares with the project, without duplicating it', () => {
    const applied = applyColumnPreset(
      currentSchema(),
      [{ key: 'col_po_number', label: 'Purchase Order', type: 'number', field: null, source: 'user' }],
      resolveLabel,
    );

    const matches = applied.filter((column) => column.key === 'col_po_number');
    expect(matches).toHaveLength(1);
    expect(matches[0].label).toBe('Purchase Order');
    expect(matches[0].type).toBe('number');
  });

  it('caps the passthrough columns at the grid limit', () => {
    const presetColumns = Array.from({ length: MAX_CUSTOM_COLUMNS + 10 }, (_, index) => ({
      key: `col_preset_${index}`,
      label: `Preset ${index}`,
      type: 'text' as const,
      field: null,
      source: 'user' as const,
    }));
    const currentExtra = Array.from({ length: 10 }, (_, index) => ({
      key: `col_current_${index}`,
      label: `Current ${index}`,
      type: 'text' as const,
      field: null,
      source: 'user' as const,
    }));

    const applied = applyColumnPreset(
      mergeColumns(currentExtra, resolveLabel),
      presetColumns,
      resolveLabel,
    );

    expect(customColumnsOf(applied).length).toBeLessThanOrEqual(MAX_CUSTOM_COLUMNS);
  });

  it('treats an empty or malformed preset as a no-op schema', () => {
    const applied = applyColumnPreset(currentSchema(), [], resolveLabel);

    expect(applied.some((column) => column.key === 'col_po_number')).toBe(true);
    for (const key of canonicalKeys()) {
      expect(applied.some((column) => column.key === key)).toBe(true);
    }
  });
});

describe('presetColumns', () => {
  it('reads the stored schema', () => {
    expect(presetColumns(presetRow([PO_COLUMN]))).toEqual([PO_COLUMN]);
  });

  it('tolerates a missing or malformed payload', () => {
    expect(presetColumns(null)).toEqual([]);
    expect(presetColumns({ id: 'p', name: 'n', columns_json: 'nope' } as unknown as ColumnPreset)).toEqual([]);
  });
});

describe('columnPresetsApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists the saved presets', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ presets: [presetRow([PO_COLUMN])] }));
    vi.stubGlobal('fetch', fetchMock);

    const presets = await columnPresetsApi.list();

    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe('House layout');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/column-presets',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns an empty list when the payload has no presets array', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({})));

    expect(await columnPresetsApi.list()).toEqual([]);
  });

  it('surfaces the server error when listing fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Not authorized' }, false)));

    await expect(columnPresetsApi.list()).rejects.toThrow('Not authorized');
  });

  it('saves the current layout and returns the stored preset', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ preset: presetRow([PO_COLUMN]) }));
    vi.stubGlobal('fetch', fetchMock);

    const saved = await columnPresetsApi.create({ name: 'House layout', columns: [PO_COLUMN] });

    expect(saved.id).toBe('preset-1');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:5000/api/column-presets');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'House layout', columns: [PO_COLUMN] });
  });

  it('exposes the server error code when the cap is reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ error: 'Too many presets', code: 'COLUMN_PRESET_LIMIT_REACHED' }, false),
      ),
    );

    await expect(columnPresetsApi.create({ name: 'One more', columns: [PO_COLUMN] })).rejects.toMatchObject({
      message: 'Too many presets',
      code: 'COLUMN_PRESET_LIMIT_REACHED',
    });
  });

  it('deletes a preset by id', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(columnPresetsApi.delete('preset-1')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/column-presets/preset-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('surfaces the server error when deleting fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Not found' }, false)));

    await expect(columnPresetsApi.delete('missing')).rejects.toThrow('Not found');
  });
});
