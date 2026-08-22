import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';

/**
 * 4. Itemized Job-Cost Ledger Document Layout
 */
export default function ItemizedLedgerDocument({ estimate, branding, currentProject, rates }) {
  const { totals, bySystem } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.itemizedLedger.title')} project={currentProject} />

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-2">{t('templates.itemizedLedger.colItem')}</th>
              <th className="p-2">{t('templates.itemizedLedger.colSpec')}</th>
              <th className="p-2 text-right">{t('templates.itemizedLedger.colQty')}</th>
              <th className="p-2">{t('templates.itemizedLedger.colUnit')}</th>
              <th className="p-2 text-right">{t('templates.itemizedLedger.colMat')}</th>
              <th className="p-2 text-right">{t('templates.itemizedLedger.colHrs')}</th>
              <th className="p-2 text-right">{t('templates.itemizedLedger.colLabor')}</th>
              <th className="p-2 text-right">{t('templates.itemizedLedger.colEquip')}</th>
              <th className="p-2 text-right">{t('templates.itemizedLedger.colTotal')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.flatMap((s) => s.items).map((it, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="p-2 font-sans font-medium text-slate-900">{it.description}</td>
                <td className="p-2 font-sans text-slate-500">{it.sizeSpec}</td>
                <td className="p-2 text-right">{formatNumber(it.quantity, 0)}</td>
                <td className="p-2 font-sans text-slate-500">{it.unit}</td>
                <td className="p-2 text-right">{formatCurrency(it.materialCost)}</td>
                <td className="p-2 text-right">{formatNumber(it.laborHours)}</td>
                <td className="p-2 text-right">{formatCurrency(it.laborCost)}</td>
                <td className="p-2 text-right">{formatCurrency((rates?.excavatorHourlyRate || 0) * (it.laborHours * 0.4))}</td>
                <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(it.directCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">
            {t('templates.itemizedLedger.overheadLabel', { percent: rates?.overheadPercent || 10 })}
          </span>
          <p className="font-bold text-slate-900">{formatCurrency(totals.overheadCost)}</p>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">
            {t('templates.itemizedLedger.profitMarginLabel', { percent: rates?.profitMarginPercent || 15 })}
          </span>
          <p className="font-bold text-slate-900">{formatCurrency(totals.profitAmount)}</p>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">
            {t('templates.itemizedLedger.contingencyLabel', { percent: rates?.contingencyPercent || 5 })}
          </span>
          <p className="font-bold text-slate-900">{formatCurrency(totals.contingencyCost)}</p>
        </div>
        <div>
          <span className="text-indigo-600 font-bold uppercase text-[10px]">
            {t('templates.itemizedLedger.finalBidAmount')}
          </span>
          <p className="font-bold text-indigo-700 text-sm">{formatCurrency(totals.finalBidAmount)}</p>
        </div>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
