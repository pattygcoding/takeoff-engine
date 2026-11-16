import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number> | string) => {
      if (!params || typeof params === 'string') return key;
      return `${key}:${Object.values(params).join(',')}`;
    },
  }),
}));

const drawerSpy = vi.hoisted(() => vi.fn());

vi.mock('@/product/components/RatesDrawer', () => ({
  default: (props: { open: boolean; initialSection?: string }) => {
    drawerSpy(props);
    return props.open ? <div data-testid="rates-drawer" data-section={props.initialSection} /> : null;
  },
}));

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

vi.mock('@/product/lib/csv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/product/lib/csv')>();
  return {
    ...actual,
    getAiAssistUsage: vi.fn(async () => ({ enabled: false, model: null, usage: null })),
  };
});

vi.mock('@/core/components/context/ModalContext', () => ({
  useModal: () => ({
    showAlert: vi.fn(async () => true),
    showConfirm: vi.fn(async () => true),
    showPrompt: vi.fn(async () => null),
  }),
}));

import Stepper from '@/product/components/Stepper';
import EditStep from '@/product/components/EditStep';
import TakeoffGrid from '@/product/components/TakeoffGrid';
import UploadStep from '@/product/components/UploadStep';
import { DEFAULT_RATES } from '@/product/constants/calculations.constants';
import type { Rates, TakeoffItem } from '@/types/models';

const MULTI_SYSTEM_ITEMS: TakeoffItem[] = [
  { id: '1', system: 'Sanitary', description: 'PVC Sewer Pipe', sizeSpec: '8"', quantity: 120, unit: 'LF' },
  { id: '2', system: 'Storm', description: 'RCP Storm Drain', sizeSpec: '15"', quantity: 80, unit: 'LF' },
  { id: '3', system: 'Sanitary', description: 'Precast Manhole', sizeSpec: '48"', quantity: 2, unit: 'EA' },
  { id: '4', system: 'Domestic Water', description: 'Gate Valve', sizeSpec: '6"', quantity: 4, unit: 'EA' },
];

describe('Steps 1–3 workflow UX improvements', () => {
  afterEach(() => {
    cleanup();
    drawerSpy.mockClear();
  });

  describe('Stepper bidirectional navigation', () => {
    it('disables Step 3 when on Step 2 with an empty takeoff', () => {
      render(<Stepper step={2} hasItems={false} onStepClick={vi.fn()} />);
      const step3 = screen.getByRole('button', { name: /product\.stepper\.step3Label/ });
      expect((step3 as HTMLButtonElement).disabled).toBe(true);
    });

    it('lets the user jump straight from Step 2 to Step 3 when line items exist', () => {
      const onStepClick = vi.fn();
      render(<Stepper step={2} hasItems onStepClick={onStepClick} />);
      const step3 = screen.getByRole('button', { name: /product\.stepper\.step3Label/ });
      expect((step3 as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(step3);
      expect(onStepClick).toHaveBeenCalledWith(3);
    });

    it('keeps Steps 1 and 2 locked when the project is awarded even if items exist', () => {
      const onStepClick = vi.fn();
      render(<Stepper step={3} isAwarded hasItems onStepClick={onStepClick} />);
      const step1 = screen.getByRole('button', { name: /product\.stepper\.step1Label/ });
      const step2 = screen.getByRole('button', { name: /product\.stepper\.step2Label/ });
      expect((step1 as HTMLButtonElement).disabled).toBe(true);
      expect((step2 as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('UploadStep (Step 1) progressive disclosure', () => {
    it('collapses the technical column-mapping reference by default', () => {
      render(
        <MemoryRouter>
          <UploadStep onItemsParsed={vi.fn()} />
        </MemoryRouter>,
      );

      const summary = screen.getByText('product.uploadStep.supportedColumnsSummary');
      const details = summary.closest('details');
      expect(details).not.toBeNull();
      expect(details?.open).toBe(false);
    });
  });

  describe('EditStep (Step 2) zones, pricing deep-links, and sticky CTA', () => {
    it('anchors the primary Step 3 CTA in the sticky totals bar and disables it when empty', () => {
      const onCalculate = vi.fn();
      const { rerender } = render(
        <EditStep
          items={[]}
          onItemsChange={vi.fn()}
          rates={DEFAULT_RATES as unknown as Rates}
          onRatesChange={vi.fn()}
          onCalculate={onCalculate}
        />,
      );

      const ctaEmpty = screen.getByRole('button', { name: /product\.editStep\.calculateBtn/ }) as HTMLButtonElement;
      expect(ctaEmpty.disabled).toBe(true);

      rerender(
        <EditStep
          items={MULTI_SYSTEM_ITEMS}
          onItemsChange={vi.fn()}
          rates={DEFAULT_RATES as unknown as Rates}
          onRatesChange={vi.fn()}
          onCalculate={onCalculate}
        />,
      );

      const ctaReady = screen.getByRole('button', { name: /product\.editStep\.calculateBtn/ }) as HTMLButtonElement;
      expect(ctaReady.disabled).toBe(false);
      fireEvent.click(ctaReady);
      expect(onCalculate).toHaveBeenCalledTimes(1);
    });

    it('opens RatesDrawer directly to labor from the summary strip badge', () => {
      render(
        <EditStep
          items={MULTI_SYSTEM_ITEMS}
          onItemsChange={vi.fn()}
          rates={DEFAULT_RATES as unknown as Rates}
          onRatesChange={vi.fn()}
          onCalculate={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /product\.editStep\.baseLaborBadge/ }));
      expect(screen.getByTestId('rates-drawer').getAttribute('data-section')).toBe('labor');
    });
  });

  describe('TakeoffGrid system filtering & safe inline editing', () => {
    it('filters visible rows by system while preserving unfiltered items on edit and addRow', () => {
      const onChange = vi.fn();
      render(
        <TakeoffGrid
          items={MULTI_SYSTEM_ITEMS}
          onChange={onChange}
          rates={DEFAULT_RATES as unknown as Rates}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Storm (1)' }));
      expect(screen.getByDisplayValue('RCP Storm Drain')).toBeTruthy();
      expect(screen.queryByDisplayValue('PVC Sewer Pipe')).toBeNull();

      fireEvent.change(screen.getByDisplayValue('RCP Storm Drain'), {
        target: { value: 'Updated Storm Drain' },
      });
      const afterEdit = onChange.mock.calls[0][0] as TakeoffItem[];
      expect(afterEdit).toHaveLength(4);
      expect(afterEdit.find((i) => i.id === '2')?.description).toBe('Updated Storm Drain');

      fireEvent.click(screen.getByRole('button', { name: /product\.takeoffGrid\.addRow/ }));
      const afterAdd = onChange.mock.calls[1][0] as TakeoffItem[];
      expect(afterAdd).toHaveLength(5);
      expect(afterAdd[4].system).toBe('Storm');
    });
  });
});
