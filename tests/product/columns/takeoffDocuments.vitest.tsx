import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/core/components/context/I18nContext', () => ({
  // Interpolating params keeps every rendered label distinct, exactly as real translations do.
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params && typeof params === 'object' ? `${key}|${JSON.stringify(params)}` : key,
    language: 'en',
  }),
}));

import StandardEstimateDocument from '@/product/templates/StandardEstimateDocument';
import { ProposalPackageDocument } from '@/product/templates/ClientViewDocuments';
import { customDocumentColumns } from '@/product/templates/DocumentHeaderSignoff';
import type { ColumnDefinition, Estimate, EstimateLineItem } from '@/types/models';

/**
 * A column the estimator flags is a promise that it shows up in the documents. The PDF export
 * rasterizes these very templates, so asserting on the rendered DOM proves the printed output too.
 */
describe('passthrough columns in client-facing documents', () => {
  afterEach(() => cleanup());

  const flaggedColumns: ColumnDefinition[] = [
    { key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported', includeInDocuments: true },
    { key: 'col_area', label: 'Total Area', type: 'number', field: null, source: 'imported', includeInDocuments: true },
  ];

  const item: EstimateLineItem = {
    id: 'row-1',
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
  } as EstimateLineItem;

  const estimate = (documentColumns?: ColumnDefinition[]): Estimate => ({
    totals: {
      totalDirectCost: 100,
      totalMaterialCost: 50,
      totalLaborCost: 30,
      totalLaborHours: 1.5,
      finalBidAmount: 150,
    },
    bySystem: [{ system: 'Sanitary', items: [item], directCost: 100, materialCost: 50 }],
    ...(documentColumns ? { documentColumns } : {}),
  });

  const props = (documentColumns?: ColumnDefinition[]) => ({
    estimate: estimate(documentColumns),
    branding: null,
    currentProject: null,
    rates: {},
  });

  describe('customDocumentColumns', () => {
    it('builds one document column per flagged column, aligned by value kind', () => {
      const columns = customDocumentColumns(estimate(flaggedColumns));

      expect(columns.map((column) => column.header)).toEqual(['PO Number', 'Total Area']);
      expect(columns[0].align).toBe('left');
      expect(columns[1].align).toBe('right');
      expect(String(columns[0].render(item))).toBe('PO-1');
      expect(String(columns[1].render(item))).toBe('12');
    });

    it('renders an empty cell for a row without a value', () => {
      const columns = customDocumentColumns(estimate(flaggedColumns));
      const empty: EstimateLineItem = { id: 'row-2', description: 'Basin' };

      expect(String(columns[0].render(empty))).toBe('');
    });

    it('adds nothing when no column is flagged', () => {
      expect(customDocumentColumns(estimate())).toEqual([]);
      expect(customDocumentColumns(null)).toEqual([]);
      expect(customDocumentColumns(undefined)).toEqual([]);
    });
  });

  describe('StandardEstimateDocument (internal estimate)', () => {
    it('prints the flagged column header and value', () => {
      render(<StandardEstimateDocument {...props(flaggedColumns)} />);

      expect(screen.getByText('PO Number')).toBeTruthy();
      expect(screen.getByText('Total Area')).toBeTruthy();
      expect(screen.getByText('PO-1')).toBeTruthy();
      expect(screen.getByText('12')).toBeTruthy();
    });

    it('prints nothing extra when no column is flagged', () => {
      render(<StandardEstimateDocument {...props()} />);

      expect(screen.queryByText('PO Number')).toBeNull();
      expect(screen.queryByText('PO-1')).toBeNull();
      // The canonical columns are untouched either way.
      expect(screen.getByText('6" PVC')).toBeTruthy();
    });
  });

  describe('ProposalPackageDocument (client-facing package)', () => {
    it('prints the flagged column header and value', () => {
      render(<ProposalPackageDocument {...props(flaggedColumns)} />);

      expect(screen.getByText('PO Number')).toBeTruthy();
      expect(screen.getByText('PO-1')).toBeTruthy();
    });

    it('prints nothing extra when no column is flagged', () => {
      render(<ProposalPackageDocument {...props()} />);

      expect(screen.queryByText('PO Number')).toBeNull();
      expect(screen.queryByText('PO-1')).toBeNull();
    });
  });
});
