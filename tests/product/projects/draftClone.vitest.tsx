import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));

// The pricing drawer pulls in the billing/pricing stack, which is unrelated to the duplicate action.
vi.mock('@/product/components/RatesDrawer', () => ({ default: () => null }));

// Step 2's live totals call the estimate endpoint; these tests are about the clone action only.
vi.mock('@/product/lib/calculations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/product/lib/calculations')>();
  return {
    ...actual,
    calculationsApi: {
      ...actual.calculationsApi,
      computeEstimate: vi.fn(async () => ({ totals: {}, bySystem: [], items: [] })),
    },
  };
});

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
 * Duplicating used to be offered only once a project was locked. A draft must be cloneable too, so
 * the workspace hands the same handler to Step 2 for any saved project; this proves the button is
 * rendered for an editable draft and fires the handler.
 */
describe('EditStep duplicate action for drafts', () => {
  afterEach(() => {
    cleanup();
  });

  const columns = (): ColumnDefinition[] =>
    mergeColumns(
      [{ key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported' }],
      (labelKey: string) => labelKey,
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
    const onDuplicate = vi.fn();
    render(
      <EditStep
        items={items}
        onItemsChange={vi.fn()}
        rates={DEFAULT_RATES as unknown as Rates}
        onRatesChange={vi.fn()}
        onCalculate={vi.fn()}
        columns={columns()}
        onColumnsChange={vi.fn()}
        onDuplicate={onDuplicate}
        {...overrides}
      />,
    );
    return { onDuplicate };
  }

  it('offers "Duplicate as New Draft" on an editable draft and calls the handler', () => {
    const { onDuplicate } = renderStep({ projectStatus: 'draft' });

    const button = screen.getByRole('button', { name: 'product.editStep.duplicateDraftBtn' });
    fireEvent.click(button);

    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('keeps the locked-project banner action instead of the draft action when read-only', () => {
    renderStep({ readOnly: true, projectStatus: 'awarded' });

    expect(screen.queryByRole('button', { name: 'product.editStep.duplicateDraftBtn' })).toBeNull();
    expect(screen.getByRole('button', { name: 'product.editStep.duplicateRevisionBtn' })).toBeTruthy();
  });

  it('renders no duplicate action when the parent supplies no handler', () => {
    render(
      <EditStep
        items={items}
        onItemsChange={vi.fn()}
        rates={DEFAULT_RATES as unknown as Rates}
        onRatesChange={vi.fn()}
        onCalculate={vi.fn()}
        columns={columns()}
        onColumnsChange={vi.fn()}
        projectStatus="draft"
      />,
    );

    expect(screen.queryByRole('button', { name: 'product.editStep.duplicateDraftBtn' })).toBeNull();
  });
});
