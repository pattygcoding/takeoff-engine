import React from 'react';
import type { DocumentTemplateProps } from '@/types/models';
import type { DocumentColumn } from './DocumentHeaderSignoff';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import ScopeSummaryDisplay from '@/product/components/ScopeSummaryDisplay';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentSystemTable,
  DocumentTotalRow,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.subcontractorScope';
const ACCENT = '#0f766e';

/**
 * 10. Subcontractor Scope Submittal Layout
 */
export default function SubcontractorScopeDocument({ estimate, branding, currentProject }: DocumentTemplateProps) {
  const { totals = {}, bySystem = [], rates } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;
  const packageTotal = bySystem.reduce((sum, sys) => sum + (sys.directCost || 0), 0);

  const columns: DocumentColumn[] = [
    { header: t(`${KEY}.colScopeDescription`), render: (it) => it.description },
    { header: t(`${KEY}.colSpecAstm`), muted: true, render: (it) => it.sizeSpec },
    { header: t(`${KEY}.colTakeoffQty`), align: 'right', render: (it) => formatNumber(it.quantity, 0) },
    { header: t(`${KEY}.colUnit`), muted: true, render: (it) => it.unit },
    { header: t(`${KEY}.colTargetSubtotal`), align: 'right', strong: true, render: (it) => formatCurrency(it.directCost) },
  ];

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead branding={branding} title={t(`${KEY}.title`)} project={currentProject} accent={accent} />

      <section className="mt-6 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.inclusionsTitle`)}</DocumentSectionHeading>
        <p className="pl-3 border-l-2 text-slate-600" style={{ borderColor: accent }}>
          {t(`${KEY}.inclusionsDesc`)}
        </p>
      </section>

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.packageHeading`)}</DocumentSectionHeading>
        <DocumentSystemTable
          bySystem={bySystem}
          columns={columns}
          accent={accent}
          subtotal={(sys) => formatCurrency(sys.directCost)}
        />
      </section>

      <section className="mt-8 flex justify-end break-inside-avoid">
        <table className="w-full max-w-[340px] border-collapse">
          <tbody>
            <DocumentTotalRow label={t(`${KEY}.totalTargetValue`)} value={formatCurrency(packageTotal)} accent={accent} />
          </tbody>
        </table>
      </section>

      <div className="break-inside-avoid">
        <ScopeSummaryDisplay scopeItems={rates?.scopeItems} baseAmount={totals.totalDirectCost} forceLight className="mt-8" />
      </div>

      <DocumentSignatureBlock
        accent={accent}
        heading={t(`${KEY}.signatureHeading`)}
        intro={t(`${KEY}.signatureText`)}
        showPrintedName
        parties={[
          { title: t(`${KEY}.issuedBy`), subtitle: branding?.companyName },
          { title: t(`${KEY}.acceptedBy`) },
        ]}
      />

      <DocumentFooter />
    </div>
  );
}
