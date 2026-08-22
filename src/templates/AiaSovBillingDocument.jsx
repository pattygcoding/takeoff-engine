import React from 'react';
import { formatCurrency } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 12. AIA G702/G703 SOV Billing Layout
 */
export default function AiaSovBillingDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6 font-mono">
      <DocumentBrandingHeader branding={branding} title="AIA G702 / G703 Schedule of Values" project={currentProject} />

      <div className="border-2 border-slate-900 rounded-xl overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white uppercase text-[10px]">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2 font-sans">Description of Work</th>
              <th className="p-2 text-right">Scheduled Value</th>
              <th className="p-2 text-right">Work Done</th>
              <th className="p-2 text-right">Stored Mat</th>
              <th className="p-2 text-right">Total %</th>
              <th className="p-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {bySystem.map((sys, idx) => {
              const sysVal = sys.factoredBid ?? sys.directCost;
              return (
                <tr key={sys.system} className="hover:bg-slate-50">
                  <td className="p-2 font-bold">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="p-2 font-sans font-medium text-slate-900">{sys.system} Package</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(sysVal)}</td>
                  <td className="p-2 text-right text-slate-500">$0.00</td>
                  <td className="p-2 text-right text-slate-500">$0.00</td>
                  <td className="p-2 text-right text-slate-500">0.0%</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(sysVal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
            <tr>
              <td colSpan={2} className="p-2.5 font-sans uppercase">Total Scheduled Values:</td>
              <td className="p-2.5 text-right text-indigo-900">{formatCurrency(totals.finalBidAmount)}</td>
              <td className="p-2.5 text-right">$0.00</td>
              <td className="p-2.5 text-right">$0.00</td>
              <td className="p-2.5 text-right">0.0%</td>
              <td className="p-2.5 text-right text-indigo-900">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
