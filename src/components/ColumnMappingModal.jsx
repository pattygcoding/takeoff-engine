import React, { useState } from 'react';
import { TARGET_FIELDS, normalizeRowsWithMapping } from '../lib/csv';

export default function ColumnMappingModal({
  headers,
  rawRows,
  initialMapping,
  onConfirm,
  onCancel,
}) {
  const [mapping, setMapping] = useState({ ...initialMapping });
  const [validationError, setValidationError] = useState('');

  const handleChange = (targetKey, selectedCol) => {
    setMapping((prev) => ({
      ...prev,
      [targetKey]: selectedCol || undefined,
    }));
  };

  const handleApply = (e) => {
    e.preventDefault();
    setValidationError('');

    // Verify all required fields have a selection
    const missing = TARGET_FIELDS.filter((f) => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      setValidationError(
        `Please select a column for required field(s): ${missing.map((m) => m.label).join(', ')}`
      );
      return;
    }

    const { items, errors } = normalizeRowsWithMapping(rawRows, mapping);
    if (items.length === 0 && errors.length > 0) {
      setValidationError(`Could not parse rows with this mapping: ${errors[0]}`);
      return;
    }

    onConfirm({ items, errors });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
            🔀
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Match Spreadsheet Columns</h3>
            <p className="text-xs text-slate-500">
              We detected custom headers in your file. Match them to Takeoff Engine fields:
            </p>
          </div>
        </div>

        {validationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            ✕ {validationError}
          </div>
        )}

        <form onSubmit={handleApply} className="space-y-4 my-6">
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {TARGET_FIELDS.map((field) => (
              <div
                key={field.key}
                className="p-3.5 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {field.required ? 'Required column' : 'Optional (defaults to 0 if omitted)'}
                  </span>
                </div>

                <div className="w-56">
                  <select
                    value={mapping[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs bg-white border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                      mapping[field.key]
                        ? 'border-indigo-300 font-semibold text-indigo-900'
                        : field.required
                        ? 'border-amber-300 text-amber-900'
                        : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    <option value="">-- Select File Column --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
            >
              Confirm &amp; Import Takeoff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
