import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Step 1 used to be a single dropzone, so a user could not tell that the AI could map the sheet or
 * that the grid accepts hand-typed rows. These tests pin the three-way "how do you want to start?"
 * choice and the behaviour behind each option.
 */
const TRANSLATIONS: Record<string, string> = {
  'product.uploadStep.title': 'Import Your Takeoff',
  'product.uploadStep.subtitle': 'Choose how you would like to start.',
  'product.uploadStep.chooseMethodLabel': 'How would you like to start?',
  'product.uploadStep.modeParserTitle': 'Upload spreadsheet',
  'product.uploadStep.modeParserDesc': 'Automatic column detection with a review step.',
  'product.uploadStep.modeAiTitle': 'Import with AI',
  'product.uploadStep.modeAiDesc': 'The AI picks the header row and columns.',
  'product.uploadStep.modeAiBadge': 'AI',
  'product.uploadStep.modeManualTitle': 'Enter manually',
  'product.uploadStep.modeManualDesc': 'Skip the file and type your line items straight into the grid.',
  'product.uploadStep.modeManualCta': 'Start with a blank grid',
  'product.uploadStep.modeManualHint': 'You will land on the item grid with one empty row.',
  'product.uploadStep.dropzoneAiHint': 'Choose a file and the AI will map it for you.',
  'product.uploadStep.dragDropMessage': 'Drag & drop your CSV or Excel file here, or',
  'product.uploadStep.browseLink': 'browse',
  'product.uploadStep.fileTypeHint': 'Accepts .csv, .xlsx, .xls, and .xlsm files',
  'product.uploadStep.parsingMessage': 'Parsing spreadsheet and sniffing headers…',
  'product.uploadStep.aiAllowance': '{{remaining}} of {{max}} AI imports left this month',
  'product.uploadStep.aiAllowanceUnlimited': 'Unlimited AI imports',
  'product.aiAssist.disabledOnDeployment': 'AI remapping is not enabled on this deployment.',
  'product.aiAssist.upgradeHint': 'AI column mapping is available on the Starter, Pro and Enterprise plans.',
  'product.aiAssist.quotaHint': 'You have used all {{max}} AI mapping assists for this month.',
  'product.aiAssist.appliedBody': '{{count}} line items ready · {{confidence}}% confidence',
  'product.aiAssist.failedFallback': 'The AI could not map this sheet.',
};

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({
    // Mirrors the real helper: a second argument that is a string is a legacy fallback and ignored.
    t: (key: string, params?: Record<string, string | number> | string) => {
      const template = TRANSLATIONS[key] ?? key;
      if (!params || typeof params === 'string') return template;
      return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(params[name] ?? ''));
    },
  }),
}));

const mocks = vi.hoisted(() => ({
  parseTakeoffFile: vi.fn(),
  requestAiMapping: vi.fn(),
  getAiAssistUsage: vi.fn(),
  createBlankItem: vi.fn(),
}));

vi.mock('@/product/lib/csv', () => ({
  parseTakeoffFile: mocks.parseTakeoffFile,
  requestAiMapping: mocks.requestAiMapping,
  getAiAssistUsage: mocks.getAiAssistUsage,
  createBlankItem: mocks.createBlankItem,
  downloadSampleCsv: vi.fn(),
  downloadSampleExcel: vi.fn(),
}));

// The modal has its own suite; here it only needs to report how UploadStep opened it.
vi.mock('@/product/components/ColumnMappingModal', () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement('div', {
      'data-testid': 'mapping-modal',
      'data-autorun': String(props.aiAutoRun ?? false),
      'data-ai-available': String(props.aiAvailable ?? false),
    }),
}));

import UploadStep from '@/product/components/UploadStep';
import type { AiAssistUsage } from '@/types/models';

const STARTER_USAGE: AiAssistUsage = {
  used: 1,
  max: 30,
  remaining: 29,
  periodStart: '2026-11-01',
  resetsAt: '2026-12-01',
  unlimited: false,
};

const BLANK_ITEM = {
  id: 'blank-1',
  system: 'Sanitary',
  description: '',
  sizeSpec: '',
  quantity: 0,
  unit: 'LF',
  avgDepthFt: 0,
  materialCostPerUnit: 0,
  laborHoursPerUnit: 0,
};

function csvFile(name = 'quote.csv') {
  return new File(['trade,qty\nWater,10'], name, { type: 'text/csv' });
}

function renderUploadStep() {
  const onItemsParsed = vi.fn();
  render(
    <MemoryRouter>
      <UploadStep onItemsParsed={onItemsParsed} />
    </MemoryRouter>,
  );
  return { onItemsParsed };
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!input) throw new Error('file input not rendered');
  return input as HTMLInputElement;
}

function chooseFile(input: HTMLInputElement, file = csvFile()) {
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  mocks.getAiAssistUsage.mockResolvedValue({ enabled: true, model: 'test', usage: STARTER_USAGE });
  mocks.createBlankItem.mockReturnValue({ ...BLANK_ITEM });
  mocks.parseTakeoffFile.mockResolvedValue({ requiresMappingModal: true, headers: [], rawRows: [] });
  mocks.requestAiMapping.mockResolvedValue({
    aiApplied: true,
    items: [{ id: 'ai-1', system: 'Water', description: 'PVC', quantity: 10, unit: 'LF' }],
    itemCount: 1,
    confidence: 0.9,
    usage: STARTER_USAGE,
    columns: [],
  });
});

