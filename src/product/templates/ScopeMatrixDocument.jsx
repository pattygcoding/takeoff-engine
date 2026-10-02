import React from 'react';
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

const KEY = 'product.templates.scopeMatrix';
const ACCENT = '#7e22ce';

/**
 * 7. Commercial Scope & Spec Matrix Document Layout
 */
export default function ScopeMatrixDocument({ estimate, branding, currentProject }) {
  const { totals = {}, bySystem = [], rates } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;

  const columns = [
    { header: t(`${KEY}.colScopeItem`), render: (it) => it.description },
    { header: t(`${KEY}.colSpec`), muted: true, render: (it) => it.sizeSpec },
    { header: t(`${KEY}.colQty`), align: 'right', className: 'font-semibold text-slate-900', render: (it) => formatNumber(it.quantity, 0) },
    { header: t(`${KEY}.colUnit`), muted: true, render: (it) => it.unit },
  ];

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead branding={branding} title={t(`${KEY}.title`)} project={currentProject} accent={accent} />

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.matrixHeading`)}</DocumentSectionHeading>
        <DocumentSystemTable
          bySystem={bySystem}
          columns={columns}
          accent={accent}
          headerAside={(sys) => formatCurrency(sys.factoredBid ?? sys.directCost)}
        />
      </section>

      <section className="mt-8 flex justify-end break-inside-avoid">
        <div className="w-full max-w-[340px]">
          <DocumentSectionHeading accent={accent}>{t(`${KEY}.summaryHeading`)}</DocumentSectionHeading>
          <table className="w-full border-collapse">
            <tbody>
              {bySystem.map((sys) => (
                <tr key={sys.system} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3">{sys.system}</td>
                  <td className="py-1.5 text-right">{formatCurrency(sys.factoredBid ?? sys.directCost)}</td>
                </tr>
              ))}
              <DocumentTotalRow label={t(`${KEY}.totalCombinedBid`)} value={formatCurrency(totals.finalBidAmount)} accent={accent} />
            </tbody>
          </table>
        </div>
      </section>

      <div className="break-inside-avoid">
        <ScopeSummaryDisplay scopeItems={rates?.scopeItems} baseAmount={totals.totalDirectCost} forceLight className="mt-8" />
      </div>

      <DocumentSignatureBlock
        accent={accent}
        heading={t('product.templates.signOff.acceptanceHeading')}
        intro={t('product.templates.signOff.acceptanceText')}
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
