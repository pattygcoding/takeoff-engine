import React, { useState, useMemo, useEffect } from 'react';
import {
  getTargetFields,
  normalizeRowsWithMapping,
  saveVendorPreset,
  getSavedVendorPresets,
  extractHeadersAndRowsAtHeaderRow,
  autoDetectColumnMapping,
} from '@/lib/csv';
import { useTranslation } from '@/context/I18nContext';

export default function ColumnMappingModal({
  headers: initialHeaders,
  rawRows: initialRawRows,
  initialMapping,
  matchConfidences: initialMatchConfidences = {},
  overallConfidence: initialOverallConfidence = 0,
  sampleMatrix = [],
  initialHeaderRowIndex = 0,
  sheetNames = [],
  activeSheetName = '',
  subTables = [],
  activeTableId = null,
  onSheetChange,
  onTableChange,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  const targetFields = useMemo(() => getTargetFields(t), [t]);

  const [headerRowIndex, setHeaderRowIndex] = useState(initialHeaderRowIndex);
  const [currentHeaders, setCurrentHeaders] = useState(initialHeaders || []);
  const [currentRawRows, setCurrentRawRows] = useState(initialRawRows || []);
  const [mapping, setMapping] = useState({ ...initialMapping });
  const [matchConfidences, setMatchConfidences] = useState({ ...initialMatchConfidences });
  const [overallConfidence, setOverallConfidence] = useState(initialOverallConfidence);
  const [validationError, setValidationError] = useState('');
  const [presetName, setPresetName] = useState('');
  const [showPresetSaved, setShowPresetSaved] = useState(false);
  const [savedPresets, setSavedPresets] = useState(() => getSavedVendorPresets());

  // Allow choosing header row among available matrix rows (up to 30 rows)
  const maxHeaderOptions = Math.min(sampleMatrix?.length || 1, 30);
  const headerRowOptions = Array.from({ length: maxHeaderOptions }, (_, i) => i);

  const handleHeaderRowChange = (newRowIndex) => {
    const rIdx = Number(newRowIndex);
    setHeaderRowIndex(rIdx);

    if (sampleMatrix && sampleMatrix.length > 0) {
      const { headers: newHeaders, rows: newRows } = extractHeadersAndRowsAtHeaderRow(sampleMatrix, rIdx);
      setCurrentHeaders(newHeaders);
      setCurrentRawRows(newRows);

      // Re-run auto-detection with newly extracted headers
      const { mapping: newAutoMapping, matchConfidences: newConfidences, overallConfidence: newOverallConf } =
        autoDetectColumnMapping(newHeaders, newRows);

      setMapping(newAutoMapping);
      setMatchConfidences(newConfidences);
      setOverallConfidence(newOverallConf);
    }
  };

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
    const missing = targetFields.filter((f) => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      setValidationError(
        t('columnMappingModal.validationErrorRequired', { fields: missing.map((m) => m.label).join(', ') })
      );
      return;
    }

    const { items, errors, checksum } = normalizeRowsWithMapping(currentRawRows, mapping, t);
    if (items.length === 0 && errors.length > 0) {
      setValidationError(t('columnMappingModal.validationErrorParsing', { error: errors[0] }));
      return;
    }

    onConfirm({ items, errors, checksum });
  };

  // Compute live 5-row preview with current mapping
  const previewRows = (currentRawRows || []).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 border border-slate-200 max-h-[90vh] flex flex-col my-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
              🔀
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{t('columnMappingModal.title')}</h3>
              <p className="text-xs text-slate-500">
                {t('columnMappingModal.confidenceLabel')} <strong className="text-indigo-600">{Math.round(overallConfidence * 100)}%</strong>. {t('columnMappingModal.confirmOrRemap')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Header Row Index selector */}
            {sampleMatrix && sampleMatrix.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-300 rounded-lg px-2 py-1">
                <span className="text-[11px] text-slate-700 font-semibold">
                  {t('columnMappingModal.headerRowLabel', 'Headers start on Row:')}
                </span>
                <select
                  value={headerRowIndex}
                  onChange={(e) => handleHeaderRowChange(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded px-1.5 py-0.5 font-bold text-slate-900"
                >
                  {headerRowOptions.map((r) => {
                    const previewText = (sampleMatrix[r] || [])
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(', ');
                    return (
                      <option key={r} value={r}>
                        {t('columnMappingModal.headerRowOption', { row: r + 1 })} {previewText ? `(${previewText.slice(0, 25)}...)` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Side-by-side table selector if multiple tables detected */}
            {subTables.length > 1 && onTableChange && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-indigo-700 font-bold">{t('columnMappingModal.subTableSelect', 'Table Area:')}</span>
                <select
                  value={activeTableId || subTables[0]?.id}
                  onChange={(e) => onTableChange(e.target.value)}
                  className="text-xs bg-indigo-50 border border-indigo-300 rounded-lg px-2 py-1 font-bold text-indigo-900"
                >
                  {subTables.map((tb) => (
                    <option key={tb.id} value={tb.id}>
                      {tb.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Multi-tab sheet selector if Excel workbook */}
            {sheetNames.length > 1 && onSheetChange && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">{t('columnMappingModal.sheetTab')}</span>
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
        </div>

        {/* Notice for multi-table side-by-side detection */}
        {subTables.length > 1 && (
          <div className="mt-3 p-3 bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs rounded-xl flex items-center justify-between">
            <span>
              ℹ️ <strong>{t('columnMappingModal.sideBySideNotice', 'We detected multiple side-by-side tables. Select which area to import:')}</strong>
            </span>
          </div>
        )}

        {validationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            ✕ {validationError}
          </div>
        )}

        <div className="overflow-y-auto flex-1 my-4 pr-1 space-y-6">
          {/* Presets Bar */}
          {Object.keys(savedPresets).length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold text-slate-700">{t('columnMappingModal.savedPresets')}</span>
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
            {targetFields.map((field) => {
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
                          {t('columnMappingModal.matchConfidence', { confidence: Math.round(confidence * 100) })}
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
                      <option value="">{t('columnMappingModal.selectFileColumn')}</option>
                      {currentHeaders.map((h, i) => (
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
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('columnMappingModal.livePreviewHeader')}</h4>
              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-slate-50 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/80">
                      <th className="p-2 text-slate-600 font-semibold">{t('columnMappingModal.tableHeaderSystem')}</th>
                      <th className="p-2 text-slate-600 font-semibold">{t('columnMappingModal.tableHeaderDescription')}</th>
                      <th className="p-2 text-slate-600 font-semibold">{t('columnMappingModal.tableHeaderSizeSpec')}</th>
                      <th className="p-2 text-slate-600 font-semibold">{t('columnMappingModal.tableHeaderQuantity')}</th>
                      <th className="p-2 text-slate-600 font-semibold">{t('columnMappingModal.tableHeaderUnit')}</th>
                      <th className="p-2 text-slate-600 font-semibold">{t('columnMappingModal.tableHeaderDepth')}</th>
                      <th className="p-2 text-slate-600 font-semibold">{t('columnMappingModal.tableHeaderMaterialCost', 'Mat $/Unit')}</th>
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
                        <td className="p-2 text-slate-700 font-mono text-[11px]">
                          {mapping.material_cost_per_unit ? String(row[mapping.material_cost_per_unit] ?? '$0.00') : '$0.00'}
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
            <span className="text-slate-500 font-medium">{t('columnMappingModal.saveAsVendorPreset')}</span>
            <input
              type="text"
              placeholder={t('columnMappingModal.presetPlaceholder')}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none w-44"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
            >
              {t('columnMappingModal.savePreset')}
            </button>
            {showPresetSaved && (
              <span className="text-emerald-600 font-medium text-[11px]">{t('columnMappingModal.presetSaved')}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            {t('common.cancel')}
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
          >
            {t('columnMappingModal.confirmImportTakeoff')}
          </button>
        </div>
      </div>
    </div>
  );
}
