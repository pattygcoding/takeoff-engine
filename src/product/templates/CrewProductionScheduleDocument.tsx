import React from 'react';
import type { DocumentTemplateProps } from '@/types/models';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentKeyFigures,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.crewProduction';
const ACCENT = '#ea580c';
const CREW_DAY_HOURS = 32; // 4-man crew x 8 hrs
const EXCAVATOR_UTIL = 0.4;
const HEAVY_MACHINE_FACTOR = 0.5;

const TH = 'py-2 px-2 text-[9px] font-bold uppercase tracking-wider text-slate-600';

/**
 * 9. Crew & Equipment Production Schedule Layout
 */
export default function CrewProductionScheduleDocument({ estimate, branding, currentProject }: DocumentTemplateProps) {
  const { totals = {}, bySystem = [] } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;
  const hours = (n: number | string | null | undefined, d = 2) => t(`${KEY}.hrsUnit`, { count: formatNumber(n, d) });
  const laborByRole = Array.isArray(totals.laborByRole) ? totals.laborByRole.filter((r) => r.laborHours > 0) : [];

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead
        branding={branding}
        title={t(`${KEY}.title`)}
        project={currentProject}
        accent={accent}
        badge={t('product.templates.header.internalBadge')}
      />

      <DocumentKeyFigures
        accent={accent}
        figures={[
          { label: t(`${KEY}.totalFieldHours`), value: t(`${KEY}.manHoursUnit`, { hours: formatNumber(totals.totalLaborHours) }) },
          { label: t(`${KEY}.estCrewDays`), value: t(`${KEY}.crewDaysUnit`, { days: formatNumber((totals.totalLaborHours || 0) / CREW_DAY_HOURS, 1) }) },
          { label: t(`${KEY}.heavyMachineHours`), value: t(`${KEY}.machHrsUnit`, { hours: formatNumber((totals.totalLaborHours || 0) * HEAVY_MACHINE_FACTOR, 1) }) },
        ]}
        highlight={{ label: t(`${KEY}.colLaborBudget`), value: formatCurrency(totals.totalLaborCost) }}
      />

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.scheduleHeading`)}</DocumentSectionHeading>
        {bySystem.length === 0 ? (
          <p className="py-6 text-center text-slate-400 italic">{t('product.templates.shared.noItems')}</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100">
                <th className={TH}>{t(`${KEY}.colPhaseSystem`)}</th>
                <th className={`${TH} text-right`}>{t(`${KEY}.colProductionHrs`)}</th>
                <th className={`${TH} text-right`}>{t(`${KEY}.colCrewDays`)}</th>
                <th className={`${TH} text-right`}>{t(`${KEY}.colExcavatorUtil`)}</th>
                <th className={`${TH} text-right`}>{t(`${KEY}.colLaborBudget`)}</th>
              </tr>
            </thead>
            <tbody>
              {bySystem.map((sys) => {
                const sysHrs = sys.items.reduce((sum, i) => sum + (i.laborHours || 0), 0);
                const sysLabor = sys.items.reduce((sum, i) => sum + (i.laborCost || 0), 0);
                return (
                  <tr key={sys.system} className="border-b border-slate-100 even:bg-slate-50/70 break-inside-avoid">
                    <td className="py-2 px-2 font-bold uppercase tracking-wide text-[10px]" style={{ color: accent }}>
                      {sys.system}
                    </td>
                    <td className="py-2 px-2 text-right">{hours(sysHrs)}</td>
                    <td className="py-2 px-2 text-right">{t(`${KEY}.dUnit`, { count: formatNumber(sysHrs / CREW_DAY_HOURS, 1) })}</td>
                    <td className="py-2 px-2 text-right">{hours(sysHrs * EXCAVATOR_UTIL, 1)}</td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-900">{formatCurrency(sysLabor)}</td>
                  </tr>
                );
              })}
              <tr className="text-white font-bold" style={{ backgroundColor: accent }}>
                <td className="py-2 px-2 text-[11px] uppercase tracking-wider">{t(`${KEY}.totalFieldLabor`)}</td>
                <td className="py-2 px-2 text-right">{hours(totals.totalLaborHours)}</td>
                <td className="py-2 px-2 text-right">{t(`${KEY}.daysUnit`, { count: formatNumber((totals.totalLaborHours || 0) / CREW_DAY_HOURS, 1) })}</td>
                <td className="py-2 px-2 text-right">{hours((totals.totalLaborHours || 0) * EXCAVATOR_UTIL, 1)}</td>
                <td className="py-2 px-2 text-right text-sm">{formatCurrency(totals.totalLaborCost)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      {laborByRole.length > 0 && (
        <section className="mt-8 flex justify-end break-inside-avoid">
          <div className="w-full max-w-[420px]">
            <DocumentSectionHeading accent={accent}>{t(`${KEY}.laborByRoleHeading`)}</DocumentSectionHeading>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100">
                  <th className={TH}>{t(`${KEY}.colRole`)}</th>
                  <th className={`${TH} text-right`}>{t(`${KEY}.colProductionHrs`)}</th>
                  <th className={`${TH} text-right`}>{t(`${KEY}.colLaborBudget`)}</th>
                </tr>
              </thead>
              <tbody>
                {laborByRole.map((role) => (
                  <tr key={role.roleId} className="border-b border-slate-100">
                    <td className="py-1.5 px-2 font-medium text-slate-900">{role.roleTitle}</td>
                    <td className="py-1.5 px-2 text-right">{hours(role.laborHours)}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-slate-900">{formatCurrency(role.laborCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="mt-6 pl-3 border-l-2 italic text-slate-500 break-inside-avoid" style={{ borderColor: accent }}>
        {t(`${KEY}.assumptionsNote`)}
      </p>

      <DocumentSignatureBlock
        accent={accent}
        heading={t('product.templates.signOff.internalReview')}
        parties={[{ title: t(`${KEY}.preparedByPm`) }, { title: t(`${KEY}.approvedBySuper`) }]}
      />

      <DocumentFooter confidential />
    </div>
  );
}
