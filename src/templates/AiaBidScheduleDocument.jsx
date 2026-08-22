import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';

/**
 * 5. AIA Unit Price Bid Schedule Document Layout
 */
export default function AiaBidScheduleDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.aiaBidSchedule.title')} project={currentProject} />

      <div className="border-2 border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-white font-mono uppercase text-[10px]">
            <tr>
              <th className="p-2.5">{t('templates.aiaBidSchedule.colItemNumber')}</th>
              <th className="p-2.5">{t('templates.aiaBidSchedule.colPayItemDesc')}</th>
              <th className="p-2.5 text-right">{t('templates.aiaBidSchedule.colEstQty')}</th>
              <th className="p-2.5">{t('templates.aiaBidSchedule.colUnit')}</th>
              <th className="p-2.5 text-right">{t('templates.aiaBidSchedule.colUnitPrice')}</th>
              <th className="p-2.5 text-right">{t('templates.aiaBidSchedule.colTotalItemBid')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 font-mono">
            {bySystem.flatMap((s) => s.items).map((it, idx) => {
              const unitPrice = it.quantity > 0 ? (it.factoredPrice ?? it.directCost) / it.quantity : 0;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-600">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="p-2.5 font-sans font-medium text-slate-900">
                    {it.description} <span className="text-slate-500 font-normal">({it.sizeSpec})</span>
                  </td>
                  <td className="p-2.5 text-right">{formatNumber(it.quantity, 0)}</td>
                  <td className="p-2.5 font-sans text-slate-600">{it.unit}</td>
                  <td className="p-2.5 text-right">{formatCurrency(unitPrice)}</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(it.factoredPrice ?? it.directCost)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-xs">
            <tr>
              <td colSpan={5} className="p-3 text-right uppercase tracking-wider font-mono">
                {t('templates.aiaBidSchedule.totalBaseContractBid')}
              </td>
              <td className="p-3 text-right font-mono text-sm text-slate-900">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
