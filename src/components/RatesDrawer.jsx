export default function RatesDrawer({ open, onClose, rates, onChange }) {
  const update = (field) => (e) => {
    const value = e.target.value;
    onChange({ ...rates, [field]: value === '' ? '' : Number(value) });
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-20" onClick={onClose} />}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-30 transform transition-transform overflow-y-auto
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Pricing & Markup Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" type="button">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Base Labor Rate</h3>
            <Field label="Base Labor Hourly Rate ($/hr)" value={rates.laborHourlyRate} onChange={update('laborHourlyRate')} />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Trenching & Earthwork</h3>
            <Field label="Trench Width (ft)" value={rates.trenchWidthFt} onChange={update('trenchWidthFt')} />
            <p className="text-xs text-slate-400 mt-1">
              Trench volume = quantity (LF) × avg depth (ft) × trench width (ft), for LF items only.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Markup & Business Constants</h3>
            <Field label="Overhead %" value={rates.overheadPct} onChange={update('overheadPct')} suffix="%" />
            <Field label="Contingency / Risk %" value={rates.contingencyPct} onChange={update('contingencyPct')} suffix="%" />
            <Field label="Profit Margin %" value={rates.profitPct} onChange={update('profitPct')} suffix="%" />
            <Field
              label="Mobilization / Equipment ($)"
              value={rates.equipmentLumpSum}
              onChange={update('equipmentLumpSum')}
              prefix="$"
            />
          </section>
        </div>
      </aside>
    </>
  );
}

function Field({ label, value, onChange, prefix, suffix }) {
  return (
    <label className="block mb-4">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="mt-1 flex items-center rounded-md border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden">
        {prefix && <span className="pl-3 text-slate-400 text-sm">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 text-sm outline-none"
          step="any"
        />
        {suffix && <span className="pr-3 text-slate-400 text-sm">{suffix}</span>}
      </div>
    </label>
  );
}
