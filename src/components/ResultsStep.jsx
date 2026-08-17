import { useMemo, useState } from 'react';
import { computeEstimate, formatCurrency, formatNumber } from '../lib/calculations';
import { triggerDownload } from '../lib/csv';
import Papa from 'papaparse';

export default function ResultsStep({ items, rates, onBack }) {
  const [proposalMode, setProposalMode] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const estimate = useMemo(() => computeEstimate(items, rates), [items, rates]);
  const { totals, bySystem } = estimate;

  const exportCsv = () => {
    const rows = bySystem.flatMap((sys) =>
      sys.items.map((item) => ({
        System: item.system,
        Description: item.description,
        'Size/Spec': item.sizeSpec,
        Quantity: item.quantity,
        Unit: item.unit,
        ...(proposalMode
          ? { 'Line Total': (item.directCost).toFixed(2) }
          : {
              'Material Cost': item.materialCost.toFixed(2),
              'Labor Hours': item.laborHours.toFixed(2),
              'Labor Cost': item.laborCost.toFixed(2),
              'Direct Cost': item.directCost.toFixed(2),
            }),
      }))
    );
    const csv = Papa.unparse(rows);
    triggerDownload(csv, proposalMode ? 'proposal_summary.csv' : 'internal_cost_breakdown.csv', 'text/csv');
  };

  const exportPdf = async () => {
    const node = document.getElementById('print-area');
    if (!node) return;
    setExportingPdf(true);
    try {
      // Lazily load these heavy libraries only when a PDF export is actually requested,
      // so they end up in a separate chunk instead of bloating the main bundle.
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
      pdf.save(proposalMode ? 'client_proposal.pdf' : 'internal_estimate.pdf');
    } finally {
      setExportingPdf(false);
    }

  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {proposalMode ? 'Client Proposal' : 'Internal Cost Breakdown'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {proposalMode
              ? 'Clean, client-facing summary ready to share or export.'
              : 'Full internal cost detail including markups and labor hours.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back to Edit
          </button>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 select-none cursor-pointer">
            <span>Client-Facing Proposal Mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={proposalMode}
              onClick={() => setProposalMode((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                proposalMode ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  proposalMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="no-print flex flex-wrap gap-3 mb-6">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Print / Save as PDF
        </button>
        <button
          type="button"
          onClick={exportPdf}
          disabled={exportingPdf}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-wait"
        >
          {exportingPdf ? 'Preparing PDF…' : 'Export PDF'}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Export CSV / Excel
        </button>
      </div>

      <div id="print-area" className="print-area bg-white rounded-lg border border-slate-200 p-6">
        {!proposalMode && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard label="Total Material Cost" value={formatCurrency(totals.totalMaterialCost)} />
            <SummaryCard
              label="Total Labor"
              value={formatCurrency(totals.totalLaborCost)}
              sub={`${formatNumber(totals.totalLaborHours)} hrs`}
            />
            <SummaryCard label="Equipment / Mobilization" value={formatCurrency(totals.equipmentLumpSum)} />
            <SummaryCard label="Total Direct Cost" value={formatCurrency(totals.totalDirectCost)} />
            <SummaryCard
              label={`Overhead (${totals.overheadPct}%)`}
              value={formatCurrency(totals.overheadAmount)}
            />
            <SummaryCard
              label={`Contingency (${totals.contingencyPct}%)`}
              value={formatCurrency(totals.contingencyAmount)}
            />
            <SummaryCard label={`Profit (${totals.profitPct}%)`} value={formatCurrency(totals.profitAmount)} />
            <SummaryCard label="Final Bid Amount" value={formatCurrency(totals.finalBidAmount)} highlight />
          </div>
        )}

        {proposalMode && (
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-wide text-slate-400 font-medium">Total Project Investment</p>
            <p className="text-4xl font-bold text-slate-900 mt-1">{formatCurrency(totals.finalBidAmount)}</p>
          </div>
        )}

        <div className="space-y-8">
          {bySystem.map((sys) => (
            <div key={sys.system}>
              <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-3">
                {sys.system}
              </h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-1 pr-3">Description</th>
                    <th className="py-1 pr-3">Size / Spec</th>
                    <th className="py-1 pr-3 text-right">Qty</th>
                    <th className="py-1 pr-3">Unit</th>
                    {!proposalMode && <th className="py-1 pr-3 text-right">Material</th>}
                    {!proposalMode && <th className="py-1 pr-3 text-right">Labor Hrs</th>}
                    {!proposalMode && <th className="py-1 pr-3 text-right">Labor $</th>}
                    <th className="py-1 pr-3 text-right">{proposalMode ? 'Line Total' : 'Direct Cost'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sys.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 pr-3">{item.description}</td>
                      <td className="py-1.5 pr-3 text-slate-500">{item.sizeSpec}</td>
                      <td className="py-1.5 pr-3 text-right">{formatNumber(item.quantity, 0)}</td>
                      <td className="py-1.5 pr-3">{item.unit}</td>
                      {!proposalMode && <td className="py-1.5 pr-3 text-right">{formatCurrency(item.materialCost)}</td>}
                      {!proposalMode && <td className="py-1.5 pr-3 text-right">{formatNumber(item.laborHours)}</td>}
                      {!proposalMode && <td className="py-1.5 pr-3 text-right">{formatCurrency(item.laborCost)}</td>}
                      <td className="py-1.5 pr-3 text-right font-medium">{formatCurrency(item.directCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t border-slate-200">
                    <td className="py-2 pr-3" colSpan={proposalMode ? 3 : 6}>
                      Subtotal
                    </td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(sys.directCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>

        {proposalMode && (
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end">
            <div className="w-full sm:w-64 text-right">
              <div className="flex justify-between text-slate-600 text-sm py-1">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.totalDirectCost)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                <span>Total Bid</span>
                <span>{formatCurrency(totals.finalBidAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, highlight }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? 'text-indigo-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
