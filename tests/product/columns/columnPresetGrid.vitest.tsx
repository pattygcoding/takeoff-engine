import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));

// The preset transport is stubbed; the real merge logic still runs, so a load is exercised end to end.
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/product/lib/columnPresets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/product/lib/columnPresets')>();
  return {
    ...actual,
    columnPresetsApi: { list: mocks.list, create: mocks.create, delete: mocks.remove },
  };
});

import TakeoffGrid from '@/product/components/TakeoffGrid';
import { DEFAULT_RATES } from '@/product/constants/calculations.constants';
import { canonicalColumnDefinitions, mergeColumns } from '@/product/lib/takeoffColumns';
import type { ColumnDefinition, ColumnPreset, Rates, TakeoffItem } from '@/types/models';

const resolveLabel = (labelKey: string) => labelKey;

const PO_COLUMN: ColumnDefinition = {
  key: 'col_po_number',
  label: 'PO Number',
  type: 'text',
  field: null,
  source: 'imported',
};

const columnsWithPoNumber = (): ColumnDefinition[] =>
  mergeColumns([...canonicalColumnDefinitions(resolveLabel), PO_COLUMN], resolveLabel);

const PRESET: ColumnPreset = {
  id: 'preset-1',
  name: 'House layout',
  columns_json: [
    { key: 'col_vendor', label: 'Vendor', type: 'text', field: null, source: 'user' },
    { key: 'quantity', label: 'Qty', type: 'number', field: 'quantity', source: 'canonical', width: 120 },
  ],
};

const ITEMS: TakeoffItem[] = [
  {
    id: 'row-1',
    system: 'Sanitary',
    description: 'Pipe',
    sizeSpec: '6" PVC',
    quantity: 10,
    unit: 'LF',
    customFields: { col_po_number: 'PO-1' },
  },
];

const LABELS = {
  button: 'product.takeoffGrid.columns.presets.button',
  saveAction: 'product.takeoffGrid.columns.presets.saveAction',
  namePlaceholder: 'product.takeoffGrid.columns.presets.namePlaceholder',
  saveConfirm: 'product.takeoffGrid.columns.presets.saveConfirm',
  delete: 'product.takeoffGrid.columns.presets.delete',
};

describe('TakeoffGrid column presets', () => {
  beforeEach(() => {
    mocks.list.mockReset();
    mocks.create.mockReset();
    mocks.remove.mockReset();
    mocks.list.mockResolvedValue([PRESET]);
    mocks.create.mockResolvedValue(PRESET);
    mocks.remove.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const renderGrid = (overrides: Partial<Parameters<typeof TakeoffGrid>[0]> = {}) => {
    const onChange = vi.fn();
    const onColumnsChange = vi.fn();
    render(
      <TakeoffGrid
        items={ITEMS}
        onChange={onChange}
        rates={DEFAULT_RATES as unknown as Rates}
        columns={columnsWithPoNumber()}
        onColumnsChange={onColumnsChange}
        {...overrides}
      />,
    );
    return { onChange, onColumnsChange };
  };

  const openPresets = async () => {
    fireEvent.click(screen.getByRole('button', { name: LABELS.button }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    return screen.findByText(PRESET.name);
  };

  it('lists the user’s saved presets when the menu opens', async () => {
    renderGrid();

    await openPresets();

    expect(screen.getByText('House layout')).toBeTruthy();
    expect(screen.getByText('product.takeoffGrid.columns.presets.columnCount')).toBeTruthy();
  });

  it('loads a preset into the schema, keeping columns the project already has', async () => {
    const { onColumnsChange } = renderGrid();

    fireEvent.click(await openPresets());

    const next = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    expect(next.some((column) => column.key === 'col_vendor')).toBe(true);
    expect(next.some((column) => column.key === 'col_po_number')).toBe(true);
    expect(next.some((column) => column.key === 'quantity')).toBe(true);
    // The preset's width travels with the schema.
    expect(next.find((column) => column.key === 'quantity')?.width).toBe(120);
  });

  it('saves the current layout under the name the user types', async () => {
    renderGrid();
    await openPresets();

    fireEvent.click(screen.getByRole('button', { name: LABELS.saveAction }));
    fireEvent.change(screen.getByLabelText(LABELS.namePlaceholder), {
      target: { value: 'House layout' },
    });
    fireEvent.click(screen.getByRole('button', { name: LABELS.saveConfirm }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const payload = mocks.create.mock.calls[0][0] as { name: string; columns: ColumnDefinition[] };
    expect(payload.name).toBe('House layout');
    expect(payload.columns.some((column) => column.key === 'col_po_number')).toBe(true);
    expect(payload.columns.some((column) => column.key === 'quantity')).toBe(true);
  });

  it('deletes a preset only on the second click', async () => {
    renderGrid();
    await openPresets();

    const deleteButton = screen.getByRole('button', { name: `${LABELS.delete}: House layout` });
    fireEvent.click(deleteButton);
    expect(mocks.remove).not.toHaveBeenCalled();

    fireEvent.click(deleteButton);
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('preset-1'));
    await waitFor(() => expect(screen.queryByText('House layout')).toBeNull());
  });

  it('shows the server error instead of a preset list when loading fails', async () => {
    mocks.list.mockRejectedValue(new Error('Could not load'));
    renderGrid();

    fireEvent.click(screen.getByRole('button', { name: LABELS.button }));

    expect(await screen.findByText('Could not load')).toBeTruthy();
  });

  it('hides the preset controls on a read-only project', () => {
    renderGrid({ readOnly: true });

    expect(screen.queryByRole('button', { name: LABELS.button })).toBeNull();
  });
});
