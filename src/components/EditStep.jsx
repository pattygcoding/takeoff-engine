import { useState } from 'react';
import TakeoffGrid from './TakeoffGrid';
import RatesDrawer from './RatesDrawer';

export default function EditStep({ items, onItemsChange, rates, onRatesChange, onCalculate }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit & Review Takeoff</h1>
          <p className="text-slate-500 text-sm mt-1">
            Adjust quantities, add missing items, and set unit pricing before generating your proposal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
            />
          </svg>
          Pricing & Markup
        </button>
      </div>

      <TakeoffGrid items={items} onChange={onItemsChange} />

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onCalculate}
          disabled={items.length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          Calculate & Generate Proposal
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
      />
    </div>
  );
}
