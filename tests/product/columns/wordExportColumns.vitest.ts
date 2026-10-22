import { afterEach, describe, expect, it, vi } from 'vitest';
import { customDocumentColumnCells, exportEstimateToWord } from '@/product/lib/wordExport';
import type { ColumnDefinition, Estimate } from '@/types/models';

/**
 * The Word export is built by hand (unlike the PDF, which rasterizes the React templates), so the
 * flagged passthrough columns need their own proof that they reach the .docx tables.
 */
describe('Word export passthrough columns', () => {
  const flaggedColumns: ColumnDefinition[] = [
    { key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported', includeInDocuments: true },
    { key: 'col_area', label: 'Total Area', type: 'number', field: null, source: 'imported', includeInDocuments: true },
  ];

  const item = {
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
  };

  const estimate = (documentColumns?: ColumnDefinition[]): Estimate => ({
    totals: { totalDirectCost: 100, finalBidAmount: 150 },
    bySystem: [{ system: 'Sanitary', items: [item], directCost: 100 }],
    ...(documentColumns ? { documentColumns } : {}),
  } as Estimate);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Installs the browser download primitives the exporter needs, and captures the produced blob. */
  function stubDownload() {
    // Re-wrap the real method each time, so a previous spy cannot double-count clicks.
    vi.restoreAllMocks();
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock');
    const revokeObjectURL = vi.fn((_url: string) => {});
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return {
      blob: () => createObjectURL.mock.calls[0][0],
      click,
      createObjectURL,
    };
  }

  describe('customDocumentColumnCells', () => {
    it('produces a header cell and a body cell per flagged column', () => {
      const cells = customDocumentColumnCells(estimate(flaggedColumns));

      expect(cells.count).toBe(2);
      expect(cells.headerCells).toHaveLength(2);
      expect(cells.bodyCells(item as never)).toHaveLength(2);
    });

    it('produces nothing when no column is flagged', () => {
      const cells = customDocumentColumnCells(estimate());

      expect(cells.count).toBe(0);
      expect(cells.headerCells).toEqual([]);
      expect(cells.bodyCells(item as never)).toEqual([]);
    });
  });

  describe('exportEstimateToWord', () => {
    it('downloads a document that grows when flagged columns are added', async () => {
      const withoutColumns = stubDownload();
      await exportEstimateToWord(estimate(), false, {}, null, 'standard_estimate', null, {});
      const plainSize = withoutColumns.blob().size;

      expect(withoutColumns.click).toHaveBeenCalledTimes(1);
      expect(plainSize).toBeGreaterThan(0);

      const withColumns = stubDownload();
      await exportEstimateToWord(estimate(flaggedColumns), false, {}, null, 'standard_estimate', null, {});

      expect(withColumns.click).toHaveBeenCalledTimes(1);
      expect(withColumns.blob().size).toBeGreaterThan(plainSize);
    });

    it('runs for every format that renders an item table', async () => {
      const formats = ['standard_estimate', 'client_proposal', 'material_procurement', 'aia_bid_schedule'];

      for (const formatId of formats) {
        const download = stubDownload();
        await expect(
          exportEstimateToWord(estimate(flaggedColumns), false, {}, null, formatId, null, {}),
        ).resolves.toBeUndefined();
        expect(download.click).toHaveBeenCalledTimes(1);
      }
    });
  });
});
