import React from 'react';
import { formatCurrency } from '../lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 3. Executive Proposal Document Layout
 */
export default function ExecutiveProposalDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b-4 border-emerald-600 pb-4">
        <DocumentBrandingHeader branding={branding} title="Executive Bid Submittal" project={currentProject} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl md:col-span-2">
          <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">Contractor Scope Guarantee</h4>
          <p className="text-xs text-emerald-800 leading-relaxed">
            All work executed under OSHA safety protocols, city standard specifications, and manufacturer guidelines. Bid includes field survey verification, traffic control coordination, and final inspection sign-off.
          </p>
        </div>
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Contract Value</span>
          <span className="text-xl font-bold text-emerald-400">{formatCurrency(totals.finalBidAmount)}</span>
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-emerald-800 text-white">
            <tr>
              <th className="p-3">System / Phase</th>
              <th className="p-3">Primary Inclusions</th>
              <th className="p-3 text-right">Items Count</th>
              <th className="p-3 text-right">Lump Sum Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bySystem.map((sys) => (
              <tr key={sys.system} className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">{sys.system}</td>
                <td className="p-3 text-slate-600">
                  {sys.items.map((i) => i.description).slice(0, 3).join(', ')}
                  {sys.items.length > 3 ? '...' : ''}
                </td>
                <td className="p-3 text-right font-mono">{sys.items.length}</td>
                <td className="p-3 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(sys.factoredBid ?? sys.directCost)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={3} className="p-3 text-right text-slate-700">Total Lump Sum Bid:</td>
              <td className="p-3 text-right text-emerald-700 font-mono text-sm">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
