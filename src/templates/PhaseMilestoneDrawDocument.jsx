import React from 'react';
import { formatCurrency } from '@/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 14. Phase Milestone Draw Schedule Layout
 */
export default function PhaseMilestoneDrawDocument({ estimate, branding, currentProject }) {
  const { totals } = estimate;
  const milestones = [
    { name: 'Mobilization & Material Submittals', pct: 0.15, desc: 'Shop drawings, agency permits & site prep' },
    { name: 'Trench Excavation & Deep Inverts', pct: 0.35, desc: 'Underground utility trenching & pipe install' },
    { name: 'Appurtenance & Structure Tie-Ins', pct: 0.30, desc: 'Manholes, valves, hydrants & backfill compaction' },
    { name: 'Pressure Testing & Final Acceptance', pct: 0.20, desc: 'Hydrostatic tests, mandrel pull & punchlist' },
  ];

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Phase Milestone Draw Schedule" project={currentProject} />

      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-violet-900 text-white uppercase text-[10px]">
            <tr>
              <th className="p-3">Draw #</th>
              <th className="p-3">Milestone Deliverable</th>
              <th className="p-3">Verification Criteria</th>
              <th className="p-3 text-right">% Draw</th>
              <th className="p-3 text-right">Payment Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {milestones.map((m, idx) => {
              const amount = totals.finalBidAmount * m.pct;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-violet-700">0{idx + 1}</td>
                  <td className="p-3 font-bold text-slate-900">{m.name}</td>
                  <td className="p-3 text-slate-600">{m.desc}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">{(m.pct * 100).toFixed(0)}%</td>
                  <td className="p-3 text-right font-mono font-bold text-violet-900">{formatCurrency(amount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
            <tr>
              <td colSpan={3} className="p-3 text-right text-slate-700">Total Contract Draws:</td>
              <td className="p-3 text-right font-mono">100%</td>
              <td className="p-3 text-right font-mono text-violet-900 text-sm">{formatCurrency(totals.finalBidAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} clientSignBlock />
    </div>
  );
}
