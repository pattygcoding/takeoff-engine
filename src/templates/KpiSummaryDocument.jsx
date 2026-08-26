import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/product/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';

/**
 * 6. Executive KPI & Margin Summary Document Layout
 */
export default function KpiSummaryDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.kpiSummary.title')} project={currentProject} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <span className="text-[10px] font-bold uppercase text-indigo-500">{t('templates.kpiSummary.grossContract')}</span>
          <p className="text-lg font-bold text-indigo-900">{formatCurrency(totals.finalBidAmount)}</p>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <span className="text-[10px] font-bold uppercase text-emerald-600">{t('templates.kpiSummary.netProfitMargin')}</span>
          <p className="text-lg font-bold text-emerald-800">{formatCurrency(totals.profitAmount)}</p>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">{t('templates.kpiSummary.totalLaborHours')}</span>
          <p className="text-lg font-bold text-slate-800">
            {t('templates.kpiSummary.laborHoursUnit', { hours: formatNumber(totals.totalLaborHours) })}
          </p>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <span className="text-[10px] font-bold uppercase text-amber-600">{t('templates.kpiSummary.contingencyBuffer')}</span>
          <p className="text-lg font-bold text-amber-800">{formatCurrency(totals.contingencyCost)}</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('templates.kpiSummary.costWeightBreakdown')}</h4>
        <div className="space-y-2.5">
          {bySystem.map((sys) => {
            const pct = totals.totalDirectCost > 0 ? (sys.directCost / totals.totalDirectCost) * 100 : 0;
            return (
              <div key={sys.system} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">{sys.system}</span>
                  <span className="font-mono text-slate-500">
                    {formatCurrency(sys.directCost)} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
