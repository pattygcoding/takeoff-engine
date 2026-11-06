import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

/**
 * Step 2 offers "Remap Using AI" as a *second chance* when the first parse disappointed. The button
 * is always present and disabled with a reason (never hidden), and opening it runs the model instead
 * of asking the user to re-map by hand.
 */
const TRANSLATIONS: Record<string, string> = {
  'product.aiAssist.remapBtn': 'Remap Using AI',
  'product.aiAssist.remapHint': 'Let the AI re-read the original spreadsheet and remap the columns.',
  'product.aiAssist.remapNeedsUpload': 'Re-upload the spreadsheet to remap it with AI.',
  'product.aiAssist.disabledOnDeployment': 'AI remapping is not enabled on this deployment.',
  'product.aiAssist.upgradeHint': 'Available on the Starter, Pro and Enterprise plans.',
  'product.aiAssist.quotaHint': 'You have used all {{max}} AI mapping assists this month.',
  'product.aiAssist.button': 'Fix with AI',
  'product.aiAssist.buttonHint': 'Let the AI choose the header row and columns.',
  'product.aiAssist.runningChip': 'AI is mapping…',
  'product.aiAssist.runningTitle': 'Asking the AI to map this sheet',
  'product.aiAssist.runningBody': 'Only the first rows are sent.',
  'product.aiAssist.appliedTitle': 'AI mapping applied',
  'product.aiAssist.appliedBody': '{{count}} line items ready · {{confidence}}% confidence',
  'product.aiAssist.reviewHint': 'Check the headers and preview below.',
  'product.aiAssist.failedTitle': 'The AI could not map this sheet',
  'product.aiAssist.failedFallback': 'The AI could not map this sheet.',
};

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) => {
      const template = TRANSLATIONS[key] ?? key;
      if (!params) return template;
      return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(params[name] ?? ''));
    },
  }),
}));

vi.mock('@/product/components/RatesDrawer', () => ({ default: () => null }));

vi.mock('@/core/components/context/ModalContext', () => ({
  useModal: () => ({
    showAlert: vi.fn(async () => true),
    showConfirm: vi.fn(async () => true),
    showPrompt: vi.fn(async () => null),
  }),
}));

// The transport layer only: the real hook, the real button policy and the real modal all run.
vi.mock('@/product/lib/csv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/product/lib/csv')>();
  return {
    ...actual,
    getAiAssistUsage: vi.fn(),
    parseTakeoffFile: vi.fn(),
    requestAiMapping: vi.fn(),
  };
});

import EditStep from '@/product/components/EditStep';
import { getAiAssistUsage, parseTakeoffFile, requestAiMapping } from '@/product/lib/csv';
import { DEFAULT_RATES } from '@/product/constants/calculations.constants';
import type { AiAssistResult, AiAssistUsage, MappingModalData, Rates, TakeoffItem } from '@/types/models';

const STARTER: AiAssistUsage = {
  used: 3,
  max: 30,
  remaining: 27,
  periodStart: '2026-11-01',
  resetsAt: '2026-12-01',
  unlimited: false,
};

const FREE: AiAssistUsage = { ...STARTER, used: 0, max: 0, remaining: 0 };

const ITEMS: TakeoffItem[] = [
  { id: 'row-1', system: 'Sanitary', description: 'PVC pipe', quantity: 10, unit: 'LF' },
];

/** The payload a parse leaves behind, including the raw matrix Step 2 remaps from. */
const MAPPING_DATA: MappingModalData = {
  headers: ['Trade', 'Description', 'Qty', 'UOM'],
  rawRows: [{ Trade: 'Sanitary', Description: 'PVC pipe', Qty: '10', UOM: 'LF' }],
  mapping: { system: 'Trade', item_description: 'Description', quantity: 'Qty', unit: 'UOM' },
  matchConfidences: {},
  overallConfidence: 0.5,
  sampleMatrix: [['Trade', 'Description', 'Qty', 'UOM']],
  rawMatrix: [
    ['Trade', 'Description', 'Qty', 'UOM'],
    ['Sanitary', 'PVC pipe', '10', 'LF'],
  ],
  headerRowIndex: 0,
  sheetNames: ['CSV Upload'],
  activeSheetName: 'CSV Upload',
  subTables: [],
  activeTableId: null,
};

function aiResult(): AiAssistResult {
  return {
    aiApplied: true,
    headerRowIndex: 0,
    headers: ['Trade', 'Description', 'Qty', 'UOM'],
    rawRows: [{ Trade: 'Sanitary', Description: 'PVC pipe', Qty: '10', UOM: 'LF' }],
    mapping: { system: 'Trade', item_description: 'Description', quantity: 'Qty', unit: 'UOM' },
    matchConfidences: { system: 1, item_description: 1, quantity: 1, unit: 1 },
    confidence: 0.9,
    notes: 'Headers are on the first row.',
    itemCount: 1,
    model: 'anthropic/claude-haiku-5.5',
    usage: { ...STARTER, used: 4, remaining: 26 },
  } as AiAssistResult;
}

