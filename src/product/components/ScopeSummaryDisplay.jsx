import { categorizeScope, DEFAULT_SCOPE_ITEMS, formatScopeAddonImpact } from '@/product/lib/scope';
import { useTranslation } from '@/core/components/context/I18nContext';

// Drops dark: variants so printable/exported PDF documents always render light, regardless of the app's theme.
function lightSafe(classString, forceLight) {
  if (!forceLight) return classString;
  return classString
    .split(' ')
    .filter((cls) => !cls.startsWith('dark:'))
    .join(' ');
}

// Read-only, print-friendly presentation of a project's scope inclusions/exclusions.
// Shared between the internal results page, client-facing proposal preview, the public client portal, and PDF/document exports.
export default function ScopeSummaryDisplay({ scopeItems, className = '', forceLight = false }) {
  const { t } = useTranslation();

  // Projects that never opened the scope panel still carry the standard default trade boundaries.
  const resolvedItems = Array.isArray(scopeItems) && scopeItems.length > 0 ? scopeItems : DEFAULT_SCOPE_ITEMS;

  const { included, excluded, optionalAddons } = categorizeScope(resolvedItems);
  if (included.length === 0 && excluded.length === 0 && optionalAddons.length === 0) {
    return null;
  }

  return (
    <div className={lightSafe(`pt-6 border-t border-slate-200 dark:border-slate-800 ${className}`, forceLight)}>
      <h3 className={lightSafe('text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-3 flex items-center gap-2', forceLight)}>
        <span>⚖️</span> {t('product.scopeSummary.title', 'Scope of Work: Inclusions & Exclusions')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ScopeColumn
          heading={t('product.scopeSummary.includedHeader', 'Included by Contractor')}
          icon="✓"
          items={included}
          colorClasses="bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100"
          headingClasses="text-emerald-900 dark:text-emerald-200"
          bulletClasses="text-emerald-600 dark:text-emerald-400"
          forceLight={forceLight}
        />
        <ScopeColumn
          heading={t('product.scopeSummary.excludedHeader', 'Excluded (By Owner / Others)')}
          icon="✕"
          items={excluded}
          colorClasses="bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-100"
          headingClasses="text-rose-900 dark:text-rose-200"
          bulletClasses="text-rose-600 dark:text-rose-400"
          forceLight={forceLight}
        />
        <ScopeColumn
          heading={t('product.scopeSummary.addonsHeader', 'Optional Add-Ons / Alternates')}
          icon="+"
          items={optionalAddons}
          colorClasses="bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-100"
          headingClasses="text-indigo-900 dark:text-indigo-200"
          bulletClasses="text-indigo-600 dark:text-indigo-400"
          showImpactBadge
          forceLight={forceLight}
        />
      </div>
    </div>
  );
}

function ScopeColumn({ heading, icon, items, colorClasses, headingClasses, bulletClasses, showImpactBadge = false, forceLight = false }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={lightSafe(`rounded-2xl p-4 border ${colorClasses}`, forceLight)}>
      <h4 className={lightSafe(`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${headingClasses}`, forceLight)}>
        <span>{icon}</span> {heading} ({items.length})
      </h4>
      <ul className="text-xs space-y-1.5">
        {items.map((item) => {
          const addonImpact = showImpactBadge ? formatScopeAddonImpact(item) : null;
          return (
            <li key={item.id} className="flex items-start justify-between gap-2">
              <span className="flex items-start gap-1.5 min-w-0">
                <span className={lightSafe(`font-bold ${bulletClasses}`, forceLight)}>•</span>
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
