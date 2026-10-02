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

const KEY = 'product.templates.formalContract';
const ACCENT = '#1e293b';

function Clause({ title, children }) {
  return (
    <p className="break-inside-avoid">
      <strong className="text-slate-900">{title}</strong> {children}
    </p>
  );
}

/**
 * 13. Owner-Contractor Formal Agreement Layout
 */
export default function FormalContractAgreementDocument({ estimate, branding, currentProject }) {
  const { totals = {}, bySystem = [], rates } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead branding={branding} title={t(`${KEY}.title`)} project={currentProject} accent={accent} />

      <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{t(`${KEY}.subtitle`)}</p>

      <section className="mt-6 space-y-3 font-serif text-[12px] text-slate-800 text-justify">
        <p>
          {t(`${KEY}.introAgreement`, {
            date: today,
            contractor: branding?.companyName || t(`${KEY}.defaultContractor`),
            owner: currentProject?.client_name || t(`${KEY}.defaultOwner`),
            site: currentProject?.location || t(`${KEY}.defaultSite`),
          })}
        </p>
        <Clause title={t(`${KEY}.clause1Title`)}>
          {t(`${KEY}.clause1Text`)}
          <strong className="text-slate-900">{formatCurrency(totals.finalBidAmount)}</strong>.
        </Clause>
        <Clause title={t(`${KEY}.clause2Title`)}>
          {t(`${KEY}.clause2Text`, { systems: bySystem.map((s) => s.system).join(', ') })}
        </Clause>
        <Clause title={t(`${KEY}.clause3Title`)}>{t(`${KEY}.clause3Text`)}</Clause>
      </section>

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.phaseSummary`)}</DocumentSectionHeading>
        <table className="w-full border-collapse text-left">
          <tbody>
            {bySystem.map((s) => (
              <tr key={s.system} className="border-b border-slate-100">
                <td className="py-1.5 px-2 font-medium text-slate-900">{s.system}</td>
                <td className="py-1.5 px-2 text-slate-500">{t(`${KEY}.workItemsCount`, { count: s.items.length })}</td>
                <td className="py-1.5 px-2 text-right font-semibold text-slate-900">{formatCurrency(s.factoredBid ?? s.directCost)}</td>
              </tr>
            ))}
            <DocumentTotalRow
              label={t(`${KEY}.totalLumpSumContract`)}
              value={formatCurrency(totals.finalBidAmount)}
              accent={accent}
              colSpan={2}
            />
          </tbody>
        </table>
      </section>

      <div className="break-inside-avoid">
        <ScopeSummaryDisplay scopeItems={rates?.scopeItems} baseAmount={totals.totalDirectCost} forceLight className="mt-8" />
      </div>

      <DocumentSignatureBlock
        accent={accent}
        heading={t(`${KEY}.executionHeading`)}
        intro={t(`${KEY}.executionText`)}
        showPrintedName
        parties={[
          { title: t(`${KEY}.contractorParty`), subtitle: branding?.companyName },
          { title: t(`${KEY}.ownerParty`), subtitle: currentProject?.client_name },
        ]}
      />

      <DocumentFooter />
    </div>
  );
}
