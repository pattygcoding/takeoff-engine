import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';

/**
 * Step 2's live totals must match Step 3 exactly, so they come from the same backend endpoint.
 * These tests pin the numbers the bar shows, the markup descriptions, and the hook's debounce /
 * stale-response / error behaviour that keeps a live preview honest.
 */
const TRANSLATIONS: Record<string, string> = {
  'product.liveTotals.title': 'Live Totals',
  'product.liveTotals.showBreakdown': 'Show breakdown',
  'product.liveTotals.hideBreakdown': 'Hide breakdown',
  'product.liveTotals.expandAria': 'Show the full cost breakdown',
  'product.liveTotals.collapseAria': 'Hide the full cost breakdown',
  'product.liveTotals.updating': 'Updating…',
  'product.liveTotals.stale': "Couldn't refresh totals — showing the last update.",
  'product.liveTotals.empty': 'Add a line item to see live totals.',
  'product.liveTotals.equipmentShort': 'Equip / Mob',
  'product.resultsStep.totalMaterialCost': 'Total Material Cost',
  'product.resultsStep.totalLabor': 'Total Labor',
  'product.resultsStep.laborHrs': '{{count}} hrs',
  'product.resultsStep.equipmentLineItems': 'Equipment & Machinery',
  'product.resultsStep.equipmentMobilization': 'Equipment / Mobilization',
  'product.resultsStep.miscellaneousCosts': 'Miscellaneous Costs',
  'product.resultsStep.scopeAddonsCost': 'Scope Add-Ons',
  'product.resultsStep.scopeAddonsExcludedSub': 'Not included in total',
  'product.resultsStep.totalDirectCost': 'Total Direct Cost',
  'product.resultsStep.overheadFixed': 'Overhead',
  'product.resultsStep.contingencyFixed': 'Contingency',
  'product.resultsStep.profitFixed': 'Profit',
  'product.resultsStep.finalBidAmount': 'Final Bid Amount',
  'product.markup.percentBasis': '{{pct}}% of the initial estimated cost before contingency and profit are applied',
  'product.markup.markupBasisNote':
    'All markup percentages are calculated against the initial direct cost, not compounded on the final total.',
};

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number> | string) => {
      const template = TRANSLATIONS[key] ?? key;
      if (!params || typeof params === 'string') return template;
      return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(params[name] ?? ''));
    },
  }),
}));

vi.mock('@/product/lib/calculations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/product/lib/calculations')>();
  return {
    ...actual,
    calculationsApi: { ...actual.calculationsApi, computeEstimate: vi.fn() },
  };
});

import StepTotalsBar from '@/product/components/StepTotalsBar';
import { useLiveEstimate } from '@/product/lib/useLiveEstimate';
import { calculationsApi } from '@/product/lib/calculations';
import { DEFAULT_RATES } from '@/product/constants/calculations.constants';
import type { EstimateTotals, Rates, TakeoffItem } from '@/types/models';

/** The figures from the user's worked example, so the formatting is pinned to real numbers. */
const TOTALS: EstimateTotals = {
  totalMaterialCost: 46857.5,
  totalLaborCost: 18960.5,
  totalLaborHours: 291.7,
  equipmentLumpSum: 12000,
  totalDirectCost: 77818,
  overheadAmount: 7781.8,
  overheadPct: 10,
  contingencyAmount: 3890.9,
  contingencyPct: 5,
  profitAmount: 13423.61,
  profitPct: 15,
  finalBidAmount: 102914.31,
};

const RATES = DEFAULT_RATES as unknown as Rates;

const ITEMS: TakeoffItem[] = [
  { id: 'row-1', system: 'Sanitary', description: 'PVC', quantity: 10, unit: 'LF' },
];

function renderBar(overrides: Partial<React.ComponentProps<typeof StepTotalsBar>> = {}) {
  return render(
    <StepTotalsBar totals={TOTALS} loading={false} stale={false} itemCount={3} {...overrides} />,
  );
}

beforeEach(() => {
  vi.mocked(calculationsApi.computeEstimate).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});


