import React from 'react';
import { formatCurrency } from '@/product/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';

/**
 * 14. Phase Milestone Draw Schedule Layout
 */
export default function PhaseMilestoneDrawDocument({ estimate, branding, currentProject }) {
  const { totals } = estimate;
  const { t } = useTranslation();

  const milestones = [
    { name: t('templates.phaseMilestoneDraw.m1Name'), pct: 0.15, desc: t('templates.phaseMilestoneDraw.m1Desc') },
    { name: t('templates.phaseMilestoneDraw.m2Name'), pct: 0.35, desc: t('templates.phaseMilestoneDraw.m2Desc') },
    { name: t('templates.phaseMilestoneDraw.m3Name'), pct: 0.30, desc: t('templates.phaseMilestoneDraw.m3Desc') },
    { name: t('templates.phaseMilestoneDraw.m4Name'), pct: 0.20, desc: t('templates.phaseMilestoneDraw.m4Desc') },
  ];

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.phaseMilestoneDraw.title')} project={currentProject} />

      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-violet-900 text-white uppercase text-[10px]">
            <tr>
              <th className="p-3">{t('templates.phaseMilestoneDraw.colDrawNum')}</th>
              <th className="p-3">{t('templates.phaseMilestoneDraw.colMilestone')}</th>
              <th className="p-3">{t('templates.phaseMilestoneDraw.colVerification')}</th>
              <th className="p-3 text-right">{t('templates.phaseMilestoneDraw.colPercentDraw')}</th>
              <th className="p-3 text-right">{t('templates.phaseMilestoneDraw.colPaymentAmount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {milestones.map((m, idx) => {
              const amount = totals.finalBidAmount * m.pct;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-violet-700">0{idx + 1}</td>
                  <td className="p-3 font-bold text-slate-900">{m.name}</td>
                  <td className="p-3 text-slate-600">{m.desc}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">{(m.pct * 100).toFixed(0)}%</td>
                  <td className="p-3 text-right font-mono font-bold text-violet-900">{formatCurrency(amount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={3} className="p-3 text-right text-slate-700">{t('templates.phaseMilestoneDraw.totalContractDraws')}</td>
              <td className="p-3 text-right font-mono">100%</td>
              <td className="p-3 text-right font-mono text-violet-900 text-sm">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