function renderStep(overrides: Record<string, unknown> = {}) {
  const onItemsChange = vi.fn();
  render(
    <EditStep
      items={ITEMS}
      onItemsChange={onItemsChange}
      rates={DEFAULT_RATES as unknown as Rates}
      onRatesChange={vi.fn()}
      onCalculate={vi.fn()}
      columns={[]}
      {...overrides}
    />,
  );
  return { onItemsChange };
}

const remapButton = () => screen.getByText('Remap Using AI').closest('button') as HTMLButtonElement;

describe('Step 2 "Remap Using AI"', () => {
  beforeEach(() => {
    vi.mocked(requestAiMapping).mockResolvedValue(aiResult());
    vi.mocked(parseTakeoffFile).mockResolvedValue(MAPPING_DATA as never);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('is disabled, not hidden, when the plan has no AI mapping', async () => {
    vi.mocked(getAiAssistUsage).mockResolvedValue({ enabled: true, model: 'anthropic/claude-haiku-5.5', usage: FREE });
    renderStep({ importContext: { file: { name: 'vendor.csv' }, mappingData: MAPPING_DATA } });

    await waitFor(() => expect(remapButton().disabled).toBe(true));
    expect(remapButton().getAttribute('title')).toBe('Available on the Starter, Pro and Enterprise plans.');
  });

  it('is disabled with a clear reason once the allowance is spent', async () => {
    vi.mocked(getAiAssistUsage).mockResolvedValue({
      enabled: true,
      model: 'anthropic/claude-haiku-5.5',
      usage: { ...STARTER, used: 30, remaining: 0 },
    });
    renderStep({ importContext: { file: { name: 'vendor.csv' }, mappingData: MAPPING_DATA } });

    await waitFor(() => expect(remapButton().disabled).toBe(true));
    expect(remapButton().getAttribute('title')).toBe('You have used all 30 AI mapping assists this month.');
  });

  it('is disabled when the deployment has no key, with the deployment reason', async () => {
    vi.mocked(getAiAssistUsage).mockResolvedValue({
      enabled: false,
      model: 'anthropic/claude-haiku-5.5',
      usage: STARTER,
    });
    renderStep({ importContext: { file: { name: 'vendor.csv' }, mappingData: MAPPING_DATA } });

    await waitFor(() => expect(remapButton().disabled).toBe(true));
    expect(remapButton().getAttribute('title')).toBe('AI remapping is not enabled on this deployment.');
  });

  it('asks for a re-upload when the original sheet is no longer in memory', async () => {
    vi.mocked(getAiAssistUsage).mockResolvedValue({ enabled: true, model: 'anthropic/claude-haiku-5.5', usage: STARTER });
    renderStep({ importContext: { file: null, mappingData: null } });

    await waitFor(() => expect(remapButton().disabled).toBe(true));
    expect(remapButton().getAttribute('title')).toBe('Re-upload the spreadsheet to remap it with AI.');
  });

  it('runs the model as soon as the modal opens, without asking the user to map by hand', async () => {
    vi.mocked(getAiAssistUsage).mockResolvedValue({ enabled: true, model: 'anthropic/claude-haiku-5.5', usage: STARTER });
    renderStep({ importContext: { file: { name: 'vendor.csv' }, mappingData: MAPPING_DATA } });

    await waitFor(() => expect(remapButton().disabled).toBe(false));
    expect(screen.getByText('3/30')).toBeTruthy();

    fireEvent.click(remapButton());

    await waitFor(() => expect(requestAiMapping).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('AI mapping applied')).toBeTruthy());
    expect(screen.getByText('1 line items ready · 90% confidence')).toBeTruthy();
  });

  it('remaps from the matrix already in memory when the file is gone', async () => {
    vi.mocked(getAiAssistUsage).mockResolvedValue({ enabled: true, model: 'anthropic/claude-haiku-5.5', usage: STARTER });
    renderStep({ importContext: { file: null, mappingData: MAPPING_DATA } });

    await waitFor(() => expect(remapButton().disabled).toBe(false));
    fireEvent.click(remapButton());

    await waitFor(() => expect(requestAiMapping).toHaveBeenCalledTimes(1));
    const [, , , matrixContext] = vi.mocked(requestAiMapping).mock.calls[0];
    expect(matrixContext).toMatchObject({ matrix: MAPPING_DATA.rawMatrix });
  });
});
