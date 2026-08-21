import { useState } from 'react';
import TakeoffGrid from './TakeoffGrid';
import RatesDrawer from './RatesDrawer';

export default function EditStep({ items, onItemsChange, rates, onRatesChange, onCalculate, readOnly = false, projectStatus = 'awarded', onDuplicate }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const statusLabel =
    projectStatus === 'submitted'
      ? 'Submitted'
      : projectStatus === 'archived'
      ? 'Archived'
      : 'Awarded';

  const statusDescription =
    projectStatus === 'submitted'
      ? 'This project has been submitted to the client for review & signature. Figures are locked to maintain proposal integrity.'
      : projectStatus === 'archived'
      ? 'This project has been archived and is locked in read-only mode.'
      : 'This project has been marked as Awarded and is locked to protect the signed contract baseline.';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {readOnly && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">{statusLabel} Project (Locked - Read Only)</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {statusDescription}
              </p>
            </div>
          </div>
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate as New Revision
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {readOnly ? `View Takeoff (${statusLabel})` : 'Edit & Review Takeoff'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {readOnly
              ? `Review quantities and unit pricing for this ${statusLabel.toLowerCase()} project.`
              : 'Adjust quantities, add missing items, and set unit pricing before generating your proposal.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
          {readOnly ? 'View Pricing & Markup' : 'Pricing & Markup'}
        </button>
      </div>

      <TakeoffGrid items={items} onChange={onItemsChange} readOnly={readOnly} />

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onCalculate}
          disabled={items.length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
        >
          {readOnly ? 'View Estimate & Proposal' : 'Calculate & Generate Proposal'}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      <RatesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        rates={rates}
        onChange={onRatesChange}
        readOnly={readOnly}
      />
    </div>
  );
}