describe('StepTotalsBar', () => {
  it('shows the headline numbers and the final bid while collapsed', () => {
    renderBar();

    expect(screen.getByText('$46,857.50')).toBeTruthy();
    expect(screen.getByText('$18,960.50')).toBeTruthy();
    expect(screen.getByText('291.70 hrs')).toBeTruthy();
    expect(screen.getByText('$12,000.00')).toBeTruthy();
    expect(screen.getByText('$77,818.00')).toBeTruthy();
    expect(screen.getByText('$102,914.31')).toBeTruthy();

    // The breakdown is closed, so the markup cards are not in the DOM yet.
    expect(screen.queryByText('Overhead')).toBeNull();
  });

  it('expands to the full breakdown with the markup basis for each line', () => {
    renderBar();

    const toggle = screen.getByRole('button', { name: 'Show the full cost breakdown' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);

    const collapse = screen.getByRole('button', { name: 'Hide the full cost breakdown' });
    expect(collapse.getAttribute('aria-expanded')).toBe('true');
    expect(collapse.getAttribute('aria-controls')).toBe('live-totals-breakdown');

    expect(screen.getByText('Overhead')).toBeTruthy();
    expect(screen.getByText('Contingency')).toBeTruthy();
    expect(screen.getByText('Profit')).toBeTruthy();
    expect(screen.getByText('$7,781.80')).toBeTruthy();
    expect(screen.getByText('$3,890.90')).toBeTruthy();
    expect(screen.getByText('$13,423.61')).toBeTruthy();

    const basis = 'of the initial estimated cost before contingency and profit are applied';
    expect(screen.getByText(`Overhead: $7,781.80 (10% ${basis})`)).toBeTruthy();
    expect(screen.getByText(`Contingency: $3,890.90 (5% ${basis})`)).toBeTruthy();
    expect(screen.getByText(`Profit: $13,423.61 (15% ${basis})`)).toBeTruthy();
  });

  it('combines equipment line items with the mobilization lump sum', () => {
    renderBar({ totals: { ...TOTALS, totalEquipmentLineItemCost: 5000 } });

    // Collapsed headline: 5,000 line items + 12,000 lump sum.
    expect(screen.getByText('$17,000.00')).toBeTruthy();

    fireEvent.click(screen.getByText('Show breakdown'));

    expect(screen.getByText('Equipment & Machinery')).toBeTruthy();
    expect(screen.getByText('Incl. $12,000.00 mob')).toBeTruthy();
  });

  it('hides the optional cards when nothing was entered for them', () => {
    renderBar();
    fireEvent.click(screen.getByText('Show breakdown'));

    expect(screen.queryByText('Miscellaneous Costs')).toBeNull();
    expect(screen.queryByText('Scope Add-Ons')).toBeNull();
  });

  it('shows the optional cards when they carry a value', () => {
    renderBar({ totals: { ...TOTALS, miscCost: 450, scopeAddonsCost: 1200 } });
    fireEvent.click(screen.getByText('Show breakdown'));

    expect(screen.getByText('Miscellaneous Costs')).toBeTruthy();
    expect(screen.getByText('$450.00')).toBeTruthy();
    expect(screen.getByText('Scope Add-Ons')).toBeTruthy();
    expect(screen.getByText('Not included in total')).toBeTruthy();
  });

  it('reports updating, stale and empty states without hiding the last totals', () => {
    const { rerender } = renderBar({ totals: {}, loading: true });
    expect(screen.getByRole('status').textContent).toContain('Updating…');

    rerender(<StepTotalsBar totals={TOTALS} loading={false} stale itemCount={3} />);
    expect(screen.getByRole('status').textContent).toContain("Couldn't refresh totals");
    // The last good totals stay on screen rather than flashing zeros.
    expect(screen.getByText('$102,914.31')).toBeTruthy();

    rerender(<StepTotalsBar totals={{}} loading={false} stale={false} itemCount={0} />);
    expect(screen.getByRole('status').textContent).toContain('Add a line item');
  });
});

describe('useLiveEstimate', () => {
  it('coalesces rapid grid edits into a single request', async () => {
    vi.useFakeTimers();
    const compute = vi.mocked(calculationsApi.computeEstimate);
    compute.mockResolvedValue({ totals: TOTALS, bySystem: [], items: [] });

    const { rerender } = renderHook(({ items }) => useLiveEstimate(items, RATES), {
      initialProps: { items: ITEMS },
    });

    rerender({ items: [{ ...ITEMS[0], quantity: 11 }] });
    rerender({ items: [{ ...ITEMS[0], quantity: 12 }] });
    rerender({ items: [{ ...ITEMS[0], quantity: 13 }] });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('ignores a slow response that a newer edit has superseded', async () => {
    vi.useFakeTimers();
    const compute = vi.mocked(calculationsApi.computeEstimate);
    let resolveFirst: (value: unknown) => void = () => {};
    compute.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    compute.mockResolvedValueOnce({ totals: { finalBidAmount: 200 }, bySystem: [], items: [] });

    const { result, rerender } = renderHook(({ items }) => useLiveEstimate(items, RATES), {
      initialProps: { items: ITEMS },
    });

    // First (slow) request starts.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    // A newer edit supersedes it and resolves first.
    rerender({ items: [{ ...ITEMS[0], quantity: 99 }] });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current.totals.finalBidAmount).toBe(200);

    // The stale response lands last and must not overwrite the newer totals.
    await act(async () => {
      resolveFirst({ totals: { finalBidAmount: 100 }, bySystem: [], items: [] });
      await Promise.resolve();
    });
    expect(result.current.totals.finalBidAmount).toBe(200);
  });

  it('keeps the last good totals when a refresh fails', async () => {
    vi.useFakeTimers();
    const compute = vi.mocked(calculationsApi.computeEstimate);
    compute.mockResolvedValueOnce({ totals: TOTALS, bySystem: [], items: [] });

    const { result, rerender } = renderHook(({ items }) => useLiveEstimate(items, RATES), {
      initialProps: { items: ITEMS },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current.totals.finalBidAmount).toBe(102914.31);

    compute.mockRejectedValueOnce(new Error('network down'));
    rerender({ items: [{ ...ITEMS[0], quantity: 5 }] });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(result.current.totals.finalBidAmount).toBe(102914.31);
    expect(result.current.stale).toBe(true);
  });

  it('skips the request entirely when the grid is empty', async () => {
    vi.useFakeTimers();
    const compute = vi.mocked(calculationsApi.computeEstimate);

    const { result } = renderHook(() => useLiveEstimate([], RATES));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(compute).not.toHaveBeenCalled();
    expect(result.current.totals).toEqual({});
    expect(result.current.loading).toBe(false);
    expect(result.current.ready).toBe(true);
  });
});

