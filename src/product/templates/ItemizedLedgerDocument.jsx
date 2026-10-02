import React from 'react';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentKeyFigures,
  DocumentSystemTable,
  DocumentCostSummary,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.itemizedLedger';
const ACCENT = '#d97706';

/**
 * 4. Itemized Job-Cost Ledger Document Layout
 */
export default function ItemizedLedgerDocument({ estimate, branding, currentProject, rates }) {
  const { totals = {}, bySystem = [] } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;

  const equipmentCost = (it) => (rates?.excavatorHourlyRate || 0) * (it.laborHours * 0.4);

  const columns = [
    { header: t(`${KEY}.colItem`), render: (it) => it.description },
    { header: t(`${KEY}.colSpec`), muted: true, render: (it) => it.sizeSpec },
    { header: t(`${KEY}.colQty`), align: 'right', render: (it) => formatNumber(it.quantity, 0) },
    { header: t(`${KEY}.colUnit`), muted: true, render: (it) => it.unit },
    { header: t(`${KEY}.colMat`), align: 'right', render: (it) => formatCurrency(it.materialCost) },
    { header: t(`${KEY}.colHrs`), align: 'right', render: (it) => formatNumber(it.laborHours) },
    { header: t(`${KEY}.colLabor`), align: 'right', render: (it) => formatCurrency(it.laborCost) },
    { header: t(`${KEY}.colEquip`), align: 'right', render: (it) => formatCurrency(equipmentCost(it)) },
    { header: t(`${KEY}.colTotal`), align: 'right', strong: true, render: (it) => formatCurrency(it.directCost) },
  ];

  return (
    <div className="text-slate-800 text-[10px] leading-relaxed tabular-nums">
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
          { label: t(`${KEY}.totalMaterial`), value: formatCurrency(totals.totalMaterialCost) },
          { label: t(`${KEY}.totalLabor`), value: formatCurrency(totals.totalLaborCost) },
          { label: t(`${KEY}.laborHours`), value: t('product.templates.shared.hoursUnit', { hours: formatNumber(totals.totalLaborHours) }) },
        ]}
        highlight={{ label: t(`${KEY}.finalBidAmount`), value: formatCurrency(totals.finalBidAmount) }}
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

      <DocumentSignatureBlock
        accent={accent}
        heading={t('product.templates.signOff.internalReview')}
        parties={[{ title: t('product.templates.signOff.preparedBy') }, { title: t('product.templates.signOff.reviewedBy') }]}
      />

      <DocumentFooter confidential />
    </div>
  );
}