afterEach(() => {
  cleanup();
});

describe('Step 1 import method chooser', () => {
  it('offers the parser, the AI import and manual entry, with the parser selected by default', () => {
    renderUploadStep();

    const parser = screen.getByRole('button', { name: /Upload spreadsheet/ });
    const ai = screen.getByRole('button', { name: /Import with AI/ });
    const manual = screen.getByRole('button', { name: /Enter manually/ });

    expect(parser.getAttribute('aria-pressed')).toBe('true');
    expect(ai.getAttribute('aria-pressed')).toBe('false');
    expect(manual.getAttribute('aria-pressed')).toBe('false');
  });

  it('starts a blank grid when manual entry is chosen', () => {
    const { onItemsParsed } = renderUploadStep();

    fireEvent.click(screen.getByRole('button', { name: /Enter manually/ }));
    fireEvent.click(screen.getByRole('button', { name: /Start with a blank grid/ }));

    expect(mocks.createBlankItem).toHaveBeenCalledTimes(1);
    expect(onItemsParsed).toHaveBeenCalledTimes(1);
    const [items, options] = onItemsParsed.mock.calls[0];
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('blank-1');
    expect(options).toEqual({});
  });

  it('opens the mapping modal with the AI already running when the AI import is chosen', async () => {
    renderUploadStep();

    fireEvent.click(screen.getByRole('button', { name: /Import with AI/ }));
    chooseFile(fileInput());

    await waitFor(() => expect(mocks.parseTakeoffFile).toHaveBeenCalledTimes(1));

    const modal = await screen.findByTestId('mapping-modal');
    expect(modal.getAttribute('data-autorun')).toBe('true');
    // The deterministic parse is only there for the preview; the modal runs the assist.
    expect(mocks.requestAiMapping).not.toHaveBeenCalled();
  });

  it('hands a failed AI-mode parse straight to the assist instead of asking again', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.parseTakeoffFile.mockRejectedValue(new Error('No table found'));
    const { onItemsParsed } = renderUploadStep();

    fireEvent.click(screen.getByRole('button', { name: /Import with AI/ }));
    chooseFile(fileInput());

    await waitFor(() => expect(mocks.requestAiMapping).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onItemsParsed).toHaveBeenCalledTimes(1));
    expect(onItemsParsed.mock.calls[0][0][0].id).toBe('ai-1');
    errorSpy.mockRestore();
  });

  it('keeps the parser path unchanged when a file is uploaded', async () => {
    mocks.parseTakeoffFile.mockResolvedValue({
      requiresMappingModal: false,
      items: [{ id: 'item-1', system: 'Water', description: 'PVC', quantity: 10, unit: 'LF' }],
      errors: [],
      columns: [],
    });
    const { onItemsParsed } = renderUploadStep();

    chooseFile(fileInput());

    await waitFor(() => expect(onItemsParsed).toHaveBeenCalledTimes(1));
    expect(onItemsParsed.mock.calls[0][0][0].id).toBe('item-1');
    expect(screen.queryByTestId('mapping-modal')).toBeNull();
  });

  it('disables the AI option with the reason when the plan does not include it', async () => {
    mocks.getAiAssistUsage.mockResolvedValue({
      enabled: true,
      model: 'test',
      usage: { ...STARTER_USAGE, used: 0, max: 0, remaining: 0 },
    });
    renderUploadStep();

    await waitFor(() => {
      const ai = screen.getByRole('button', { name: /Import with AI/ }) as HTMLButtonElement;
      expect(ai.disabled).toBe(true);
      expect(ai.getAttribute('title')).toBe(
        'AI column mapping is available on the Starter, Pro and Enterprise plans.',
      );
    });
  });

  it('disables the AI option once the monthly allowance is spent', async () => {
    mocks.getAiAssistUsage.mockResolvedValue({
      enabled: true,
      model: 'test',
      usage: { ...STARTER_USAGE, used: 30, remaining: 0 },
    });
    renderUploadStep();

    await waitFor(() => {
      const ai = screen.getByRole('button', { name: /Import with AI/ }) as HTMLButtonElement;
      expect(ai.disabled).toBe(true);
      expect(ai.getAttribute('title')).toBe('You have used all 30 AI mapping assists for this month.');
    });
  });

  it('disables the AI option when the deployment has no AI configured', async () => {
    mocks.getAiAssistUsage.mockResolvedValue({ enabled: false, model: 'test', usage: STARTER_USAGE });
    renderUploadStep();

    await waitFor(() => {
      const ai = screen.getByRole('button', { name: /Import with AI/ }) as HTMLButtonElement;
      expect(ai.disabled).toBe(true);
      expect(ai.getAttribute('title')).toBe('AI remapping is not enabled on this deployment.');
    });
  });

  it('shows the remaining AI allowance next to the option', async () => {
    renderUploadStep();

    await waitFor(() => expect(screen.getByText('29 of 30 AI imports left this month')).toBeTruthy());
  });
});


