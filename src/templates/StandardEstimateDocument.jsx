import React from 'react';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/core/components/context/I18nContext';
import ScopeSummaryDisplay from '@/product/components/ScopeSummaryDisplay';

/**
 * 1. Internal Cost Estimate Document Layout
 */
export default function StandardEstimateDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem, rates } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.standardEstimate.title')} project={currentProject} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">{t('templates.standardEstimate.totalDirect')}</span>
          <p className="text-base font-bold text-slate-900">{formatCurrency(totals.totalDirectCost)}</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">{t('templates.standardEstimate.laborHours')}</span>
          <p className="text-base font-bold text-slate-900">
            {t('templates.standardEstimate.laborHoursUnit', { hours: formatNumber(totals.totalLaborHours) })}
          </p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">{t('templates.standardEstimate.markupAndCont')}</span>
          <p className="text-base font-bold text-slate-900">
            {formatCurrency(totals.overheadCost + totals.profitAmount + totals.contingencyCost)}
          </p>
        </div>
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-indigo-500">{t('templates.standardEstimate.totalBidAmount')}</span>
          <p className="text-base font-bold text-indigo-700">{formatCurrency(totals.finalBidAmount)}</p>
        </div>
      </div>

      <div className="space-y-5">
        {bySystem.map((sys) => (
          <div key={sys.system} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{sys.system}</h3>
              <span className="text-xs font-bold text-slate-900">{formatCurrency(sys.directCost)}</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">{t('templates.standardEstimate.colDescription')}</th>
                  <th className="p-2.5">{t('templates.standardEstimate.colSpec')}</th>
                  <th className="p-2.5 text-right">{t('templates.standardEstimate.colQty')}</th>
                  <th className="p-2.5">{t('templates.standardEstimate.colUnit')}</th>
                  <th className="p-2.5 text-right">{t('templates.standardEstimate.colMaterial')}</th>
                  <th className="p-2.5 text-right">{t('templates.standardEstimate.colLaborHrs')}</th>
                  <th className="p-2.5 text-right">{t('templates.standardEstimate.colLaborCost')}</th>
                  <th className="p-2.5 text-right">{t('templates.standardEstimate.colLineTotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sys.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{it.description}</td>
                    <td className="p-2.5 text-slate-500">{it.sizeSpec}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.quantity, 0)}</td>
                    <td className="p-2.5 text-slate-500">{it.unit}</td>
                    <td className="p-2.5 text-right font-mono">{formatCurrency(it.materialCost)}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.laborHours)}</td>
                    <td className="p-2.5 text-right font-mono">{formatCurrency(it.laborCost)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.directCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <ScopeSummaryDisplay scopeItems={rates?.scopeItems} forceLight />

      <DocumentSignOff branding={branding} />
    </div>
  );
}
