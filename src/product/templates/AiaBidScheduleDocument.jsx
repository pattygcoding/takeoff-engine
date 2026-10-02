import React from 'react';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentSystemTable,
  DocumentTotalRow,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.aiaBidSchedule';
const ACCENT = '#1e293b';

/**
 * 5. AIA Unit Price Bid Schedule Document Layout
 */
export default function AiaBidScheduleDocument({ estimate, branding, currentProject }) {
  const { totals = {}, bySystem = [] } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;

  // Pay item numbers run continuously across systems, as on a public bid form.
  let itemNo = 0;
  const numberedSystems = bySystem.map((sys) => ({
    ...sys,
    items: sys.items.map((it) => ({ ...it, payItemNo: ++itemNo })),
  }));

  const extended = (it) => it.factoredPrice ?? it.directCost;

  const columns = [
    {
      header: t(`${KEY}.colItemNumber`),
      className: 'font-bold text-slate-500 w-12',
      render: (it) => String(it.payItemNo).padStart(3, '0'),
    },
    {
      header: t(`${KEY}.colPayItemDesc`),
      className: 'font-medium text-slate-900',
      render: (it) => (
        <>
          {it.description}
          {it.sizeSpec && <span className="ml-1 font-normal text-slate-500">— {it.sizeSpec}</span>}
        </>
      ),
    },
    { header: t(`${KEY}.colEstQty`), align: 'right', render: (it) => formatNumber(it.quantity, 0) },
    { header: t(`${KEY}.colUnit`), muted: true, render: (it) => it.unit },
    {
      header: t(`${KEY}.colUnitPrice`),
      align: 'right',
      render: (it) => formatCurrency(it.quantity > 0 ? extended(it) / it.quantity : 0),
    },
    { header: t(`${KEY}.colTotalItemBid`), align: 'right', strong: true, render: (it) => formatCurrency(extended(it)) },
  ];

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead branding={branding} title={t(`${KEY}.title`)} project={currentProject} accent={accent} />

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.scheduleHeading`)}</DocumentSectionHeading>
        <DocumentSystemTable
          bySystem={numberedSystems}
          columns={columns}
          accent={accent}
          subtotal={(sys) => formatCurrency(sys.factoredBid ?? sys.directCost)}
        />
      </section>

      <section className="mt-8 flex justify-end break-inside-avoid">
        <div className="w-full max-w-[340px]">
          <DocumentSectionHeading accent={accent}>{t(`${KEY}.totalBaseBidSchedule`)}</DocumentSectionHeading>
          <table className="w-full border-collapse">
            <tbody>
              {bySystem.map((sys) => (
                <tr key={sys.system} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3">{sys.system}</td>
                  <td className="py-1.5 text-right">{formatCurrency(sys.factoredBid ?? sys.directCost)}</td>
                </tr>
              ))}
              <DocumentTotalRow label={t(`${KEY}.totalBaseContractBid`)} value={formatCurrency(totals.finalBidAmount)} accent={accent} />
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 pl-3 border-l-2 italic text-slate-600 break-inside-avoid" style={{ borderColor: accent }}>
        {t(`${KEY}.noteStandardSpec`)}
      </p>

      <DocumentSignatureBlock
        accent={accent}
        heading={t(`${KEY}.signatureHeading`)}
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
