import React from 'react';
import type { DocumentTemplateProps } from '@/types/models';
import { Award } from 'lucide-react';
import { formatCurrency } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import { DocumentLetterhead, DocumentSignatureBlock, DocumentFooter } from './DocumentHeaderSignoff';

const KEY = 'product.templates.warrantyCloseout';
const ACCENT = '#d97706';

/**
 * 17. Substantial Completion & Warranty Certificate Layout
 */
export default function WarrantyCloseoutCertDocument({ estimate, branding, currentProject }: DocumentTemplateProps) {
  const { totals = {} } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;

  const details = [
    [t(`${KEY}.contractorLabel`), branding?.companyName || t(`${KEY}.defaultContractor`)],
    [t(`${KEY}.clientLabel`), currentProject?.client_name || t(`${KEY}.defaultClient`)],
    [t(`${KEY}.warrantyPeriodLabel`), t(`${KEY}.warrantyPeriodValue`)],
    [t(`${KEY}.certifiedValueLabel`), formatCurrency(totals.finalBidAmount)],
  ];

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead branding={branding} title={t(`${KEY}.title`)} project={currentProject} accent={accent} />

      <section className="mt-8 p-1.5 border-2 break-inside-avoid" style={{ borderColor: accent }}>
        <div className="border px-10 py-8 text-center space-y-5" style={{ borderColor: accent }}>
          <div
            className="w-11 h-11 mx-auto rounded-full text-white flex items-center justify-center"
            style={{ backgroundColor: accent }}
          >
            <Award className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-lg font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
            {t(`${KEY}.certificateHeading`)}
          </h2>
          <p className="font-serif text-[12px] text-slate-700 max-w-lg mx-auto">
            {t(`${KEY}.certIntro`, { projectName: currentProject?.name || t(`${KEY}.defaultProjectName`) })}
          </p>

          <table className="mx-auto w-full max-w-md border-collapse text-left">
            <tbody>
              {details.map(([label, value]) => (
                <tr key={label} className="border-b border-slate-200">
                  <td className="py-1.5 pr-3 text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</td>
                  <td className="py-1.5 text-right font-semibold text-slate-900">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-[10px] italic text-slate-500 max-w-md mx-auto">{t(`${KEY}.warrantyTerms`)}</p>
        </div>
      </section>

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
