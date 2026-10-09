import React from 'react';
import type { DocumentTemplateProps } from '@/types/models';
import type { DocumentColumn } from './DocumentHeaderSignoff';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentKeyFigures,
  DocumentSystemTable,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.trenchEarthwork';
const ACCENT = '#b45309';
const TRENCH_WIDTH_FT = 3.0;
const TRENCH_DEPTH_FT = 6.0;
const NON_LINEAR_LF_PER_UNIT = 10;
const BEDDING_RATIO = 0.35;
const STONE_TONS_PER_CY = 1.4;
const HAUL_RATIO = 0.65;

function earthwork(it: any) {
  const unit = it.unit?.toLowerCase() || '';
  const lf = unit.includes('lf') || unit.includes('ft') ? it.quantity : it.quantity * NON_LINEAR_LF_PER_UNIT;
  const cy = (lf * TRENCH_WIDTH_FT * TRENCH_DEPTH_FT) / 27;
  return { lf, cy, stone: cy * BEDDING_RATIO * STONE_TONS_PER_CY, haul: cy * HAUL_RATIO };
}

/**
 * 11. Trench & Earthwork Engineering Log Layout
 */
export default function TrenchEarthworkLogDocument({ estimate, branding, currentProject }: DocumentTemplateProps) {
  const { bySystem = [] } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;

  const sum = bySystem
    .flatMap((s) => s.items)
    .map(earthwork)
    .reduce((acc, e) => ({ lf: acc.lf + e.lf, cy: acc.cy + e.cy, stone: acc.stone + e.stone, haul: acc.haul + e.haul }), {
      lf: 0,
      cy: 0,
      stone: 0,
      haul: 0,
    });

  const cy = (n: any) => t(`${KEY}.cyUnit`, { count: formatNumber(n, 1) });
  const tn = (n: any) => t(`${KEY}.tnUnit`, { count: formatNumber(n, 1) });

  const assumptions = [
    [t(`${KEY}.trenchWidthAssumption`), t(`${KEY}.trenchWidthValue`)],
    [t(`${KEY}.averageCoverDepth`), t(`${KEY}.averageCoverDepthValue`)],
    [t(`${KEY}.nativeSwellFactor`), t(`${KEY}.nativeSwellFactorValue`)],
    [t(`${KEY}.trenchSafety`), t(`${KEY}.trenchSafetyValue`)],
  ];

  const columns: DocumentColumn[] = [
    {
      header: t(`${KEY}.colTrenchLine`),
      render: (it) => (
        <>
          {it.description}
          {it.sizeSpec && <span className="ml-1 font-normal text-slate-500">— {it.sizeSpec}</span>}
        </>
      ),
    },
    { header: t(`${KEY}.colLength`), align: 'right', render: (it) => formatNumber(earthwork(it).lf, 0) },
    { header: t(`${KEY}.colTrenchVol`), align: 'right', className: 'font-semibold text-slate-900', render: (it) => cy(earthwork(it).cy) },
    { header: t(`${KEY}.colBeddingStone`), align: 'right', render: (it) => tn(earthwork(it).stone) },
    { header: t(`${KEY}.colBackfillHaul`), align: 'right', render: (it) => cy(earthwork(it).haul) },
    { header: t(`${KEY}.colDirectCost`), align: 'right', strong: true, render: (it) => formatCurrency(it.directCost) },
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
          { label: t(`${KEY}.totalLength`), value: t(`${KEY}.lfUnit`, { count: formatNumber(sum.lf, 0) }) },
          { label: t(`${KEY}.colBeddingStone`), value: tn(sum.stone) },
          { label: t(`${KEY}.colBackfillHaul`), value: cy(sum.haul) },
        ]}
        highlight={{ label: t(`${KEY}.totalExcavation`), value: cy(sum.cy) }}
      />

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.assumptionsHeading`)}</DocumentSectionHeading>
        <div className="grid grid-cols-4 gap-4 pt-1">
          {assumptions.map(([label, value]) => (
            <div key={label} className="border-l-2 pl-3" style={{ borderColor: accent }}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
              <p className="font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.detailHeading`)}</DocumentSectionHeading>
        <DocumentSystemTable
          bySystem={bySystem}
          columns={columns}
          accent={accent}
          subtotal={(sys) => formatCurrency(sys.directCost)}
        />
      </section>

      <p className="mt-6 pl-3 border-l-2 italic text-slate-500 break-inside-avoid" style={{ borderColor: accent }}>
        {t(`${KEY}.calcNote`)}
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
