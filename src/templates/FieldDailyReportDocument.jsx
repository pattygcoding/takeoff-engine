import React from 'react';
import { formatNumber } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/context/I18nContext';

/**
 * 16. Field Superintendent QA Log Layout
 */
export default function FieldDailyReportDocument({ estimate, branding, currentProject }) {
  const { bySystem } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('templates.fieldDailyReport.title')} project={currentProject} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-slate-200 rounded-xl p-3 bg-slate-50">
        <div>
          <span className="text-slate-400 font-bold">{t('templates.fieldDailyReport.weatherTemp')}</span>
          <div className="border-b border-slate-300 mt-2 h-4" />
        </div>
        <div>
          <span className="text-slate-400 font-bold">{t('templates.fieldDailyReport.superintendent')}</span>
          <div className="border-b border-slate-300 mt-2 h-4" />
        </div>
        <div>
          <span className="text-slate-400 font-bold">{t('templates.fieldDailyReport.cityInspector')}</span>
          <div className="border-b border-slate-300 mt-2 h-4" />
        </div>
        <div>
          <span className="text-slate-400 font-bold">{t('templates.fieldDailyReport.dailySafetyTalk')}</span>
          <div className="text-emerald-700 font-bold mt-1">{t('templates.fieldDailyReport.completed')}</div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-sky-900 text-white">
            <tr>
              <th className="p-2">{t('templates.fieldDailyReport.colItemDescription')}</th>
              <th className="p-2 text-right">{t('templates.fieldDailyReport.colTargetQty')}</th>
              <th className="p-2">{t('templates.fieldDailyReport.colUnit')}</th>
              <th className="p-2 text-right">{t('templates.fieldDailyReport.colInstalledToday')}</th>
              <th className="p-2 text-right">{t('templates.fieldDailyReport.colCumulativeQty')}</th>
              <th className="p-2 text-center">{t('templates.fieldDailyReport.colQcSign')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bySystem.flatMap((s) => s.items).map((it, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="p-2 font-medium text-slate-900">{it.description} ({it.sizeSpec})</td>
                <td className="p-2 text-right font-mono">{formatNumber(it.quantity, 0)}</td>
                <td className="p-2 text-slate-500">{it.unit}</td>
                <td className="p-2 text-right border-l border-r border-slate-200 bg-slate-50/50" />
                <td className="p-2 text-right border-r border-slate-200" />
                <td className="p-2 text-center text-slate-300">[ &nbsp; &nbsp; ]</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
