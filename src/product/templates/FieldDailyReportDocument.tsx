import React from 'react';
import type { DocumentTemplateProps } from '@/types/models';
import type { DocumentColumn } from './DocumentHeaderSignoff';
import { formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentSystemTable,
  DocumentFillLine,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.fieldDailyReport';
const ACCENT = '#0369a1';
const BLANK_CELL = 'h-7 border-x border-slate-200 bg-white min-w-[64px]';

/**
 * 16. Field Superintendent QA Log Layout
 */
export default function FieldDailyReportDocument({ estimate, branding, currentProject }: DocumentTemplateProps) {
  const { bySystem = [] } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;

  const columns: DocumentColumn[] = [
    {
      header: t(`${KEY}.colItemDescription`),
      render: (it) => (
        <>
          {it.description}
          {it.sizeSpec && <span className="ml-1 font-normal text-slate-500">— {it.sizeSpec}</span>}
        </>
      ),
    },
    { header: t(`${KEY}.colTargetQty`), align: 'right', render: (it) => formatNumber(it.quantity, 0) },
    { header: t(`${KEY}.colUnit`), muted: true, render: (it) => it.unit },
    { header: t(`${KEY}.colInstalledToday`), className: BLANK_CELL, render: () => null },
    { header: t(`${KEY}.colCumulativeQty`), className: BLANK_CELL, render: () => null },
    { header: t(`${KEY}.colQcSign`), className: BLANK_CELL, render: () => null },
  ];

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead branding={branding} title={t(`${KEY}.title`)} project={currentProject} accent={accent} />

      <section className="mt-6 grid grid-cols-2 gap-6 break-inside-avoid">
        <div className="border border-slate-300 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: accent }}>
            {t(`${KEY}.conditionsHeading`)}
          </p>
          <DocumentFillLine label={t(`${KEY}.reportDate`)} labelWidth="w-28" />
          <DocumentFillLine label={t(`${KEY}.weatherTemp`)} labelWidth="w-28" />
          <DocumentFillLine label={t(`${KEY}.crewSize`)} labelWidth="w-28" />
        </div>
        <div className="border border-slate-300 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: accent }}>
            {t(`${KEY}.personnelHeading`)}
          </p>
          <DocumentFillLine label={t(`${KEY}.superintendent`)} labelWidth="w-28" />
          <DocumentFillLine label={t(`${KEY}.cityInspector`)} labelWidth="w-28" />
          <div className="flex items-center gap-2 py-1">
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-slate-500 w-28">
              {t(`${KEY}.dailySafetyTalk`)}
            </span>
            <span className="inline-block w-3 h-3 border border-slate-400" />
            <span className="text-slate-600">{t(`${KEY}.completed`)}</span>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.progressHeading`)}</DocumentSectionHeading>
        <DocumentSystemTable bySystem={bySystem} columns={columns} accent={accent} />
      </section>

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.notesHeading`)}</DocumentSectionHeading>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 border-b border-slate-300" />
        ))}
      </section>

      <DocumentSignatureBlock
        accent={accent}
        heading={t(`${KEY}.signatureHeading`)}
        showPrintedName
        parties={[{ title: t(`${KEY}.signSuperintendent`) }, { title: t(`${KEY}.signInspector`) }]}
      />

      <DocumentFooter />
    </div>
  );
}
