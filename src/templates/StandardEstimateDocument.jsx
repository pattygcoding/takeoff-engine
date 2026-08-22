import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 1. Internal Cost Estimate Document Layout
 */
export default function StandardEstimateDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Internal Cost Estimate" project={currentProject} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Direct</span>
          <p className="text-base font-bold text-slate-900">{formatCurrency(totals.totalDirectCost)}</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Labor Hours</span>
          <p className="text-base font-bold text-slate-900">{formatNumber(totals.totalLaborHours)} hrs</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-400">Markup &amp; Cont.</span>
          <p className="text-base font-bold text-slate-900">
            {formatCurrency(totals.overheadCost + totals.profitAmount + totals.contingencyCost)}
          </p>
        </div>
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-indigo-500">Total Bid Amount</span>
          <p className="text-base font-bold text-indigo-700">{formatCurrency(totals.finalBidAmount)}</p>
        </div>
      </div>

      <div className="space-y-5">
        {bySystem.map((sys) => (
          <div key={sys.system} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{sys.system}</h3>
              <span className="text-xs font-bold text-slate-900">{formatCurrency(sys.directCost)}</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5">Spec</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5 text-right">Material</th>
                  <th className="p-2.5 text-right">Labor Hrs</th>
                  <th className="p-2.5 text-right">Labor $</th>
                  <th className="p-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sys.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{it.description}</td>
                    <td className="p-2.5 text-slate-500">{it.sizeSpec}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.quantity, 0)}</td>
                    <td className="p-2.5 text-slate-500">{it.unit}</td>
                    <td className="p-2.5 text-right font-mono">{formatCurrency(it.materialCost)}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.laborHours)}</td>
                    <td className="p-2.5 text-right font-mono">{formatCurrency(it.laborCost)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.directCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
