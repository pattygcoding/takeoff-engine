import React from 'react';
import { formatCurrency } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import ScopeSummaryDisplay from '@/product/components/ScopeSummaryDisplay';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentTotalRow,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.executiveProposal';
const ACCENT = '#059669';

/**
 * 3. Executive Proposal Document Layout
 */
export default function ExecutiveProposalDocument({ estimate, branding, currentProject }) {
  const { totals = {}, bySystem = [], rates } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead branding={branding} title={t(`${KEY}.title`)} project={currentProject} accent={accent} />

      <section className="mt-6 grid grid-cols-3 border border-slate-300 break-inside-avoid">
        <div className="col-span-2 px-4 py-3 bg-slate-50 border-r border-slate-300">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{t(`${KEY}.guaranteeTitle`)}</p>
          <p className="mt-1 text-slate-600">{t(`${KEY}.guaranteeDesc`)}</p>
        </div>
        <div className="px-4 py-3 flex flex-col justify-center text-white" style={{ backgroundColor: accent }}>
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{t(`${KEY}.totalContractValue`)}</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(totals.finalBidAmount)}</p>
        </div>
      </section>

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.summaryHeading`)}</DocumentSectionHeading>
        {bySystem.length === 0 ? (
          <p className="py-6 text-center text-slate-400 italic">{t('product.templates.shared.noItems')}</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2 px-2">{t(`${KEY}.colSystemPhase`)}</th>
                <th className="py-2 px-2">{t(`${KEY}.colPrimaryInclusions`)}</th>
                <th className="py-2 px-2 text-right">{t(`${KEY}.colItemsCount`)}</th>
                <th className="py-2 px-2 text-right">{t(`${KEY}.colLumpSumTotal`)}</th>
              </tr>
            </thead>
            <tbody>
              {bySystem.map((sys) => (
                <tr key={sys.system} className="border-b border-slate-100 even:bg-slate-50/70 break-inside-avoid">
                  <td className="py-2 px-2 font-bold uppercase tracking-wide text-[10px]" style={{ color: accent }}>
                    {sys.system}
                  </td>
                  <td className="py-2 px-2 text-slate-600">
                    {sys.items.map((i) => i.description).slice(0, 3).join(', ')}
                    {sys.items.length > 3 ? '…' : ''}
                  </td>
                  <td className="py-2 px-2 text-right">{sys.items.length}</td>
                  <td className="py-2 px-2 text-right font-semibold text-slate-900">
                    {formatCurrency(sys.factoredBid ?? sys.directCost)}
                  </td>
                </tr>
              ))}
              <DocumentTotalRow
                label={t(`${KEY}.totalLumpSumBid`)}
                value={formatCurrency(totals.finalBidAmount)}
                accent={accent}
                colSpan={3}
              />
            </tbody>
          </table>
        )}
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
