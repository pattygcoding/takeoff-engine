import React, { useState } from 'react';
import { TARGET_FIELDS, normalizeRowsWithMapping, saveVendorPreset, getSavedVendorPresets } from '../lib/csv';

export default function ColumnMappingModal({
  headers,
  rawRows,
  initialMapping,
  matchConfidences = {},
  overallConfidence = 0,
  sheetNames = [],
  activeSheetName = '',
  onSheetChange,
  onConfirm,
  onCancel,
}) {
  const [mapping, setMapping] = useState({ ...initialMapping });
  const [validationError, setValidationError] = useState('');
  const [presetName, setPresetName] = useState('');
  const [showPresetSaved, setShowPresetSaved] = useState(false);
  const [savedPresets, setSavedPresets] = useState(() => getSavedVendorPresets());

  const handleChange = (targetKey, selectedCol) => {
    setMapping((prev) => ({
      ...prev,
      [targetKey]: selectedCol || undefined,
    }));
  };

  const handleApplyPreset = (name) => {
    if (savedPresets[name]) {
      setMapping((prev) => ({ ...prev, ...savedPresets[name] }));
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    saveVendorPreset(presetName.trim(), mapping);
    setSavedPresets(getSavedVendorPresets());
    setShowPresetSaved(true);
    setTimeout(() => setShowPresetSaved(false), 2500);
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

    const { items, errors, checksum } = normalizeRowsWithMapping(rawRows, mapping);
    if (items.length === 0 && errors.length > 0) {
      setValidationError(`Could not parse rows with this mapping: ${errors[0]}`);
      return;
    }

    onConfirm({ items, errors, checksum });
  };

  // Compute live 5-row preview with current mapping
  const previewRows = (rawRows || []).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 border border-slate-200 max-h-[90vh] flex flex-col my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
              🔀
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Match Spreadsheet Columns</h3>
              <p className="text-xs text-slate-500">
                Auto-detection confidence: <strong className="text-indigo-600">{Math.round(overallConfidence * 100)}%</strong>. Confirm or remap columns:
              </p>
            </div>
          </div>

          {/* Multi-tab sheet selector if Excel workbook */}
          {sheetNames.length > 1 && onSheetChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Sheet Tab:</span>
              <select
                value={activeSheetName}
                onChange={(e) => onSheetChange(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-700"
              >
                {sheetNames.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {validationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            ✕ {validationError}
          </div>
        )}

        <div className="overflow-y-auto flex-1 my-4 pr-1 space-y-6">
          {/* Presets Bar */}
          {Object.keys(savedPresets).length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold text-slate-700">Saved Presets:</span>
              {Object.keys(savedPresets).map((presetKey) => (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => handleApplyPreset(presetKey)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 border border-slate-300 rounded-lg transition font-medium text-[11px]"
                >
                  {presetKey}
                </button>
              ))}
            </div>
          )}

          {/* Column Mapping Selectors */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {TARGET_FIELDS.map((field) => {
              const confidence = matchConfidences[field.key];
              return (
                <div
                  key={field.key}
                  className="p-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </span>
                      {confidence !== undefined && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                            confidence >= 0.95
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : confidence >= 0.8
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {Math.round(confidence * 100)}% match
                        </span>
                      )}
                    </div>
                    <span className="block text-[11px] text-slate-400">
                      {field.description || (field.required ? 'Required column' : 'Optional')}
                    </span>
                  </div>

                  <div className="w-64">
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
              );
            })}
          </div>

          {/* Live Data Preview Table (5 rows) */}
          {previewRows.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Live 5-Row Preview</h4>
              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-slate-50 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/80">
                      <th className="p-2 text-slate-600 font-semibold">System</th>
                      <th className="p-2 text-slate-600 font-semibold">Description</th>
                      <th className="p-2 text-slate-600 font-semibold">Size / Spec</th>
                      <th className="p-2 text-slate-600 font-semibold">Quantity</th>
                      <th className="p-2 text-slate-600 font-semibold">Unit</th>
                      <th className="p-2 text-slate-600 font-semibold">Depth (FT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 bg-white">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-2 text-slate-700 font-mono text-[11px] truncate max-w-[120px]">
                          {mapping.system ? String(row[mapping.system] ?? '-') : '-'}
                        </td>
                        <td className="p-2 text-slate-700 font-medium truncate max-w-[180px]">
                          {mapping.item_description ? String(row[mapping.item_description] ?? '-') : '-'}
                        </td>
                        <td className="p-2 text-slate-600 text-[11px] truncate max-w-[120px]">
                          {mapping.size_spec ? String(row[mapping.size_spec] ?? '-') : '-'}
                        </td>
                        <td className="p-2 text-slate-900 font-bold font-mono">
                          {mapping.quantity ? String(row[mapping.quantity] ?? '-') : '-'}
                        </td>
                        <td className="p-2 text-slate-600 text-[11px]">
                          {mapping.unit ? String(row[mapping.unit] ?? '-') : '-'}
                        </td>
                        <td className="p-2 text-slate-500 font-mono text-[11px]">
                          {mapping.avg_depth_ft ? String(row[mapping.avg_depth_ft] ?? '0') : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preset Save Section */}
          <div className="flex items-center gap-2 pt-2 text-xs">
            <span className="text-slate-500 font-medium">Save as vendor preset:</span>
            <input
              type="text"
              placeholder="e.g. Subcontractor ABC"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none w-44"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
            >
              Save Preset
            </button>
            {showPresetSaved && (
              <span className="text-emerald-600 font-medium text-[11px]">✓ Saved!</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
          >
            Confirm &amp; Import Takeoff
          </button>
        </div>
      </div>
    </div>
  );
}
