import React from 'react';
import { formatCurrency, formatNumber } from '../lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 8. Material Purchase & Supply Order Layout
 */
export default function MaterialProcurementDocument({ estimate, branding, currentProject }) {
  const { totals, bySystem } = estimate;

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title="Material Purchase &amp; Supply Order" project={currentProject} />

      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex justify-between items-center">
        <span><strong>Vendor Note:</strong> Please verify spec tolerances and deliver in order of phase sequencing.</span>
        <span className="font-mono font-bold bg-blue-100 px-2 py-0.5 rounded">PO-REQ-{Date.now().toString().slice(-6)}</span>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-2.5">Item Description</th>
              <th className="p-2.5">Material Spec</th>
              <th className="p-2.5 text-right">Order Qty</th>
              <th className="p-2.5">Unit</th>
              <th className="p-2.5 text-right">Est. Unit Mat</th>
              <th className="p-2.5 text-right">Total Material</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.flatMap((s) => s.items).map((it, idx) => {
              const unitMat = it.quantity > 0 ? it.materialCost / it.quantity : 0;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-medium text-slate-900">{it.description}</td>
                  <td className="p-2.5 font-sans text-slate-500">{it.sizeSpec}</td>
                  <td className="p-2.5 text-right font-bold">{formatNumber(it.quantity, 0)}</td>
                  <td className="p-2.5 font-sans text-slate-600">{it.unit}</td>
                  <td className="p-2.5 text-right">{formatCurrency(unitMat)}</td>
                  <td className="p-2.5 text-right font-bold text-blue-900">{formatCurrency(it.materialCost)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 border-t border-slate-300 font-bold">
            <tr>
              <td colSpan={5} className="p-2.5 text-right text-slate-700">Total Material Purchase Commitment:</td>
              <td className="p-2.5 text-right font-mono text-blue-800">{formatCurrency(totals.totalMaterialCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
