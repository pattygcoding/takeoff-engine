import { categorizeScope, DEFAULT_SCOPE_ITEMS, formatScopeAddonImpact } from '@/lib/product/scope';
import { useTranslation } from '@/context/I18nContext';

// Read-only, print-friendly presentation of a project's scope inclusions/exclusions.
// Shared between the internal results page, client-facing proposal preview, and the public client portal.
export default function ScopeSummaryDisplay({ scopeItems, className = '' }) {
  const { t } = useTranslation();

  // Projects that never opened the scope panel still carry the standard default trade boundaries.
  const resolvedItems = Array.isArray(scopeItems) && scopeItems.length > 0 ? scopeItems : DEFAULT_SCOPE_ITEMS;

  const { included, excluded, optionalAddons } = categorizeScope(resolvedItems);
  if (included.length === 0 && excluded.length === 0 && optionalAddons.length === 0) {
    return null;
  }

  return (
    <div className={`pt-6 border-t border-slate-200 dark:border-slate-800 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-3 flex items-center gap-2">
        <span>⚖️</span> {t('scopeSummary.title', 'Scope of Work: Inclusions & Exclusions')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ScopeColumn
          heading={t('scopeSummary.includedHeader', 'Included by Contractor')}
          icon="✓"
          items={included}
          colorClasses="bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100"
          headingClasses="text-emerald-900 dark:text-emerald-200"
          bulletClasses="text-emerald-600 dark:text-emerald-400"
        />
        <ScopeColumn
          heading={t('scopeSummary.excludedHeader', 'Excluded (By Owner / Others)')}
          icon="✕"
          items={excluded}
          colorClasses="bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-100"
          headingClasses="text-rose-900 dark:text-rose-200"
          bulletClasses="text-rose-600 dark:text-rose-400"
        />
        <ScopeColumn
          heading={t('scopeSummary.addonsHeader', 'Optional Add-Ons / Alternates')}
          icon="+"
          items={optionalAddons}
          colorClasses="bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-100"
          headingClasses="text-indigo-900 dark:text-indigo-200"
          bulletClasses="text-indigo-600 dark:text-indigo-400"
          showImpactBadge
        />
      </div>
    </div>
  );
}

function ScopeColumn({ heading, icon, items, colorClasses, headingClasses, bulletClasses, showImpactBadge = false }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`rounded-2xl p-4 border ${colorClasses}`}>
      <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${headingClasses}`}>
        <span>{icon}</span> {heading} ({items.length})
      </h4>
      <ul className="text-xs space-y-1.5">
        {items.map((item) => {
          const addonImpact = showImpactBadge ? formatScopeAddonImpact(item) : null;
          return (
            <li key={item.id} className="flex items-start justify-between gap-2">
              <span className="flex items-start gap-1.5 min-w-0">
                <span className={`font-bold ${bulletClasses}`}>•</span>
                <span>
                  <strong>{item.title}</strong>
                  {item.description ? `: ${item.description}` : ''}
                </span>
              </span>
              {addonImpact && (
                <span className="shrink-0 font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-md whitespace-nowrap">
                  {addonImpact}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
