import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * Step 2 used to have no save at all: `handleCalculate` only navigated, so a new takeoff existed
 * only in localStorage until the Step 3 save modal ran. This pins the workspace wiring that now
 * creates the draft on the first edit and adopts it (so later saves update it, never duplicate).
 */
vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number> | string) =>
      params && typeof params === 'object' ? `${key} ${Object.values(params).join(' ')}` : key,
  }),
}));

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  getById: vi.fn(),
  computeEstimate: vi.fn(),
}));

vi.mock('@/product/lib/projects', () => ({
  projectsApi: {
    create: mocks.create,
    update: mocks.update,
    getById: mocks.getById,
    clone: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/product/lib/calculations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/product/lib/calculations')>();
  return {
    ...actual,
    calculationsApi: { ...actual.calculationsApi, computeEstimate: mocks.computeEstimate },
  };
});

// The heavy step surfaces are irrelevant here; the workspace wiring is what is under test.
vi.mock('@/product/components/EditStep', () => ({
  default: (props: { saveState?: { status: string }; live?: unknown }) => (
    <div
      data-testid="edit-step"
      data-save-status={props.saveState?.status ?? 'none'}
      data-has-live={String(Boolean(props.live))}
    />
  ),
}));
vi.mock('@/product/components/ResultsStep', () => ({ default: () => <div data-testid="results-step" /> }));
vi.mock('@/product/components/ExportHubPage', () => ({ default: () => null }));

import ProjectWorkspace from '@/product/components/ProjectWorkspace';
import { DEFAULT_RATES } from '@/product/constants/calculations.constants';
import type { Rates, TakeoffItem } from '@/types/models';

const ITEMS: TakeoffItem[] = [
  { id: 'row-1', system: 'Sanitary', description: 'PVC', quantity: 10, unit: 'LF' },
];

function renderWorkspace() {
  const setCurrentProject = vi.fn();
  const setItems = vi.fn();

  render(
    <MemoryRouter initialEntries={['/jane/edit']}>
      <Routes>
        <Route
          path="/:username/edit"
          element={
            <ProjectWorkspace
              step={2}
              items={ITEMS}
              setItems={setItems}
              rates={DEFAULT_RATES as unknown as Rates}
              setRates={vi.fn()}
              currentProject={null}
              setCurrentProject={setCurrentProject}
              setImportContext={vi.fn()}
              columns={[]}
              setColumns={vi.fn()}
            />
          }
        />
        <Route path="/:username/takeoff/:projectId/edit" element={<div>adopted route</div>} />
        <Route path="/:username" element={<div>dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );

  return { setCurrentProject, setItems };
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.create.mockReset();
  mocks.update.mockReset();
  mocks.getById.mockReset();
  mocks.computeEstimate.mockReset();
  mocks.computeEstimate.mockResolvedValue({ totals: { finalBidAmount: 100 }, bySystem: [], items: [] });
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ProjectWorkspace draft autosave', () => {
  it('creates a draft project on the first Step 2 edit and adopts it', async () => {
    vi.useFakeTimers();
    mocks.create.mockResolvedValue({ id: 'proj-new', name: 'Untitled takeoff' });
    mocks.getById.mockResolvedValue({
      id: 'proj-new',
      name: 'Untitled takeoff',
      latestEstimate: { items_json: ITEMS, rates_json: DEFAULT_RATES, columns_json: [] },
    });

    const { setCurrentProject } = renderWorkspace();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      name: 'product.projectWorkspace.untitledTakeoff',
      status: 'draft',
      items: ITEMS,
    });
    expect(setCurrentProject).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-new' }));
    // The URL is rewritten to the new project so a refresh reopens the same draft.
    expect(screen.getByText('adopted route')).toBeTruthy();
  });

  it('gives Step 2 the workspace live estimate and save state', async () => {
    vi.useFakeTimers();
    mocks.create.mockResolvedValue({ id: 'proj-new', name: 'Untitled takeoff' });

    renderWorkspace();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    const step = screen.getByTestId('edit-step');
    expect(step.getAttribute('data-has-live')).toBe('true');
    expect(step.getAttribute('data-save-status')).not.toBe('none');
  });
});
