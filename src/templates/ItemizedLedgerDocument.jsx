import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 4. Itemized Job-Cost Ledger Document Layout
 */
export default function ItemizedLedgerDocument({ estimate, branding, currentProject, rates }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Granular Job-Cost Ledger" project={currentProject} />

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2">Spec</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2">Unit</th>
              <th className="p-2 text-right">Mat $</th>
              <th className="p-2 text-right">Hrs</th>
              <th className="p-2 text-right">Labor $</th>
              <th className="p-2 text-right">Equip $</th>
              <th className="p-2 text-right">Total $</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.flatMap((s) => s.items).map((it, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="p-2 font-sans font-medium text-slate-900">{it.description}</td>
                <td className="p-2 font-sans text-slate-500">{it.sizeSpec}</td>
                <td className="p-2 text-right">{formatNumber(it.quantity, 0)}</td>
                <td className="p-2 font-sans text-slate-500">{it.unit}</td>
                <td className="p-2 text-right">{formatCurrency(it.materialCost)}</td>
                <td className="p-2 text-right">{formatNumber(it.laborHours)}</td>
                <td className="p-2 text-right">{formatCurrency(it.laborCost)}</td>
                <td className="p-2 text-right">{formatCurrency((rates?.excavatorHourlyRate || 0) * (it.laborHours * 0.4))}</td>
                <td className="p-2 text-right font-bold text-slate-900">{formatCurrency(it.directCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">Overhead ({rates?.overheadPercent || 10}%)</span>
          <p className="font-bold text-slate-900">{formatCurrency(totals.overheadCost)}</p>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">Profit Margin ({rates?.profitMarginPercent || 15}%)</span>
          <p className="font-bold text-slate-900">{formatCurrency(totals.profitAmount)}</p>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[10px]">Contingency ({rates?.contingencyPercent || 5}%)</span>
          <p className="font-bold text-slate-900">{formatCurrency(totals.contingencyCost)}</p>
        </div>
        <div>
          <span className="text-indigo-600 font-bold uppercase text-[10px]">Final Bid Amount</span>
          <p className="font-bold text-indigo-700 text-sm">{formatCurrency(totals.finalBidAmount)}</p>
        </div>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
