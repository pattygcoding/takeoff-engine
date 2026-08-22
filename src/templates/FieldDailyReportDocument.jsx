import React from 'react';
import { formatNumber } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 16. Field Superintendent QA Log Layout
 */
export default function FieldDailyReportDocument({ estimate, branding, currentProject }) {
  const { bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Field Superintendent QA Log" project={currentProject} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-slate-200 rounded-xl p-3 bg-slate-50">
        <div><span className="text-slate-400 font-bold">Weather / Temp:</span><div className="border-b border-slate-300 mt-2 h-4" /></div>
        <div><span className="text-slate-400 font-bold">Superintendent:</span><div className="border-b border-slate-300 mt-2 h-4" /></div>
        <div><span className="text-slate-400 font-bold">City Inspector:</span><div className="border-b border-slate-300 mt-2 h-4" /></div>
        <div><span className="text-slate-400 font-bold">Daily Safety Talk:</span><div className="text-emerald-700 font-bold mt-1">✓ Completed</div></div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-sky-900 text-white">
            <tr>
              <th className="p-2">Item Description</th>
              <th className="p-2 text-right">Target Qty</th>
              <th className="p-2">Unit</th>
              <th className="p-2 text-right">Installed Today</th>
              <th className="p-2 text-right">Cumulative Qty</th>
              <th className="p-2 text-center">QC Sign</th>
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
