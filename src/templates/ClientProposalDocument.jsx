import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/product/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';
import ScopeSummaryDisplay from '@/product/components/ScopeSummaryDisplay';

/**
 * 2. Standard Client Proposal Document Layout
 */
export default function ClientProposalDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem, rates } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.clientProposal.title')} project={currentProject} />

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
        {t('templates.clientProposal.proposalIntro')}
      </div>

      {/* Scope Inclusions & Exclusions */}
      <ScopeSummaryDisplay scopeItems={rates?.scopeItems} forceLight />

      <div className="space-y-4">
        {bySystem.map((sys) => (
          <div key={sys.system} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider">
                {t('templates.clientProposal.scopeHeader', { system: sys.system })}
              </h3>
              <span className="text-xs font-bold font-mono">{formatCurrency(sys.factoredBid ?? sys.directCost)}</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">{t('templates.clientProposal.colDescription')}</th>
                  <th className="p-2.5">{t('templates.clientProposal.colSpec')}</th>
                  <th className="p-2.5 text-right">{t('templates.clientProposal.colPlanQty')}</th>
                  <th className="p-2.5">{t('templates.clientProposal.colUnit')}</th>
                  <th className="p-2.5 text-right">{t('templates.clientProposal.colExtendedPrice')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sys.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{it.description}</td>
                    <td className="p-2.5 text-slate-500">{it.sizeSpec}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.quantity, 0)}</td>
                    <td className="p-2.5 text-slate-500">{it.unit}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.factoredPrice ?? it.directCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <div className="w-full sm:w-80 bg-slate-900 text-white rounded-2xl p-4">
          <div className="flex justify-between text-xs text-slate-300 pb-1.5 border-b border-slate-800">
            <span>{t('templates.clientProposal.totalBaseBid')}</span>
            <span>{formatCurrency(totals.finalBidAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-white pt-2">
            <span>{t('templates.clientProposal.totalLumpSum')}</span>
            <span className="text-emerald-400">{formatCurrency(totals.finalBidAmount)}</span>
          </div>
        </div>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
