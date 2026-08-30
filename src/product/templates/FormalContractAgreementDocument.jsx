import React from 'react';
import { formatCurrency } from '@/product/lib/calculations';
import { DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/core/components/context/I18nContext';
import ScopeSummaryDisplay from '@/product/components/ScopeSummaryDisplay';

/**
 * 13. Owner-Contractor Formal Agreement Layout
 */
export default function FormalContractAgreementDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem, rates } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6 font-serif">
      <div className="text-center border-b-2 border-slate-900 pb-4">
        <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">{t('product.templates.formalContract.title')}</h2>
        <p className="text-xs text-slate-600 font-sans mt-1">{t('product.templates.formalContract.subtitle')}</p>
      </div>

      <div className="space-y-3 text-xs text-slate-800 leading-relaxed font-sans">
        <p>
          {t('product.templates.formalContract.introAgreement', {
            date: new Date().toLocaleDateString(),
            contractor: branding?.companyName || t('product.templates.formalContract.defaultContractor'),
            owner: currentProject?.client_name || t('product.templates.formalContract.defaultOwner'),
            site: currentProject?.location || t('product.templates.formalContract.defaultSite')
          })}
        </p>
        <p>
          <strong>{t('product.templates.formalContract.clause1Title')}</strong> {t('product.templates.formalContract.clause1Text')}
          <span className="font-bold font-mono text-emerald-800">{formatCurrency(totals.finalBidAmount)}</span>.
        </p>
        <p>
          <strong>{t('product.templates.formalContract.clause2Title')}</strong>{' '}
          {t('product.templates.formalContract.clause2Text', {
            systems: bySystem.map((s) => s.system).join(', ')
          })}
        </p>
        <p>
          <strong>{t('product.templates.formalContract.clause3Title')}</strong> {t('product.templates.formalContract.clause3Text')}
        </p>
      </div>

      <div className="border border-slate-300 rounded-xl overflow-hidden font-sans">
        <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
          {t('product.templates.formalContract.phaseSummary')}
        </div>
        <table className="w-full text-left text-xs">
          <tbody className="divide-y divide-slate-200">
            {bySystem.map((s) => (
              <tr key={s.system}>
                <td className="p-2.5 font-bold text-slate-800">{s.system}</td>
                <td className="p-2.5 text-slate-500">
                  {t('product.templates.formalContract.workItemsCount', { count: s.items.length })}
                </td>
                <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(s.factoredBid ?? s.directCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={2} className="p-2.5 text-slate-700 uppercase tracking-wider text-[11px]">
                {t('product.templates.formalContract.totalLumpSumContract')}
              </td>
              <td className="p-2.5 text-right font-mono text-emerald-800 text-sm">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ScopeSummaryDisplay scopeItems={rates?.scopeItems} forceLight />

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
