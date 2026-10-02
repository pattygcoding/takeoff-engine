import React from 'react';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentKeyFigures,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.riskContingency';
const ACCENT = '#e11d48';
const TH = 'py-2 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-600';

/**
 * 15. Risk & Contingency Matrix Layout
 */
export default function RiskContingencyMatrixDocument({ estimate, branding, currentProject, rates }) {
  const { totals = {}, bySystem = [] } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;

  const isFixed = totals.contingencyType === 'fixed';
  const contingencyPct = rates?.contingencyPct ?? rates?.contingencyPercent ?? totals.contingencyPct ?? 5;

  const rows = bySystem.map((sys, idx) => ({
    sys,
    isHigh: idx === 0,
    reserve: isFixed
      ? (totals.directCost > 0 ? (sys.directCost / totals.directCost) * totals.contingencyCost : 0)
      : sys.directCost * ((contingencyPct || 5) / 100),
  }));
  const highCount = rows.filter((r) => r.isHigh).length;

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead
        branding={branding}
        title={t(`${KEY}.title`)}
        project={currentProject}
        accent={accent}
        badge={t('product.templates.header.internalBadge')}
      />

      <DocumentKeyFigures
        accent={accent}
        figures={[
          { label: t(`${KEY}.colBaseDirect`), value: formatCurrency(totals.totalDirectCost) },
          {
            label: t(`${KEY}.contingencyRate`),
            value: isFixed ? t(`${KEY}.fixedAmount`) : `${formatNumber(Number(contingencyPct) || 0, 1)}%`,
          },
          { label: t(`${KEY}.highRiskSystems`), value: `${highCount} / ${rows.length}` },
        ]}
        highlight={{ label: t(`${KEY}.totalReserves`), value: formatCurrency(totals.contingencyCost) }}
      />

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.detailHeading`)}</DocumentSectionHeading>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-slate-400 italic">{t('product.templates.shared.noItems')}</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100">
                <th className={TH}>{t(`${KEY}.colSystem`)}</th>
                <th className={TH}>{t(`${KEY}.colSubsurfaceProfile`)}</th>
                <th className={`${TH} text-center`}>{t(`${KEY}.colRiskLevel`)}</th>
                <th className={`${TH} text-right`}>{t(`${KEY}.colBaseDirect`)}</th>
                <th className={`${TH} text-right`}>
                  {isFixed
                    ? t(`${KEY}.colContingencyBufferFixed`)
                    : t(`${KEY}.colContingencyBuffer`, { percent: contingencyPct })}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ sys, isHigh, reserve }) => (
                <tr key={sys.system} className="border-b border-slate-100 even:bg-slate-50/70 break-inside-avoid">
                  <td className="py-2 px-2 font-bold uppercase tracking-wide text-[10px]" style={{ color: accent }}>
                    {sys.system}
                  </td>
                  <td className="py-2 px-2 text-slate-600">
                    {isHigh ? t(`${KEY}.highRiskText`) : t(`${KEY}.moderateRiskText`)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 border rounded-sm text-[9px] font-bold tracking-widest ${
                        isHigh ? 'border-rose-300 text-rose-700' : 'border-emerald-300 text-emerald-700'
                      }`}
                    >
                      {isHigh ? t(`${KEY}.riskHigh`) : t(`${KEY}.riskModerate`)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">{formatCurrency(sys.directCost)}</td>
                  <td className="py-2 px-2 text-right font-semibold text-slate-900">{formatCurrency(reserve)}</td>
                </tr>
              ))}
              <tr className="text-white font-bold" style={{ backgroundColor: accent }}>
                <td colSpan={3} className="py-2 px-2 text-[11px] uppercase tracking-wider">{t(`${KEY}.totalAllocatedReserves`)}</td>
                <td className="py-2 px-2 text-right">{formatCurrency(totals.totalDirectCost)}</td>
                <td className="py-2 px-2 text-right text-sm">{formatCurrency(totals.contingencyCost)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      <p className="mt-6 pl-3 border-l-2 italic text-slate-500 break-inside-avoid" style={{ borderColor: accent }}>
        {t(`${KEY}.methodNote`)}
      </p>

      <DocumentSignatureBlock
        accent={accent}
        heading={t('product.templates.signOff.internalReview')}
        parties={[{ title: t('product.templates.signOff.preparedBy') }, { title: t('product.templates.signOff.reviewedBy') }]}
      />

      <DocumentFooter confidential />
    </div>
  );
}
