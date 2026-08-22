import React from 'react';
import { formatCurrency } from '@/lib/calculations';
import { DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';

/**
 * 17. Substantial Completion & Warranty Certificate Layout
 */
export default function WarrantyCloseoutCertDocument({ estimate, branding, currentProject }) {
  const { totals } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6 font-serif text-center py-4">
      <div className="border-4 border-double border-amber-600 p-8 rounded-3xl bg-amber-50/20 space-y-5">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
          ★
        </div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-amber-950">
          {t('templates.warrantyCloseout.title')}
        </h2>
        <p className="text-xs text-slate-600 font-sans max-w-lg mx-auto leading-relaxed">
          {t('templates.warrantyCloseout.certIntro', {
            projectName: currentProject?.name || t('templates.warrantyCloseout.defaultProjectName')
          })}
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-xs font-sans text-left bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
          <div>
            <span className="text-slate-400 font-bold">{t('templates.warrantyCloseout.contractorLabel')}</span>
            <p className="font-bold text-slate-900">{branding?.companyName || t('templates.warrantyCloseout.defaultContractor')}</p>
          </div>
          <div>
            <span className="text-slate-400 font-bold">{t('templates.warrantyCloseout.clientLabel')}</span>
            <p className="font-bold text-slate-900">{currentProject?.client_name || t('templates.warrantyCloseout.defaultClient')}</p>
          </div>
          <div>
            <span className="text-slate-400 font-bold">{t('templates.warrantyCloseout.warrantyPeriodLabel')}</span>
            <p className="font-bold text-emerald-700">{t('templates.warrantyCloseout.warrantyPeriodValue')}</p>
          </div>
          <div>
            <span className="text-slate-400 font-bold">{t('templates.warrantyCloseout.certifiedValueLabel')}</span>
            <p className="font-bold font-mono text-slate-900">{formatCurrency(totals.finalBidAmount)}</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 font-sans italic max-w-md mx-auto">
          {t('templates.warrantyCloseout.warrantyTerms')}
        </p>

        <div className="pt-6 border-t border-amber-300/80 font-sans">
          <DocumentSignOff branding={branding} clientSignBlock />
        </div>
      </div>
    </div>
  );
}
