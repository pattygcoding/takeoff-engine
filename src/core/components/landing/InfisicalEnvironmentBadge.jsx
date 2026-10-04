import React from 'react';
import { useTranslation } from '@/core/components/context/I18nContext';

export default function InfisicalEnvironmentBadge() {
  const { t } = useTranslation();
  const environment = import.meta.env.VITE_INFISICAL_ENVIRONMENT?.toLowerCase();
  const isDev = environment === 'dev';
  const isProd = environment === 'prod';
  const label = isDev
    ? t('core.footer.devInfisicalEnvironment')
    : isProd
      ? t('core.footer.prodInfisicalEnvironment')
      : '?';
  const description = isDev
    ? t('core.footer.devInfisicalEnvironmentDescription')
    : isProd
      ? t('core.footer.prodInfisicalEnvironmentDescription')
      : t('core.footer.unknownInfisicalEnvironmentDescription');

  return (
    <span
      title={description}
      aria-label={description}
      className={`inline-flex items-center border px-2 py-0.5 font-semibold ${
        isDev
          ? 'border-blue-400/40 text-blue-300'
          : isProd
            ? 'border-emerald-400/40 text-emerald-300'
            : 'border-amber-400/40 text-amber-300'
      }`}
    >
      {label}
    </span>
  );
}
