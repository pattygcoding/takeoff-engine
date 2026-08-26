import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/product/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';

/**
 * 10. Subcontractor Scope Submittal Layout
 */
export default function SubcontractorScopeDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.subcontractorScope.title')} project={currentProject} />

      <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 space-y-2">
        <h4 className="font-bold uppercase tracking-wider text-teal-950">
          {t('templates.subcontractorScope.inclusionsTitle')}
        </h4>
        <p className="leading-relaxed">
          {t('templates.subcontractorScope.inclusionsDesc')}
        </p>
      </div>

      <div className="space-y-4">
        {bySystem.map((sys) => (
          <div key={sys.system} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-teal-900 text-white px-3.5 py-2 flex justify-between items-center text-xs">
              <span className="font-bold uppercase">
                {t('templates.subcontractorScope.packageTitle', { system: sys.system })}
              </span>
              <span className="font-mono">
                {t('templates.subcontractorScope.scopeItemsCount', { count: sys.items.length })}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">{t('templates.subcontractorScope.colScopeDescription')}</th>
                  <th className="p-2.5">{t('templates.subcontractorScope.colSpecAstm')}</th>
                  <th className="p-2.5 text-right">{t('templates.subcontractorScope.colTakeoffQty')}</th>
                  <th className="p-2.5">{t('templates.subcontractorScope.colUnit')}</th>
                  <th className="p-2.5 text-right">{t('templates.subcontractorScope.colTargetSubtotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sys.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{it.description}</td>
                    <td className="p-2.5 text-slate-500">{it.sizeSpec}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.quantity, 0)}</td>
                    <td className="p-2.5 text-slate-500">{it.unit}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(it.directCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
