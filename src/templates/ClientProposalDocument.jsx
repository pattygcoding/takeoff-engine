import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 2. Standard Client Proposal Document Layout
 */
export default function ClientProposalDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Bid Proposal &amp; Scope of Work" project={currentProject} />

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
        We are pleased to submit our formal proposal for utility and civil construction scope outlined below. All pricing reflects complete materials, certified labor, equipment installation, site mobilization, and quality testing per project specifications.
      </div>

      <div className="space-y-4">
        {bySystem.map((sys) => (
          <div key={sys.system} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider">{sys.system} Scope</h3>
              <span className="text-xs font-bold font-mono">{formatCurrency(sys.factoredBid ?? sys.directCost)}</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Scope Item Description</th>
                  <th className="p-2.5">Size / Material Spec</th>
                  <th className="p-2.5 text-right">Plan Qty</th>
                  <th className="p-2.5">Unit</th>
                  <th className="p-2.5 text-right">Extended Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sys.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{it.description}</td>
                    <td className="p-2.5 text-slate-500">{it.sizeSpec}</td>
                    <td className="p-2.5 text-right font-mono">{formatNumber(it.quantity, 0)}</td>
                    <td className="p-2.5 text-slate-500">{it.unit}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(it.factoredPrice ?? it.directCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <div className="w-full sm:w-80 bg-slate-900 text-white rounded-2xl p-4">
          <div className="flex justify-between text-xs text-slate-300 pb-1.5 border-b border-slate-800">
            <span>Total Base Bid</span>
            <span>{formatCurrency(totals.finalBidAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-white pt-2">
            <span>Total Lump Sum</span>
            <span className="text-emerald-400">{formatCurrency(totals.finalBidAmount)}</span>
          </div>
        </div>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
