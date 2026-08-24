import React from 'react';
import { formatCurrency } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';

/**
 * 15. Risk & Contingency Matrix Layout
 */
export default function RiskContingencyMatrixDocument({ estimate, branding, currentProject, rates }) {
  const { totals, bySystem } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.riskContingency.title')} project={currentProject} />

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-rose-950 text-white">
            <tr>
              <th className="p-2.5">{t('templates.riskContingency.colSystem')}</th>
              <th className="p-2.5">{t('templates.riskContingency.colSubsurfaceProfile')}</th>
              <th className="p-2.5 text-center">{t('templates.riskContingency.colRiskLevel')}</th>
              <th className="p-2.5 text-right">{t('templates.riskContingency.colBaseDirect')}</th>
              <th className="p-2.5 text-right">
                {totals.contingencyType === 'fixed'
                  ? t('templates.riskContingency.colContingencyBufferFixed')
                  : t('templates.riskContingency.colContingencyBuffer', { percent: rates?.contingencyPct ?? rates?.contingencyPercent ?? totals.contingencyPct ?? 5 })}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.map((sys, idx) => {
              const cont = totals.contingencyType === 'fixed'
                ? (totals.directCost > 0 ? (sys.directCost / totals.directCost) * totals.contingencyCost : 0)
                : sys.directCost * (((rates?.contingencyPct ?? rates?.contingencyPercent ?? totals.contingencyPct) || 5) / 100);
              const isHigh = idx === 0;
              return (
                <tr key={sys.system} className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-bold text-slate-900">{sys.system}</td>
                  <td className="p-2.5 font-sans text-slate-600">
                    {isHigh ? t('templates.riskContingency.highRiskText') : t('templates.riskContingency.moderateRiskText')}
                  </td>
                  <td className="p-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${isHigh ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {isHigh ? t('templates.riskContingency.riskHigh') : t('templates.riskContingency.riskModerate')}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">{formatCurrency(sys.directCost)}</td>
                  <td className="p-2.5 text-right font-bold text-rose-900">{formatCurrency(cont)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={3} className="p-2.5 font-sans text-slate-700">{t('templates.riskContingency.totalAllocatedReserves')}</td>
              <td className="p-2.5 text-right font-mono">{formatCurrency(totals.totalDirectCost)}</td>
              <td className="p-2.5 text-right font-mono text-rose-900">{formatCurrency(totals.contingencyCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
