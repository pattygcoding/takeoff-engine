import React from 'react';
import { formatCurrency } from '@/lib/calculations';
import { DocumentSignOff } from './DocumentHeaderSignoff';

/**
 * 17. Substantial Completion & Warranty Certificate Layout
 */
export default function WarrantyCloseoutCertDocument({ estimate, branding, currentProject }) {
  const { totals } = estimate;

  return (
    <div className="space-y-6 font-serif text-center py-4">
      <div className="border-4 border-double border-amber-600 p-8 rounded-3xl bg-amber-50/20 space-y-5">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
          ★
        </div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-amber-950">
          Certificate of Substantial Completion &amp; Warranty
        </h2>
        <p className="text-xs text-slate-600 font-sans max-w-lg mx-auto leading-relaxed">
          This document certifies that the utility and civil construction work on{' '}
          <strong>{currentProject?.name || 'Utility Project'}</strong> has been inspected, tested, and substantially completed in accordance with contract standards.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-xs font-sans text-left bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
          <div><span className="text-slate-400 font-bold">Contractor:</span><p className="font-bold text-slate-900">{branding?.companyName || 'Takeoff Contractor'}</p></div>
          <div><span className="text-slate-400 font-bold">Client:</span><p className="font-bold text-slate-900">{currentProject?.client_name || 'Project Owner'}</p></div>
          <div><span className="text-slate-400 font-bold">Warranty Period:</span><p className="font-bold text-emerald-700">1-Year Full Coverage</p></div>
          <div><span className="text-slate-400 font-bold">Certified Value:</span><p className="font-bold font-mono text-slate-900">{formatCurrency(totals.finalBidAmount)}</p></div>
        </div>

        <p className="text-[11px] text-slate-500 font-sans italic max-w-md mx-auto">
          Warranty covers pipe joint integrity, structural backfill compaction, and valve operations against defects in workmanship for 365 calendar days from issuance.
        </p>

        <div className="pt-6 border-t border-amber-300/80 font-sans">
          <DocumentSignOff branding={branding} clientSignBlock />
        </div>
      </div>
    </div>
  );
}
