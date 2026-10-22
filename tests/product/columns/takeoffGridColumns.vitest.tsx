import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));

import TakeoffGrid from '@/product/components/TakeoffGrid';
import { DEFAULT_RATES } from '@/product/constants/calculations.constants';
import { canonicalColumnDefinitions, mergeColumns } from '@/product/lib/takeoffColumns';
import type { ColumnDefinition, Rates, TakeoffItem } from '@/types/models';

const resolveLabel = (labelKey: string) => labelKey;

/** The accessible name of a column's options button, which is scoped to the column's own label. */
const columnMenu = (label: string) => `product.takeoffGrid.columns.menuTitle: ${label}`;
/** Canonical labels are the dictionary keys in this harness, so they are referenced by key. */
const CANONICAL_LABELS = {
  quantity: 'product.takeoffGrid.quantity',
  sizeSpec: 'product.takeoffGrid.sizeSpec',
};

/** The imported passthrough column every grid test works with. */
const PO_COLUMN: ColumnDefinition = { key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported' };

/**
 * A schema with the canonical columns plus one imported passthrough column, in the order a saved
 * project stores it: the engine-bound columns first, then the imported extras.
 */
const columnsWithPoNumber = (): ColumnDefinition[] =>
  mergeColumns([...canonicalColumnDefinitions(resolveLabel), PO_COLUMN], resolveLabel);

const ITEMS: TakeoffItem[] = [
  { id: 'row-1', system: 'Sanitary', description: 'Pipe', sizeSpec: '6" PVC', quantity: 10, unit: 'LF', customFields: { col_po_number: 'PO-1' } },
];

describe('TakeoffGrid dynamic columns', () => {
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

  it('renders a passthrough column header and its stored value', () => {
    renderGrid();
    expect(screen.getByText('PO Number')).toBeTruthy();
    expect((screen.getByLabelText('PO Number') as HTMLInputElement).value).toBe('PO-1');
  });

  it('writes an edited passthrough cell into the row customFields', () => {
    const { onChange } = renderGrid();
    fireEvent.change(screen.getByLabelText('PO Number'), { target: { value: 'PO-99' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as TakeoffItem[];
    expect(updated[0].customFields).toEqual({ col_po_number: 'PO-99' });
    // Canonical fields are untouched by a passthrough edit.
    expect(updated[0].quantity).toBe(10);
  });

  it('adds a user column through the inline editor', () => {
    const { onColumnsChange } = renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'product.takeoffGrid.columns.addButton' }));
    const input = screen.getByLabelText('product.takeoffGrid.columns.addTitle') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Vendor Ref' } });
    fireEvent.click(screen.getByRole('button', { name: 'product.takeoffGrid.columns.addConfirm' }));

    expect(onColumnsChange).toHaveBeenCalledTimes(1);
    const next = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    const added = next.filter((column) => column.source === 'user');
    expect(added).toHaveLength(1);
    expect(added[0].label).toBe('Vendor Ref');
    expect(added[0].key).toBe('col_vendor_ref');
  });

  it('renames a passthrough column from its header menu', () => {
    const { onColumnsChange } = renderGrid();

    fireEvent.click(screen.getByLabelText(columnMenu('PO Number')));
    fireEvent.click(screen.getByRole('button', { name: 'product.takeoffGrid.columns.rename' }));

    const input = screen.getByLabelText('product.takeoffGrid.columns.renameTitle', { selector: 'input' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Purchase Order' } });
    fireEvent.click(screen.getByRole('button', { name: 'product.takeoffGrid.columns.renameConfirm' }));

    const next = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    const renamed = next.find((column) => column.key === 'col_po_number');
    expect(renamed?.label).toBe('Purchase Order');
  });

  it('deletes a passthrough column only after an explicit confirmation', () => {
    const { onChange, onColumnsChange } = renderGrid();

    fireEvent.click(screen.getByLabelText(columnMenu('PO Number')));
    fireEvent.click(screen.getByRole('button', { name: 'product.takeoffGrid.columns.delete' }));
    // First click only arms the confirmation.
    expect(onColumnsChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'product.takeoffGrid.columns.deleteConfirm' }));

    const nextColumns = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    expect(nextColumns.some((column) => column.key === 'col_po_number')).toBe(false);
    // The column's stored values are stripped from every row at the same time.
    const nextItems = onChange.mock.calls[0][0] as TakeoffItem[];
    expect(nextItems[0].customFields).toEqual({});
  });

  it('hides column authoring when the grid is read-only', () => {
    renderGrid({ readOnly: true });
    expect(screen.queryByRole('button', { name: 'product.takeoffGrid.columns.addButton' })).toBeNull();
    expect(screen.queryByLabelText(columnMenu('PO Number'))).toBeNull();
    expect(screen.queryByLabelText('product.takeoffGrid.columns.resize: PO Number')).toBeNull();
  });

  it('commits a drag-resize when the handle is released', () => {
    const { onColumnsChange } = renderGrid();
    const handle = screen.getByLabelText('product.takeoffGrid.columns.resize: PO Number');

    // The column has no width yet, so the drag starts from the fallback and follows the pointer.
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 180, pointerId: 1 });
    // Nothing is committed mid-drag: the preview is local to the header.
    expect(onColumnsChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(handle, { clientX: 180, pointerId: 1 });

    const next = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    expect(next.find((column) => column.key === 'col_po_number')?.width).toBe(240);
  });

  it('portals the column menu onto the body so the scrolling grid cannot clip it', () => {
    renderGrid();

    fireEvent.click(screen.getByLabelText(columnMenu('PO Number')));
    const menu = document.querySelector('div[data-column-menu]') as HTMLElement;

    expect(menu).toBeTruthy();
    // Outside the grid's horizontal scroll container, which used to clip the menu.
    expect(menu.closest('.overflow-x-auto')).toBeNull();
    expect(menu.parentElement).toBe(document.body);
    // Fixed-positioned against the viewport, with the coordinates taken from the header button.
    expect(menu.className).toContain('fixed');
    expect(menu.style.left).not.toBe('');
    expect(menu.style.maxHeight).not.toBe('');
  });

  it('closes the column menu on Escape', () => {
    renderGrid();

    fireEvent.click(screen.getByLabelText(columnMenu('PO Number')));
    expect(document.querySelector('div[data-column-menu]')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(document.querySelector('div[data-column-menu]')).toBeNull();
  });

  it('closes the column menu when the grid scrolls under it', () => {
    renderGrid();

    fireEvent.click(screen.getByLabelText(columnMenu('PO Number')));
    expect(document.querySelector('div[data-column-menu]')).toBeTruthy();

    fireEvent.scroll(window);

    expect(document.querySelector('div[data-column-menu]')).toBeNull();
  });

  it('moves a column one step left', () => {
    const { onColumnsChange } = renderGrid();

    fireEvent.click(screen.getByLabelText(columnMenu('PO Number')));
    fireEvent.click(screen.getByLabelText('product.takeoffGrid.columns.moveLeft: PO Number'));

    const next = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    const keys = next.map((column) => column.key);
    // The passthrough column started last; it now sits before the labor column.
    expect(keys.slice(-3)).toEqual(['material_cost_per_unit', 'col_po_number', 'labor']);
  });

  it('moves a canonical column one step right, in schema order', () => {
    const { onColumnsChange } = renderGrid();

    fireEvent.click(screen.getByLabelText(columnMenu(CANONICAL_LABELS.quantity)));
    fireEvent.click(screen.getByLabelText(`product.takeoffGrid.columns.moveRight: ${CANONICAL_LABELS.quantity}`));

    const keys = (onColumnsChange.mock.calls[0][0] as ColumnDefinition[]).map((column) => column.key);
    expect(keys.slice(3, 6)).toEqual(['unit', 'quantity', 'avg_depth_ft']);
  });

  it('sizes a column from the width presets', () => {
    const { onColumnsChange } = renderGrid();

    fireEvent.click(screen.getByLabelText(columnMenu('PO Number')));
    fireEvent.click(screen.getByLabelText('product.takeoffGrid.columns.widthLarge'));

    const next = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    expect(next.find((column) => column.key === 'col_po_number')?.width).toBe(320);
    // The menu stays open so the sizes can be compared.
    expect(screen.getByLabelText('product.takeoffGrid.columns.widthSmall')).toBeTruthy();
  });

  it('hands the width back to content sizing with the auto preset', () => {
    const { onColumnsChange } = renderGrid({
      columns: mergeColumns(
        [{ key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported', width: 320 }],
        resolveLabel,
      ),
    });

    fireEvent.click(screen.getByLabelText(columnMenu('PO Number')));
    fireEvent.click(screen.getByLabelText('product.takeoffGrid.columns.widthAuto'));

    const next = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    expect(next.find((column) => column.key === 'col_po_number')?.width).toBeNull();
  });

  it('refuses to delete a column the calculation engine reads', () => {
    const { onColumnsChange } = renderGrid();

    fireEvent.click(screen.getByLabelText(columnMenu(CANONICAL_LABELS.quantity)));

    // No delete affordance at all, only the reason the column is locked.
    expect(screen.queryByRole('button', { name: 'product.takeoffGrid.columns.delete' })).toBeNull();
    expect(screen.getByText('product.takeoffGrid.columns.deleteMandatoryHint')).toBeTruthy();
    expect(onColumnsChange).not.toHaveBeenCalled();
  });

  it('hides an optional canonical column instead of dropping it', () => {
    const { onChange, onColumnsChange } = renderGrid();

    fireEvent.click(screen.getByLabelText(columnMenu(CANONICAL_LABELS.sizeSpec)));
    fireEvent.click(screen.getByRole('button', { name: 'product.takeoffGrid.columns.delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'product.takeoffGrid.columns.deleteConfirm' }));

    const next = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    // The column stays in the schema (so it survives a reload) but leaves the view.
    expect(next.find((column) => column.key === 'size_spec')?.hidden).toBe(true);
    // Hiding is a view change, so no row data is stripped.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('brings a hidden column back from the grid footer', () => {
    const { onColumnsChange } = renderGrid({
      columns: mergeColumns(
        [{ key: 'size_spec', label: 'Size', type: 'text', field: 'sizeSpec', source: 'canonical', hidden: true }],
        resolveLabel,
      ),
    });

    fireEvent.click(
      screen.getByLabelText(`product.takeoffGrid.columns.showColumn: ${CANONICAL_LABELS.sizeSpec}`),
    );

    const next = onColumnsChange.mock.calls[0][0] as ColumnDefinition[];
    expect(next.find((column) => column.key === 'size_spec')?.hidden).toBe(false);
  });
});
