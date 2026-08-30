import React from 'react';
import { useTranslation } from '@/core/components/context/I18nContext';

/**
 * Shared Branding Header for Document Layouts
 */
export function DocumentBrandingHeader({ branding, title, project }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div className="space-y-1">
        {branding?.companyLogoUrl && (
          <img
            src={branding.companyLogoUrl}
            alt={branding.companyName || t('templates.header.companyLogoAlt')}
            className="h-10 w-auto object-contain mb-1"
          />
        )}
        <h2 className="text-lg font-bold text-slate-900">
          {branding?.companyName || t('templates.header.defaultCompanyName')}
        </h2>
        {branding?.companyAddress && <p className="text-xs text-slate-500">{branding.companyAddress}</p>}
        {branding?.companyPhone && (
          <p className="text-xs text-slate-500">
            {t('templates.header.phonePrefix', { phone: branding.companyPhone })}
          </p>
        )}
      </div>

      <div className="text-left sm:text-right space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">{title}</span>
        <h3 className="text-sm font-bold text-slate-900">
          {project?.name || t('templates.header.defaultProjectName')}
        </h3>
        {project?.client_name && (
          <p className="text-xs text-slate-500">
            {t('templates.header.clientPrefix', { client: project.client_name })}
          </p>
        )}
        {project?.location && (
          <p className="text-xs text-slate-500">
            {t('templates.header.sitePrefix', { site: project.location })}
          </p>
        )}
        <p className="text-[11px] font-mono text-slate-400">
          {t('templates.header.datePrefix', { date: new Date().toLocaleDateString() })}
        </p>
      </div>
    </div>
  );
}

/**
 * Shared Sign-off / Signature Footer Block for Document Layouts
 */
export function DocumentSignOff({ branding, clientSignBlock = false }) {
  const { t } = useTranslation();

  return (
    <div className="pt-6 border-t border-slate-200 space-y-4">
      {clientSignBlock ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-8">
            <span className="text-xs font-bold text-slate-700">{t('templates.signOff.submittedByContractor')}</span>
            <div className="border-b border-slate-400 pb-1 flex justify-between text-xs text-slate-600">
              <span>{t('templates.signOff.authorizedSignature')}</span>
              <span>{t('templates.signOff.date')}</span>
            </div>
          </div>
          <div className="space-y-8">
            <span className="text-xs font-bold text-slate-700">{t('templates.signOff.acceptedByClient')}</span>
            <div className="border-b border-slate-400 pb-1 flex justify-between text-xs text-slate-600">
              <span>{t('templates.signOff.authorizedSignature')}</span>
              <span>{t('templates.signOff.date')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center text-[11px] text-slate-400">
          <span>{t('templates.signOff.preparedWith')}</span>
          <span>{t('templates.signOff.confidentialData')}</span>
        </div>
      )}
    </div>
  );
}
