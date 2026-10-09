import React from 'react';
import type { DocumentTemplateProps } from '@/types/models';
import type { DocumentColumn } from './DocumentHeaderSignoff';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import ScopeSummaryDisplay from '@/product/components/ScopeSummaryDisplay';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentKeyFigures,
  DocumentSystemTable,
  DocumentCostSummary,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.standardEstimate';
const ACCENT = '#3b82f6';

/**
 * 1. Internal Cost Estimate Document Layout
 */
export default function StandardEstimateDocument({ estimate, branding, currentProject }: DocumentTemplateProps) {
  const { totals = {}, bySystem = [], rates } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;
  const markupTotal = (totals.overheadAmount || 0) + (totals.contingencyAmount || 0) + (totals.profitAmount || 0);

  const columns: DocumentColumn[] = [
    { header: t(`${KEY}.colDescription`), render: (it) => it.description },
    { header: t(`${KEY}.colSpec`), muted: true, render: (it) => it.sizeSpec },
    { header: t(`${KEY}.colQty`), align: 'right', render: (it) => formatNumber(it.quantity, 0) },
    { header: t(`${KEY}.colUnit`), muted: true, render: (it) => it.unit },
    { header: t(`${KEY}.colMaterial`), align: 'right', render: (it) => formatCurrency(it.materialCost) },
    { header: t(`${KEY}.colLaborHrs`), align: 'right', render: (it) => formatNumber(it.laborHours) },
    { header: t(`${KEY}.colLaborCost`), align: 'right', render: (it) => formatCurrency(it.laborCost) },
    { header: t(`${KEY}.colLineTotal`), align: 'right', strong: true, render: (it) => formatCurrency(it.directCost) },
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
          { label: t(`${KEY}.totalDirect`), value: formatCurrency(totals.totalDirectCost) },
          { label: t(`${KEY}.laborHours`), value: t(`${KEY}.laborHoursUnit`, { hours: formatNumber(totals.totalLaborHours) }) },
          { label: t(`${KEY}.markupAndCont`), value: formatCurrency(markupTotal) },
        ]}
        highlight={{ label: t(`${KEY}.totalBidAmount`), value: formatCurrency(totals.finalBidAmount) }}
      />

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.detailHeading`)}</DocumentSectionHeading>
        <DocumentSystemTable
          bySystem={bySystem}
          columns={columns}
          accent={accent}
          subtotal={(sys) => formatCurrency(sys.directCost)}
        />
      </section>

      <DocumentCostSummary totals={totals} accent={accent} />

      <div className="break-inside-avoid">
        <ScopeSummaryDisplay scopeItems={rates?.scopeItems} baseAmount={totals.totalDirectCost} forceLight className="mt-8" />
      </div>

      <DocumentSignatureBlock
        accent={accent}
        heading={t('product.templates.signOff.internalReview')}
        parties={[{ title: t('product.templates.signOff.preparedBy') }, { title: t('product.templates.signOff.reviewedBy') }]}
      />

      <DocumentFooter confidential />
    </div>
  );
}
