import React from 'react';
import { formatCurrency } from '../lib/calculations';
import { DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 13. Owner-Contractor Formal Agreement Layout
 */
export default function FormalContractAgreementDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6 font-serif">
      <div className="text-center border-b-2 border-slate-900 pb-4">
        <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">Construction Services Agreement</h2>
        <p className="text-xs text-slate-600 font-sans mt-1">Contract Document &amp; Formal Terms of Engagement</p>
      </div>

      <div className="space-y-3 text-xs text-slate-800 leading-relaxed font-sans">
        <p>
          This Agreement is entered into on this <strong>{new Date().toLocaleDateString()}</strong> by and between{' '}
          <strong>{branding?.companyName || 'Contractor'}</strong> (&ldquo;Contractor&rdquo;) and{' '}
          <strong>{currentProject?.client_name || 'Client / Owner'}</strong> (&ldquo;Owner&rdquo;) for utility and civil infrastructure services located at{' '}
          <strong>{currentProject?.location || 'Designated Job Site'}</strong>.
        </p>
        <p>
          <strong>1. Total Contract Value:</strong> In consideration for full performance of scopes itemized herein, Owner agrees to pay Contractor the fixed lump sum of{' '}
          <span className="font-bold font-mono text-emerald-800">{formatCurrency(totals.finalBidAmount)}</span>.
        </p>
        <p>
          <strong>2. Scope of Work:</strong> Scope encompasses all labor, equipment, trenching, piping, backfill, and quality control tests for{' '}
          <strong>{bySystem.map((s) => s.system).join(', ')}</strong> per engineering specifications.
        </p>
        <p>
          <strong>3. Payment Schedule:</strong> Progressive monthly billing based on approved Schedule of Values with 10% retainage withheld until final agency signoff.
        </p>
      </div>

      <div className="border border-slate-300 rounded-xl overflow-hidden font-sans">
        <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">Contract Phase Summary</div>
        <table className="w-full text-left text-xs">
          <tbody className="divide-y divide-slate-200">
            {bySystem.map((s) => (
              <tr key={s.system}>
                <td className="p-2.5 font-bold text-slate-800">{s.system}</td>
                <td className="p-2.5 text-slate-500">{s.items.length} Work Items</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(s.factoredBid ?? s.directCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={2} className="p-2.5 text-slate-700 uppercase tracking-wider text-[11px]">Total Lump Sum Contract:</td>
              <td className="p-2.5 text-right font-mono text-emerald-800 text-sm">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
