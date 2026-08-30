import React from 'react';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/core/components/context/I18nContext';

/**
 * 9. Crew & Equipment Production Schedule Layout
 */
export default function CrewProductionScheduleDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.crewProduction.title')} project={currentProject} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-orange-600">{t('templates.crewProduction.totalFieldHours')}</span>
          <p className="text-base font-bold text-orange-950">
            {t('templates.crewProduction.manHoursUnit', { hours: formatNumber(totals.totalLaborHours) })}
          </p>
        </div>
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-500">{t('templates.crewProduction.estCrewDays')}</span>
          <p className="text-base font-bold text-slate-900">
            {t('templates.crewProduction.crewDaysUnit', { days: formatNumber(totals.totalLaborHours / 32, 1) })}
          </p>
        </div>
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-500">{t('templates.crewProduction.heavyMachineHours')}</span>
          <p className="text-base font-bold text-slate-900">
            {t('templates.crewProduction.machHrsUnit', { hours: formatNumber(totals.totalLaborHours * 0.5, 1) })}
          </p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-2.5">{t('templates.crewProduction.colPhaseSystem')}</th>
              <th className="p-2.5 text-right">{t('templates.crewProduction.colProductionHrs')}</th>
              <th className="p-2.5 text-right">{t('templates.crewProduction.colCrewDays')}</th>
              <th className="p-2.5 text-right">{t('templates.crewProduction.colExcavatorUtil')}</th>
              <th className="p-2.5 text-right">{t('templates.crewProduction.colLaborBudget')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bySystem.map((sys) => {
              const sysHrs = sys.items.reduce((sum, i) => sum + (i.laborHours || 0), 0);
              const sysLabor = sys.items.reduce((sum, i) => sum + (i.laborCost || 0), 0);
              return (
                <tr key={sys.system} className="hover:bg-slate-50 font-mono">
                  <td className="p-2.5 font-sans font-bold text-slate-900">{sys.system}</td>
                  <td className="p-2.5 text-right">{t('templates.crewProduction.hrsUnit', { count: formatNumber(sysHrs) })}</td>
                  <td className="p-2.5 text-right">{t('templates.crewProduction.dUnit', { count: formatNumber(sysHrs / 32, 1) })}</td>
                  <td className="p-2.5 text-right">{t('templates.crewProduction.hrsUnit', { count: formatNumber(sysHrs * 0.4, 1) })}</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(sysLabor)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td className="p-2.5 text-slate-700 font-sans">{t('templates.crewProduction.totalFieldLabor')}</td>
              <td className="p-2.5 text-right font-mono">{t('templates.crewProduction.hrsUnit', { count: formatNumber(totals.totalLaborHours) })}</td>
              <td className="p-2.5 text-right font-mono">{t('templates.crewProduction.daysUnit', { count: formatNumber(totals.totalLaborHours / 32, 1) })}</td>
              <td className="p-2.5 text-right font-mono">{t('templates.crewProduction.hrsUnit', { count: formatNumber(totals.totalLaborHours * 0.4, 1) })}</td>
              <td className="p-2.5 text-right font-mono text-orange-800">{formatCurrency(totals.totalLaborCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
