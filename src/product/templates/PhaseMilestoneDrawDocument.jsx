import React from 'react';
import { formatCurrency } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.phaseMilestoneDraw';
const ACCENT = '#6d28d9';
const TH = 'py-2 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-600';

/**
 * 14. Phase Milestone Draw Schedule Layout
 */
export default function PhaseMilestoneDrawDocument({ estimate, branding, currentProject }) {
  const { totals = {} } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;
  const contractValue = totals.finalBidAmount || 0;

  const milestones = [
    { name: t(`${KEY}.m1Name`), pct: 0.15, desc: t(`${KEY}.m1Desc`) },
    { name: t(`${KEY}.m2Name`), pct: 0.35, desc: t(`${KEY}.m2Desc`) },
    { name: t(`${KEY}.m3Name`), pct: 0.30, desc: t(`${KEY}.m3Desc`) },
    { name: t(`${KEY}.m4Name`), pct: 0.20, desc: t(`${KEY}.m4Desc`) },
  ];

  let cumulative = 0;

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead branding={branding} title={t(`${KEY}.title`)} project={currentProject} accent={accent} />

      <section className="mt-6 grid grid-cols-3 border border-slate-300 break-inside-avoid">
        <div className="col-span-2 px-4 py-3 bg-slate-50 border-r border-slate-300">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{t(`${KEY}.introHeading`)}</p>
          <p className="mt-1 text-slate-600">{t(`${KEY}.introText`)}</p>
        </div>
        <div className="px-4 py-3 flex flex-col justify-center text-white" style={{ backgroundColor: accent }}>
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{t(`${KEY}.contractValue`)}</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(contractValue)}</p>
        </div>
      </section>

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.scheduleHeading`)}</DocumentSectionHeading>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-y border-slate-300 bg-slate-100">
              <th className={`${TH} w-12`}>{t(`${KEY}.colDrawNum`)}</th>
              <th className={TH}>{t(`${KEY}.colMilestone`)}</th>
              <th className={TH}>{t(`${KEY}.colVerification`)}</th>
              <th className={`${TH} text-right`}>{t(`${KEY}.colPercentDraw`)}</th>
              <th className={`${TH} text-right`}>{t(`${KEY}.colCumulative`)}</th>
              <th className={`${TH} text-right`}>{t(`${KEY}.colPaymentAmount`)}</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m, idx) => {
              cumulative += m.pct;
              return (
                <tr key={idx} className="border-b border-slate-100 even:bg-slate-50/70 break-inside-avoid">
                  <td className="py-2 px-2 font-bold" style={{ color: accent }}>{String(idx + 1).padStart(2, '0')}</td>
                  <td className="py-2 px-2 font-semibold text-slate-900">{m.name}</td>
                  <td className="py-2 px-2 text-slate-600">{m.desc}</td>
                  <td className="py-2 px-2 text-right font-semibold">{(m.pct * 100).toFixed(0)}%</td>
                  <td className="py-2 px-2 text-right text-slate-500">{(cumulative * 100).toFixed(0)}%</td>
                  <td className="py-2 px-2 text-right font-semibold text-slate-900">{formatCurrency(contractValue * m.pct)}</td>
                </tr>
              );
            })}
            <tr className="text-white font-bold" style={{ backgroundColor: accent }}>
              <td colSpan={3} className="py-2 px-2 text-[11px] uppercase tracking-wider">{t(`${KEY}.totalContractDraws`)}</td>
              <td className="py-2 px-2 text-right">100%</td>
              <td className="py-2 px-2 text-right">100%</td>
              <td className="py-2 px-2 text-right text-sm">{formatCurrency(contractValue)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <DocumentSignatureBlock
        accent={accent}
        heading={t('product.templates.signOff.acceptanceHeading')}
        intro={t(`${KEY}.acceptanceText`)}
        showPrintedName
        parties={[
          { title: t('product.templates.signOff.submittedByContractor'), subtitle: branding?.companyName },
          { title: t('product.templates.signOff.acceptedByClient'), subtitle: currentProject?.client_name },
        ]}
      />

      <DocumentFooter />
    </div>
  );
}
