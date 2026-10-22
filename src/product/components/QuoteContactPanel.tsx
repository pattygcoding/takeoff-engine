import { Building2, Check, X } from 'lucide-react';
import { useTranslation } from '@/core/components/context/I18nContext';
import type { QuoteMetadata } from '@/types/models';
import type { QuoteContactChoice } from './ResultsStep';

/**
 * Asks the estimator what to do when an imported quote carries contractor contact details that
 * differ from the account settings.
 *
 * The quote's values are used for the project by default; the saved settings are only rewritten when
 * the estimator explicitly opts in, so importing a subcontractor's quote cannot silently replace the
 * company address on every other document.
 */
export default function QuoteContactPanel({
  quoteMeta,
  savedAddress = '',
  savedPhone = '',
  choice,
  busy = false,
  onSelect,
  onApplyToAccount,
  onDismiss,
}: Readonly<{
  quoteMeta: QuoteMetadata;
  savedAddress?: string;
  savedPhone?: string;
  choice: QuoteContactChoice;
  busy?: boolean;
  onSelect: (choice: QuoteContactChoice) => void;
  /** Opt-in path: applies the quote's values to the account settings as well. */
  onApplyToAccount: () => void;
  onDismiss: () => void;
}>) {
  const { t } = useTranslation();

  const rows = [
    {
      label: t('product.quoteContact.addressLabel'),
      quoted: quoteMeta.contractorAddress || '—',
      saved: savedAddress || t('product.quoteContact.notSet'),
    },
    {
      label: t('product.quoteContact.phoneLabel'),
      quoted: quoteMeta.contactPhone || '—',
      saved: savedPhone || t('product.quoteContact.notSet'),
    },
  ];

  const optionClass = (active: boolean) =>
    `w-full text-left px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
      active
        ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
    }`;

  return (
    <div className="no-print mb-6 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Building2 className="w-4 h-4 mt-0.5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
              {t('product.quoteContact.title')}
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">{t('product.quoteContact.subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('product.quoteContact.keepSaved')}
          className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl bg-white/70 dark:bg-slate-900/40 border border-amber-200 dark:border-amber-900 p-3">
            <p className="font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide text-[10px] mb-1">
              {row.label}
            </p>
            <p className="text-slate-900 dark:text-slate-100">
              <span className="font-semibold">{t('product.quoteContact.fromQuote')}:</span> {row.quoted}
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              <span className="font-semibold">{t('product.quoteContact.savedInAccount')}:</span> {row.saved}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          className={optionClass(choice === 'project')}
          onClick={() => onSelect('project')}
          aria-pressed={choice === 'project'}
        >
          {choice === 'project' && <Check className="inline w-3 h-3 mr-1" aria-hidden="true" />}
          {t('product.quoteContact.useForProject')}
        </button>
        <button
          type="button"
          className={optionClass(choice === 'account')}
          onClick={onApplyToAccount}
          aria-pressed={choice === 'account'}
          disabled={busy}
        >
          {choice === 'account' && <Check className="inline w-3 h-3 mr-1" aria-hidden="true" />}
          {busy ? t('product.quoteContact.applying') : t('product.quoteContact.alsoUpdateAccount')}
        </button>
        <button
          type="button"
          className={optionClass(choice === 'saved')}
          onClick={() => onSelect('saved')}
          aria-pressed={choice === 'saved'}
        >
          {choice === 'saved' && <Check className="inline w-3 h-3 mr-1" aria-hidden="true" />}
          {t('product.quoteContact.keepSaved')}
        </button>
      </div>
    </div>
  );
}
