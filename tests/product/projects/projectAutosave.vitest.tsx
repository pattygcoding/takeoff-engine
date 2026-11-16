import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

/**
 * Step 2 used to persist nothing: edits lived in localStorage until the Step 3 save modal ran, and
 * reopening the project replaced them with the stale cloud copy. These tests pin the autosave that
 * fixes it — create-on-first-edit, debounce, unchanged-skip, locked-skip, error retention, flush.
 */
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/product/lib/projects', () => ({
  projectsApi: { create: mocks.create, update: mocks.update },
}));

import {
  estimateFingerprint,
  isLocalDraftDirty,
  recordSavedFingerprint,
  useProjectAutosave,
} from '@/product/lib/useProjectAutosave';
import type { ColumnDefinition, Project, Rates, TakeoffItem } from '@/types/models';

const RATES = { laborRate: 65 } as Rates;
const ITEMS: TakeoffItem[] = [
  { id: 'row-1', system: 'Sanitary', description: 'PVC', quantity: 10, unit: 'LF' },
];
const COLUMNS: ColumnDefinition[] = [];
const PROJECT = { id: 'proj-1', name: 'Main St Sewer' } as Project;

type AutosaveProps = Parameters<typeof useProjectAutosave>[0];

function renderAutosave(overrides: Partial<AutosaveProps> = {}) {
  const onSaved = vi.fn();
  const initialProps: AutosaveProps = {
    project: PROJECT,
    items: ITEMS,
    rates: RATES,
    columns: COLUMNS,
    summary: { finalBidAmount: 100 },
    draftName: 'Main St Sewer',
    enabled: true,
    onSaved,
    // Long by default so only an explicit flush saves; the debounce test overrides it.
    debounceMs: 60_000,
    ...overrides,
  };

  const utils = renderHook((props: AutosaveProps) => useProjectAutosave(props), { initialProps });
  return { ...utils, onSaved, initialProps };
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.create.mockReset();
  mocks.update.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('useProjectAutosave', () => {
  it('creates the draft project on the first edit and adopts it', async () => {
    mocks.create.mockResolvedValue({ id: 'proj-new', name: 'Main St Sewer' });
    const { result, onSaved } = renderAutosave({ project: null });

    await act(async () => {
      await result.current.flush();
    });

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      name: 'Main St Sewer',
      status: 'draft',
      items: ITEMS,
      rates: RATES,
      columns: COLUMNS,
      summary: { finalBidAmount: 100 },
    });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-new' }));
    expect(result.current.status).toBe('saved');
  });

  it('updates the same project on later edits instead of creating a duplicate', async () => {
    mocks.update.mockResolvedValue(PROJECT);
    const { result, rerender, initialProps } = renderAutosave();

    await act(async () => {
      await result.current.flush();
    });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.create).not.toHaveBeenCalled();

    const edited = [{ ...ITEMS[0], quantity: 12 }];
    rerender({ ...initialProps, items: edited });

    await act(async () => {
      await result.current.flush();
    });

    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.update.mock.calls[1][0]).toBe('proj-1');
    expect(mocks.update.mock.calls[1][1].items).toEqual(edited);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('skips the request when the estimate has not changed', async () => {
    mocks.update.mockResolvedValue(PROJECT);
    const { result } = renderAutosave();

    await act(async () => {
      await result.current.flush();
    });
    await act(async () => {
      await result.current.flush();
    });

    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('coalesces rapid edits into a single debounced request', async () => {
    mocks.update.mockResolvedValue(PROJECT);
    const { rerender, initialProps } = renderAutosave({ debounceMs: 10 });

    rerender({ ...initialProps, items: [{ ...ITEMS[0], quantity: 11 }] });
    rerender({ ...initialProps, items: [{ ...ITEMS[0], quantity: 12 }] });
    rerender({ ...initialProps, items: [{ ...ITEMS[0], quantity: 13 }] });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0][1].items[0].quantity).toBe(13);
  });

  it('never writes while the project is locked', async () => {
    const { result, rerender, initialProps } = renderAutosave({ enabled: false });

    rerender({ ...initialProps, items: [{ ...ITEMS[0], quantity: 99 }] });
    await act(async () => {
      await result.current.flush();
    });

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('does not create a project for an empty grid', async () => {
    const { result } = renderAutosave({ project: null, items: [] });

    await act(async () => {
      await result.current.flush();
    });

    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('keeps the last successful save and reports the failure', async () => {
    mocks.update.mockResolvedValueOnce(PROJECT);
    const { result, rerender, initialProps } = renderAutosave();

    await act(async () => {
      await result.current.flush();
    });
    expect(result.current.status).toBe('saved');
    const savedAt = result.current.savedAt;

    mocks.update.mockRejectedValueOnce(new Error('offline'));
    rerender({ ...initialProps, items: [{ ...ITEMS[0], quantity: 42 }] });

    await act(async () => {
      await result.current.flush();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('offline');
    expect(result.current.savedAt).toBe(savedAt);
  });

  it('flush saves immediately instead of waiting for the debounce', async () => {
    mocks.update.mockResolvedValue(PROJECT);
    const { result } = renderAutosave({ debounceMs: 60_000 });

    await act(async () => {
      await result.current.flush();
    });

    expect(mocks.update).toHaveBeenCalledTimes(1);
  });
});

describe('local draft fingerprint', () => {
  it('treats a project this browser never saved as not dirty', () => {
    expect(isLocalDraftDirty('never-saved', ITEMS, RATES, COLUMNS)).toBe(false);
  });

  it('detects edits made after the last save', () => {
    recordSavedFingerprint('proj-1', ITEMS, RATES, COLUMNS);

    expect(isLocalDraftDirty('proj-1', ITEMS, RATES, COLUMNS)).toBe(false);
    expect(isLocalDraftDirty('proj-1', [{ ...ITEMS[0], quantity: 2 }], RATES, COLUMNS)).toBe(true);
  });

  it('ignores key order so an identical estimate is never considered dirty', () => {
    recordSavedFingerprint('proj-1', ITEMS, { laborRate: 65, overheadPct: 10 } as Rates, COLUMNS);

    expect(
      isLocalDraftDirty('proj-1', ITEMS, { overheadPct: 10, laborRate: 65 } as Rates, COLUMNS),
    ).toBe(false);
    expect(estimateFingerprint(ITEMS, { laborRate: 65 } as Rates, COLUMNS)).toBe(
      estimateFingerprint(ITEMS, { laborRate: 65 } as Rates, COLUMNS),
    );
  });
});

