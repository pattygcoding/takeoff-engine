import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));

// The pricing drawer pulls in the whole billing/pricing stack, which has nothing to do with the
// column wiring under test here.
vi.mock('@/product/components/RatesDrawer', () => ({ default: () => null }));

// The mapping modal is only rendered once a remap starts, so it needs no stub beyond the context mock.
vi.mock('@/core/components/context/ModalContext', () => ({
  useModal: () => ({
    showAlert: vi.fn(async () => true),
    showConfirm: vi.fn(async () => true),
    showPrompt: vi.fn(async () => null),
  }),
}));

import EditStep from '@/product/components/EditStep';
import { DEFAULT_RATES } from '@/product/constants/calculations.constants';
import { mergeColumns } from '@/product/lib/takeoffColumns';
import type { ColumnDefinition, Rates, TakeoffItem } from '@/types/models';

/**
 * Step 2 is where column editing lives. These tests prove the wiring: the schema reaches the grid, and
 * edits in the grid reach the parent that persists them.
 */
describe('EditStep column schema wiring', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const resolveLabel = (labelKey: string) => labelKey;

  const columns = (): ColumnDefinition[] =>
    mergeColumns(
      [{ key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported' }],
      resolveLabel,
    );

  const items: TakeoffItem[] = [
    {
      id: 'row-1',
      system: 'Sanitary',
      description: 'Pipe',
      quantity: 10,
      unit: 'LF',
      customFields: { col_po_number: 'PO-1' },
    },
  ];

  function renderStep(overrides: Record<string, unknown> = {}) {
    const onItemsChange = vi.fn();
    const onColumnsChange = vi.fn();

    render(
      <EditStep
        items={items}
        onItemsChange={onItemsChange}
        rates={DEFAULT_RATES as unknown as Rates}
        onRatesChange={vi.fn()}
        onCalculate={vi.fn()}
        columns={columns()}
        onColumnsChange={onColumnsChange}
        {...overrides}
      />,
    );

    return { onItemsChange, onColumnsChange };
  }

  it('renders the passthrough column and its value in the takeoff grid', () => {
    renderStep();

    expect(screen.getByText('PO Number')).toBeTruthy();
    expect((screen.getByLabelText('PO Number') as HTMLInputElement).value).toBe('PO-1');
  });

  it('propagates a passthrough cell edit up to the parent', () => {
    const { onItemsChange } = renderStep();

    fireEvent.change(screen.getByLabelText('PO Number'), { target: { value: 'PO-77' } });

    const updated = onItemsChange.mock.calls[0][0] as TakeoffItem[];
    expect(updated[0].customFields).toEqual({ col_po_number: 'PO-77' });
  });

  it('propagates a new column up to the parent that persists it', () => {
    const { onColumnsChange } = renderStep();

    fireEvent.click(screen.getByRole('button', { name: 'product.takeoffGrid.columns.addButton' }));
    fireEvent.change(screen.getByLabelText('product.takeoffGrid.columns.addTitle'), {
      target: { value: 'Vendor Ref' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'product.takeoffGrid.columns.addConfirm' }));

    const next = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    expect(next.filter((column) => column.source === 'user').map((column) => column.label)).toEqual(['Vendor Ref']);
  });

  it('hides column authoring on a locked (read-only) project', () => {
    renderStep({ readOnly: true });

    expect(screen.queryByRole('button', { name: 'product.takeoffGrid.columns.addButton' })).toBeNull();
    expect(screen.queryByLabelText('product.takeoffGrid.columns.menuTitle')).toBeNull();
    // The imported data is still visible for a locked project.
    expect(screen.getByText('PO Number')).toBeTruthy();
  });
});
