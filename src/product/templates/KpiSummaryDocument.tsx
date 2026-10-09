import React from 'react';
import type { DocumentTemplateProps } from '@/types/models';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentKeyFigures,
  DocumentCostSummary,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.kpiSummary';
const ACCENT = '#0891b2';

function pctOf(part: any, whole: any) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

function formatPctText(value: any) {
  return `${formatNumber(value, 1)}%`;
}

/**
 * 6. Executive KPI & Margin Summary Document Layout
 */
export default function KpiSummaryDocument({ estimate, branding, currentProject }: DocumentTemplateProps) {
  const { totals = {}, bySystem = [] } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;

  const direct = totals.totalDirectCost || 0;
  const finalBid = totals.finalBidAmount || 0;

  const ratios = [
    { label: t(`${KEY}.grossMargin`), value: pctOf(finalBid - direct, finalBid) },
    { label: t(`${KEY}.markupOnCost`), value: pctOf(finalBid - direct, direct) },
    { label: t(`${KEY}.materialShare`), value: pctOf(totals.totalMaterialCost, direct) },
    { label: t(`${KEY}.laborShare`), value: pctOf(totals.totalLaborCost, direct) },
  ];

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
          {
            label: t(`${KEY}.netProfitMargin`),
            value: formatCurrency(totals.profitAmount),
            note: formatPctText(totals.profitPct || 0),
          },
          {
            label: t(`${KEY}.contingencyBuffer`),
            value: formatCurrency(totals.contingencyAmount),
            note: formatPctText(totals.contingencyPct || 0),
          },
          {
            label: t(`${KEY}.totalLaborHours`),
            value: t(`${KEY}.laborHoursUnit`, { hours: formatNumber(totals.totalLaborHours) }),
          },
        ]}
        highlight={{ label: t(`${KEY}.grossContract`), value: formatCurrency(finalBid) }}
      />

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.keyRatiosHeading`)}</DocumentSectionHeading>
        <div className="grid grid-cols-4 gap-4 pt-1">
          {ratios.map((r) => (
            <div key={r.label} className="border-l-2 pl-3" style={{ borderColor: accent }}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{r.label}</p>
              <p className="text-base font-bold text-slate-900">{formatPctText(r.value)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.costWeightBreakdown`)}</DocumentSectionHeading>
        {bySystem.length === 0 ? (
          <p className="py-6 text-center text-slate-400 italic">{t('product.templates.shared.noItems')}</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2 px-2">{t(`${KEY}.colSystem`)}</th>
                <th className="py-2 px-2 text-right">{t(`${KEY}.colDirectCost`)}</th>
                <th className="py-2 px-2 text-right">{t(`${KEY}.colShare`)}</th>
                <th className="py-2 px-2 w-[40%]">{t(`${KEY}.colWeight`)}</th>
              </tr>
            </thead>
            <tbody>
              {bySystem.map((sys) => {
                const pct = pctOf(sys.directCost, direct);
                return (
                  <tr key={sys.system} className="border-b border-slate-100 break-inside-avoid">
                    <td className="py-2 px-2 font-medium text-slate-900">{sys.system}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(sys.directCost)}</td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">{formatPctText(pct)}</td>
                    <td className="py-2 px-2">
                      <div className="h-2 w-full bg-slate-100">
                        <div className="h-2" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: accent }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <DocumentCostSummary totals={totals} accent={accent} />

      <DocumentSignatureBlock
        accent={accent}
        heading={t('product.templates.signOff.internalReview')}
        parties={[{ title: t('product.templates.signOff.preparedBy') }, { title: t('product.templates.signOff.reviewedBy') }]}
      />

      <DocumentFooter confidential />
    </div>
  );
}
