import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

/**
 * The AI fallback inside the "Match Spreadsheet Columns" modal is quota-gated:
 *   free/trial 0 uses · starter 30 / seat / month · pro 100 · enterprise 200.
 * The model only picks the layout; the user still confirms the import.
 */
const TRANSLATIONS: Record<string, string> = {
  'product.aiAssist.button': 'Fix with AI',
  'product.aiAssist.buttonHint': 'Let the AI choose the header row and columns.',
  'product.aiAssist.upgradeHint': 'Available on the Starter, Pro and Enterprise plans.',
  'product.aiAssist.quotaHint': 'You have used all {{max}} AI mapping assists this month.',
  'product.aiAssist.runningChip': 'AI is mapping…',
  'product.aiAssist.runningTitle': 'Asking the AI to map this sheet',
  'product.aiAssist.runningBody': 'Only the first rows are sent.',
  'product.aiAssist.appliedTitle': 'AI mapping applied',
  'product.aiAssist.appliedBody': '{{count}} line items ready · {{confidence}}% confidence',
  'product.aiAssist.reviewHint': 'Check the headers and preview below.',
  'product.aiAssist.failedTitle': 'The AI could not map this sheet',
  'product.aiAssist.failedFallback': 'The AI could not map this sheet.',
  'product.aiAssist.disabledOnDeployment': 'AI remapping is not enabled on this deployment.',
};

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const template = TRANSLATIONS[key] ?? key;
      if (!params) return template;
      return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(params[name] ?? ''));
    },
  }),
}));

// The modal only needs `showConfirm` for preset deletion, which these tests never trigger.
vi.mock('@/core/components/context/ModalContext', () => ({
  useModal: () => ({ showConfirm: vi.fn(async () => true) }),
}));

import ColumnMappingModal from '@/product/components/ColumnMappingModal';
import type { AiAssistResult, AiAssistUsage } from '@/types/models';

const STARTER_USAGE: AiAssistUsage = {
  used: 1,
  max: 30,
  remaining: 29,
  periodStart: '2026-11-01',
  resetsAt: '2026-12-01',
  unlimited: false,
};

const FREE_USAGE: AiAssistUsage = { ...STARTER_USAGE, used: 0, max: 0, remaining: 0 };

function aiResult(overrides: Partial<AiAssistResult> = {}): AiAssistResult {
  return {
    aiApplied: true,
    headerRowIndex: 1,
    headers: ['Trade', 'Description', 'Qty', 'UOM'],
    rawRows: [{ Trade: 'Water', Description: 'PVC', Qty: '275', UOM: 'LF' }],
    mapping: { system: 'Trade', item_description: 'Description', quantity: 'Qty', unit: 'UOM' },
    matchConfidences: { system: 1, item_description: 1, quantity: 1, unit: 1 },
    confidence: 0.94,
    notes: 'Headers are on the second row.',
    itemCount: 12,
    model: 'anthropic/claude-haiku-5.5',
    usage: { ...STARTER_USAGE, used: 2, remaining: 28 },
    ...overrides,
  } as AiAssistResult;
}

function renderModal(overrides: Record<string, unknown> = {}) {
  const onAiAssist = vi.fn(async () => aiResult());
  const utils = render(
    <ColumnMappingModal
      headers={['Trade', 'Description', 'Qty', 'UOM']}
      rawRows={[{ Trade: 'Water', Description: 'PVC', Qty: '275', UOM: 'LF' }]}
      initialMapping={{}}
      sampleMatrix={[['Trade', 'Description', 'Qty', 'UOM']]}
      aiAvailable
      aiUsage={STARTER_USAGE}
      onAiAssist={onAiAssist}
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...overrides}
    />,
  );
  return { ...utils, onAiAssist };
}

const SYSTEM_SELECT = 'product.csvParser.targetFields.systemLabel';

describe('AI mapping fallback in the column mapping modal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('keeps the fallback visible but disabled when the deployment has no AI configured', () => {
    renderModal({ aiAvailable: false });

    const button = screen.getByText('Fix with AI').closest('button');
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('title')).toBe('AI remapping is not enabled on this deployment.');
  });

  it('hides the fallback only when the caller offers no handler at all', () => {
    renderModal({ onAiAssist: undefined, aiUsage: null });

    expect(screen.queryByText('Fix with AI')).toBeNull();
  });

  it('runs the assist on open when the caller asked for an automatic remap', async () => {
    const { onAiAssist } = renderModal({ aiAutoRun: true });

    await waitFor(() => expect(onAiAssist).toHaveBeenCalledTimes(1));
    expect(screen.getByText('AI mapping applied')).toBeTruthy();
  });

  it('never auto-runs on a deployment without AI configured', async () => {
    const onAiAssist = vi.fn(async () => aiResult());
    renderModal({ aiAutoRun: true, aiAvailable: false, onAiAssist });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onAiAssist).not.toHaveBeenCalled();
  });

  it('shows a locked fallback on a plan that does not include AI mapping', () => {
    renderModal({ aiUsage: FREE_USAGE });

    const button = screen.getByText('Fix with AI').closest('button');
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('title')).toBe('Available on the Starter, Pro and Enterprise plans.');
  });

  it('locks the fallback once the monthly allowance is spent', () => {
    renderModal({ aiUsage: { ...STARTER_USAGE, used: 30, remaining: 0 } });

    const button = screen.getByText('Fix with AI').closest('button');
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('title')).toBe('You have used all 30 AI mapping assists this month.');
  });

  it('shows the allowance next to the action while uses remain', () => {
    renderModal();

    expect(screen.getByText('1/30')).toBeTruthy();
    const button = screen.getByText('Fix with AI').closest('button');
    expect(button?.disabled).toBe(false);
  });

  it('applies the AI layout to the column selects and reports what it did', async () => {
    const { onAiAssist } = renderModal();

    fireEvent.click(screen.getByText('Fix with AI'));

    await waitFor(() => expect(onAiAssist).toHaveBeenCalledTimes(1));

    // The mapping the model returned is now the modal's live mapping.
    await waitFor(() => {
      const systemSelect = screen.getByLabelText(SYSTEM_SELECT) as HTMLSelectElement;
      expect(systemSelect.value).toBe('Trade');
    });
    expect(screen.getByText('AI mapping applied')).toBeTruthy();
    expect(screen.getByText('12 line items ready · 94% confidence')).toBeTruthy();
    expect(screen.getByText('Headers are on the second row.')).toBeTruthy();

    // The allowance chip reflects the usage the backend returned for this assist.
    expect(screen.getByText('2/30')).toBeTruthy();
  });

  it('surfaces why the AI could not run without touching the mapping', async () => {
    const onAiAssist = vi.fn(async () => {
      throw new Error('You have used all 30 AI mapping assists for this month.');
    });
    renderModal({ onAiAssist });

    fireEvent.click(screen.getByText('Fix with AI'));

    await waitFor(() => expect(screen.getByText('The AI could not map this sheet')).toBeTruthy());
    expect(screen.getByText('You have used all 30 AI mapping assists for this month.')).toBeTruthy();

    // A failed assist leaves the manual mapping untouched and still confirmable.
    const systemSelect = screen.getByLabelText(SYSTEM_SELECT) as HTMLSelectElement;
    expect(systemSelect.value).toBe('');
  });
});
