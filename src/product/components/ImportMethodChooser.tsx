import { Lock, PenLine, Sparkles, Table2 } from 'lucide-react';
import { useTranslation } from '@/core/components/context/I18nContext';

/** How the user wants to get line items onto the Step 2 grid. */
export type ImportMode = 'parser' | 'ai' | 'manual';

/**
 * Step 1's "how do you want to start?" selector.
 *
 * Before this existed the upload page was one dropzone, so a user could not tell that the AI could
 * map the sheet for them or that the grid accepts hand-typed rows. The three options are now peers:
 * the deterministic parser, the AI-assisted import, and manual entry.
 *
 * The AI option stays visible even when it cannot run (no deployment key, plan excludes it, or the
 * monthly allowance is spent) and is disabled with the reason shown as its description, matching
 * how Step 2's "Remap Using AI" behaves.
 */
export default function ImportMethodChooser({
  mode,
  onChange,
  aiAvailable,
  aiReason,
  aiAllowanceLabel,
}: Readonly<{
  mode: ImportMode;
  onChange: (mode: ImportMode) => void;
  /** False when the deployment has no AI key, the plan excludes it, or the allowance is spent. */
  aiAvailable: boolean;
  /** Why the AI option cannot run; replaces its description so the reason is always readable. */
  aiReason: string | null;
  /** e.g. "4 of 10 AI imports left this month"; null when unlimited or not yet known. */
  aiAllowanceLabel: string | null;
}>) {
  const { t } = useTranslation();

  const cardBase =
    'flex h-full flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition shadow-sm';

  return (
    <div
      role="group"
      aria-label={t('product.uploadStep.chooseMethodLabel', 'How would you like to start?')}
      className="mt-6 grid gap-3 sm:grid-cols-3"
    >
      <button
        type="button"
        aria-pressed={mode === 'parser'}
        onClick={() => onChange('parser')}
        className={`${cardBase} cursor-pointer ${
          mode === 'parser'
            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-950/40'
            : 'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-600'
        }`}
      >
        <span className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Table2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-bold">{t('product.uploadStep.modeParserTitle', 'Upload spreadsheet')}</span>
        </span>
        <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {t(
            'product.uploadStep.modeParserDesc',
            'Automatic column detection with a review step before anything is imported.',
          )}
        </span>
      </button>

      <button
        type="button"
        aria-pressed={mode === 'ai'}
        disabled={!aiAvailable}
        title={aiReason ?? undefined}
        onClick={() => onChange('ai')}
        className={`${cardBase} ${
          aiAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
        } ${
          mode === 'ai'
            ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500 dark:bg-violet-950/40'
            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
        } ${aiAvailable && mode !== 'ai' ? 'hover:border-violet-300 dark:hover:border-violet-600' : ''}`}
      >
        <span className="flex w-full items-center gap-2 text-violet-700 dark:text-violet-300">
          {aiAvailable ? (
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="text-sm font-bold">{t('product.uploadStep.modeAiTitle', 'Import with AI')}</span>
          <span className="ml-auto rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {t('product.uploadStep.modeAiBadge', 'AI')}
          </span>
        </span>
        <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {aiReason ??
            t(
              'product.uploadStep.modeAiDesc',
              'The AI picks the header row and columns. You review before importing.',
            )}
        </span>
        {aiAvailable && aiAllowanceLabel && (
          <span className="font-mono text-[10px] text-violet-700 dark:text-violet-300">{aiAllowanceLabel}</span>
        )}
      </button>

      <button
        type="button"
        aria-pressed={mode === 'manual'}
        onClick={() => onChange('manual')}
        className={`${cardBase} cursor-pointer ${
          mode === 'manual'
            ? 'border-slate-500 bg-slate-100 ring-1 ring-slate-500 dark:bg-slate-800/70'
            : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500'
        }`}
      >
        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <PenLine className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-bold">{t('product.uploadStep.modeManualTitle', 'Enter manually')}</span>
        </span>
        <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {t(
            'product.uploadStep.modeManualDesc',
            'Skip the file and type your line items straight into the grid.',
          )}
        </span>
      </button>
    </div>
  );
}
