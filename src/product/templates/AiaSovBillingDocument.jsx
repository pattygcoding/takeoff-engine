import React from 'react';
import { formatCurrency } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentFillLine,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.aiaSovBilling';
const ACCENT = '#047857';
const TH = 'py-2 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-600';

/**
 * 12. AIA G702/G703 SOV Billing Layout
 */
export default function AiaSovBillingDocument({ estimate, branding, currentProject }) {
  const { totals = {}, bySystem = [] } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;
  const zero = formatCurrency(0);

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead branding={branding} title={t(`${KEY}.title`)} project={currentProject} accent={accent} />

      <section className="mt-6 grid grid-cols-2 gap-6 break-inside-avoid">
        <div className="border border-slate-300 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: accent }}>
            {t(`${KEY}.partiesHeading`)}
          </p>
          <DocumentFillLine label={t(`${KEY}.toOwner`)} value={currentProject?.client_name} />
          <DocumentFillLine label={t(`${KEY}.fromContractor`)} value={branding?.companyName} />
          <DocumentFillLine label={t(`${KEY}.project`)} value={currentProject?.name} />
        </div>
        <div className="border border-slate-300 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: accent }}>
            {t(`${KEY}.applicationHeading`)}
          </p>
          <DocumentFillLine label={t(`${KEY}.applicationNo`)} />
          <DocumentFillLine label={t(`${KEY}.periodTo`)} />
          <DocumentFillLine label={t(`${KEY}.contractSum`)} value={formatCurrency(totals.finalBidAmount)} />
        </div>
      </section>

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.sovHeading`)}</DocumentSectionHeading>
        {bySystem.length === 0 ? (
          <p className="py-6 text-center text-slate-400 italic">{t('product.templates.shared.noItems')}</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100">
                <th className={`${TH} w-10`}>{t(`${KEY}.colItem`)}</th>
                <th className={TH}>{t(`${KEY}.colDescriptionOfWork`)}</th>
                <th className={`${TH} text-right`}>{t(`${KEY}.colScheduledValue`)}</th>
                <th className={`${TH} text-right`}>{t(`${KEY}.colWorkDone`)}</th>
                <th className={`${TH} text-right`}>{t(`${KEY}.colStoredMat`)}</th>
                <th className={`${TH} text-right`}>{t(`${KEY}.colTotalPercent`)}</th>
                <th className={`${TH} text-right`}>{t(`${KEY}.colBalance`)}</th>
              </tr>
            </thead>
            <tbody>
              {bySystem.map((sys, idx) => {
                const sysVal = sys.factoredBid ?? sys.directCost;
                return (
                  <tr key={sys.system} className="border-b border-slate-100 even:bg-slate-50/70 break-inside-avoid">
                    <td className="py-2 px-2 font-bold text-slate-500">{String(idx + 1).padStart(3, '0')}</td>
                    <td className="py-2 px-2 font-medium text-slate-900">{t(`${KEY}.packageSuffix`, { system: sys.system })}</td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">{formatCurrency(sysVal)}</td>
                    <td className="py-2 px-2 text-right text-slate-400">{zero}</td>
                    <td className="py-2 px-2 text-right text-slate-400">{zero}</td>
                    <td className="py-2 px-2 text-right text-slate-400">0.0%</td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">{formatCurrency(sysVal)}</td>
                  </tr>
                );
              })}
              <tr className="text-white font-bold" style={{ backgroundColor: accent }}>
                <td colSpan={2} className="py-2 px-2 text-[11px] uppercase tracking-wider">{t(`${KEY}.totalScheduledValues`)}</td>
                <td className="py-2 px-2 text-right">{formatCurrency(totals.finalBidAmount)}</td>
                <td className="py-2 px-2 text-right">{zero}</td>
                <td className="py-2 px-2 text-right">{zero}</td>
                <td className="py-2 px-2 text-right">0.0%</td>
                <td className="py-2 px-2 text-right">{formatCurrency(totals.finalBidAmount)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      <DocumentSignatureBlock
        accent={accent}
        heading={t(`${KEY}.certificationHeading`)}
        intro={t(`${KEY}.certificationText`)}
        showPrintedName
        parties={[
          { title: t('product.templates.signOff.submittedByContractor'), subtitle: branding?.companyName },
          { title: t(`${KEY}.certifiedByOwner`), subtitle: currentProject?.client_name },
        ]}
      />

      <DocumentFooter />
    </div>
  );
}
