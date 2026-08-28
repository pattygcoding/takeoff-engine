import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/product/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';
import { categorizeScope } from '@/lib/product/scope';

/**
 * 2. Standard Client Proposal Document Layout
 */
export default function ClientProposalDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem, rates } = estimate;
  const { t } = useTranslation();
  const { included, excluded } = categorizeScope(rates?.scopeItems || []);

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.clientProposal.title')} project={currentProject} />

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
        {t('templates.clientProposal.proposalIntro')}
      </div>

      {/* Scope Inclusions & Exclusions */}
      {(included.length > 0 || excluded.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>✓</span> {t('templates.clientProposal.inclusions', 'Scope Inclusions (Included by Contractor)')}
            </h4>
            <ul className="text-xs text-emerald-950 space-y-1">
              {included.map((item) => (
                <li key={item.id} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>{item.title}</strong>: {item.description}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>✕</span> {t('templates.clientProposal.exclusions', 'Scope Exclusions (By Owner / Others)')}
            </h4>
            <ul className="text-xs text-rose-950 space-y-1">
              {excluded.map((item) => (
                <li key={item.id} className="flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold">•</span>
                  <span><strong>{item.title}</strong>: {item.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

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
