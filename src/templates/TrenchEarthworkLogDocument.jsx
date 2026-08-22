import React from 'react';
import { formatCurrency, formatNumber } from '../lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 11. Trench & Earthwork Engineering Log Layout
 */
export default function TrenchEarthworkLogDocument({ estimate, branding, currentProject }) {
  const { bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Earthwork &amp; Trench Log" project={currentProject} />

      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">Trench Width Assumption</span>
          <p className="font-bold text-slate-900">3.0 LF Standard</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">Average Cover Depth</span>
          <p className="font-bold text-slate-900">6.0 LF Invert</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">Native Swell Factor</span>
          <p className="font-bold text-slate-900">1.25x Loose</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">Trench Safety</span>
          <p className="font-bold text-slate-900">OSHA Type B Box</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-amber-950 text-white">
            <tr>
              <th className="p-2.5">Trench Line</th>
              <th className="p-2.5 text-right">Length (LF)</th>
              <th className="p-2.5 text-right">Trench Vol (CY)</th>
              <th className="p-2.5 text-right">Bedding Stone (TN)</th>
              <th className="p-2.5 text-right">Backfill &amp; Haul</th>
              <th className="p-2.5 text-right">Direct Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.flatMap((s) => s.items).map((it, idx) => {
              const lf = it.unit?.toLowerCase().includes('lf') || it.unit?.toLowerCase().includes('ft') ? it.quantity : it.quantity * 10;
              const cy = (lf * 3.0 * 6.0) / 27;
              const stone = cy * 0.35 * 1.4;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-medium text-slate-900">{it.description} ({it.sizeSpec})</td>
                  <td className="p-2.5 text-right">{formatNumber(lf, 0)}</td>
                  <td className="p-2.5 text-right text-amber-900 font-bold">{formatNumber(cy, 1)} CY</td>
                  <td className="p-2.5 text-right">{formatNumber(stone, 1)} TN</td>
                  <td className="p-2.5 text-right">{formatNumber(cy * 0.65, 1)} CY</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(it.directCost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
