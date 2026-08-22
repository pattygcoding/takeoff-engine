import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 9. Crew & Equipment Production Schedule Layout
 */
export default function CrewProductionScheduleDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Crew &amp; Equipment Production Schedule" project={currentProject} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-orange-600">Total Field Hours</span>
          <p className="text-base font-bold text-orange-950">{formatNumber(totals.totalLaborHours)} Man-Hours</p>
        </div>
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-500">Est. 4-Man Crew Days</span>
          <p className="text-base font-bold text-slate-900">{formatNumber(totals.totalLaborHours / 32, 1)} Days</p>
        </div>
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-500">Heavy Machine Hours</span>
          <p className="text-base font-bold text-slate-900">{formatNumber(totals.totalLaborHours * 0.5, 1)} Mach-Hrs</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-2.5">Phase / System</th>
              <th className="p-2.5 text-right">Production Hrs</th>
              <th className="p-2.5 text-right">Crew Days (4-Man)</th>
              <th className="p-2.5 text-right">Excavator Util.</th>
              <th className="p-2.5 text-right">Labor Budget</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bySystem.map((sys) => {
              const sysHrs = sys.items.reduce((sum, i) => sum + (i.laborHours || 0), 0);
              const sysLabor = sys.items.reduce((sum, i) => sum + (i.laborCost || 0), 0);
              return (
                <tr key={sys.system} className="hover:bg-slate-50 font-mono">
                  <td className="p-2.5 font-sans font-bold text-slate-900">{sys.system}</td>
                  <td className="p-2.5 text-right">{formatNumber(sysHrs)} hrs</td>
                  <td className="p-2.5 text-right">{formatNumber(sysHrs / 32, 1)} d</td>
                  <td className="p-2.5 text-right">{formatNumber(sysHrs * 0.4, 1)} hrs</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(sysLabor)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td className="p-2.5 text-slate-700 font-sans">Total Field Labor:</td>
              <td className="p-2.5 text-right font-mono">{formatNumber(totals.totalLaborHours)} hrs</td>
              <td className="p-2.5 text-right font-mono">{formatNumber(totals.totalLaborHours / 32, 1)} days</td>
              <td className="p-2.5 text-right font-mono">{formatNumber(totals.totalLaborHours * 0.4, 1)} hrs</td>
              <td className="p-2.5 text-right font-mono text-orange-800">{formatCurrency(totals.totalLaborCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
