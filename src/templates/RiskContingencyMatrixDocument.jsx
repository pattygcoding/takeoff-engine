import React from 'react';
import { formatCurrency } from '../lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 15. Risk & Contingency Matrix Layout
 */
export default function RiskContingencyMatrixDocument({ estimate, branding, currentProject, rates }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Risk &amp; Contingency Matrix" project={currentProject} />

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-rose-950 text-white">
            <tr>
              <th className="p-2.5">System</th>
              <th className="p-2.5">Subsurface Risk Profile</th>
              <th className="p-2.5 text-center">Risk Level</th>
              <th className="p-2.5 text-right">Base Direct</th>
              <th className="p-2.5 text-right">Contingency Buffer ({rates?.contingencyPercent || 5}%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.map((sys, idx) => {
              const cont = sys.directCost * ((rates?.contingencyPercent || 5) / 100);
              const isHigh = idx === 0;
              return (
                <tr key={sys.system} className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-bold text-slate-900">{sys.system}</td>
                  <td className="p-2.5 font-sans text-slate-600">
                    {isHigh ? 'High utility congestion / unknown crossing' : 'Standard trench / low groundwater probability'}
                  </td>
                  <td className="p-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${isHigh ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {isHigh ? 'HIGH' : 'MODERATE'}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">{formatCurrency(sys.directCost)}</td>
                  <td className="p-2.5 text-right font-bold text-rose-900">{formatCurrency(cont)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={3} className="p-2.5 font-sans text-slate-700">Total Allocated Risk Reserves:</td>
              <td className="p-2.5 text-right font-mono">{formatCurrency(totals.totalDirectCost)}</td>
              <td className="p-2.5 text-right font-mono text-rose-900">{formatCurrency(totals.contingencyCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
