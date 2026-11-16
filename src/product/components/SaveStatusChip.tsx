import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useTranslation } from '@/core/components/context/I18nContext';
import type { ProjectAutosave } from '@/product/lib/useProjectAutosave';

/** Local wall-clock time for the "Saved 12:04" chip. */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Draft save state for Step 2 and Step 3.
 *
 * The autosave is silent by design, so this chip is the only signal that the draft actually reached
 * the cloud. A failure is clickable: it retries immediately instead of waiting for the next edit.
 */
export default function SaveStatusChip({
  state,
  onRetry,
}: Readonly<{
  state: ProjectAutosave;
  onRetry?: () => void;
}>) {
  const { t } = useTranslation();
  if (state.status === 'idle') return null;

  const base =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold';

  if (state.status === 'saving') {
    return (
      <span
        role="status"
        className={`${base} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {t('product.projectWorkspace.savingDraft', 'Saving…')}
      </span>
    );
  }

  if (state.status === 'saved') {
    return (
      <span
        role="status"
        className={`${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300`}
      >
        <Check className="h-3 w-3" aria-hidden="true" />
        {t('product.projectWorkspace.draftSaved', {
          time: state.savedAt ? formatTime(state.savedAt) : '',
        })}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onRetry ?? (() => void state.flush())}
      title={state.error ?? undefined}
      className={`${base} cursor-pointer bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300`}
    >
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      {t('product.projectWorkspace.draftSaveFailed', "Couldn't save — retry")}
    </button>
  );
}
