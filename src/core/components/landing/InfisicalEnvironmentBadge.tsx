import React from 'react';
import { useTranslation } from '@/core/components/context/I18nContext';

/** Label, description and tone for each known Infisical environment. */
const ENVIRONMENT_UI: Record<string, { labelKey: string; descriptionKey: string; toneClass: string }> = {
  dev: {
    labelKey: 'core.footer.devInfisicalEnvironment',
    descriptionKey: 'core.footer.devInfisicalEnvironmentDescription',
    toneClass: 'border-blue-400/40 text-blue-300',
  },
  prod: {
    labelKey: 'core.footer.prodInfisicalEnvironment',
    descriptionKey: 'core.footer.prodInfisicalEnvironmentDescription',
    toneClass: 'border-emerald-400/40 text-emerald-300',
  },
};

export default function InfisicalEnvironmentBadge() {
  const { t } = useTranslation();
  const environment = import.meta.env.VITE_INFISICAL_ENVIRONMENT?.toLowerCase();
  const ui = ENVIRONMENT_UI[environment ?? ''];
  const label = ui ? t(ui.labelKey) : '?';
  const description = ui ? t(ui.descriptionKey) : t('core.footer.unknownInfisicalEnvironmentDescription');

  return (
    <span
      title={description}
      aria-label={description}
      className={`inline-flex items-center border px-2 py-0.5 font-semibold ${ui ? ui.toneClass : 'border-amber-400/40 text-amber-300'}`}
    >
      {label}
    </span>
  );
}
