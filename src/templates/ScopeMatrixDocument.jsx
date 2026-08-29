import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/product/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';
import ScopeSummaryDisplay from '@/components/product/ScopeSummaryDisplay';

/**
 * 7. Commercial Scope & Spec Matrix Document Layout
 */
export default function ScopeMatrixDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem, rates } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.scopeMatrix.title')} project={currentProject} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bySystem.map((sys) => (
          <div key={sys.system} className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">{sys.system}</h4>
              <span className="text-xs font-bold text-indigo-600 font-mono">{formatCurrency(sys.factoredBid ?? sys.directCost)}</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-600">
              {sys.items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>• {it.description} ({it.sizeSpec})</span>
                  <span className="font-mono text-slate-900">{formatNumber(it.quantity, 0)} {it.unit}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider">{t('templates.scopeMatrix.totalCombinedBid')}</span>
        <span className="text-lg font-bold font-mono text-emerald-400">{formatCurrency(totals.finalBidAmount)}</span>
      </div>

      <ScopeSummaryDisplay scopeItems={rates?.scopeItems} forceLight />

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
