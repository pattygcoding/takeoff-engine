import { useState } from 'react';
import { useTranslation } from '@/context/I18nContext';
import { parseTakeoffFile, buildMappingModalDataFromItems } from '@/lib/product/csv';
import { DEFAULT_SCOPE_ITEMS, summarizeScope } from '@/lib/product/scope';
import TakeoffGrid from './TakeoffGrid';
import RatesDrawer from './RatesDrawer';
import ColumnMappingModal from './ColumnMappingModal';
import ScopeInclusionsModal from './ScopeInclusionsModal';

export default function EditStep({
  items,
  onItemsChange,
  rates,
  onRatesChange,
  onCalculate,
  readOnly = false,
  projectStatus = 'awarded',
  onDuplicate,
  importContext = { file: null, mappingData: null },
  onImportContextChange,
}) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [mappingModalData, setMappingModalData] = useState(null);
  const [successToast, setSuccessToast] = useState('');
  const [isReparsing, setIsReparsing] = useState(false);

  const statusLabel =
    projectStatus === 'submitted'
      ? t('editStep.statusSubmitted')
      : projectStatus === 'archived'
      ? t('editStep.statusArchived')
      : projectStatus === 'declined'
      ? t('editStep.statusDeclined')
      : t('editStep.statusAwarded');

  const statusDescription =
    projectStatus === 'submitted'
      ? t('editStep.submittedDesc')
      : projectStatus === 'archived'
      ? t('editStep.archivedDesc')
      : projectStatus === 'declined'
      ? t('editStep.declinedDesc')
      : t('editStep.awardedDesc');

  const handleOpenRemapModal = () => {
    if (readOnly) return;
    if (importContext?.mappingData) {
      setMappingModalData(importContext.mappingData);
    } else if (importContext?.file) {
      handleParseForRemap(importContext.file);
    } else {
      // Direct opening: construct mapping modal data directly from existing items
      const directModalData = buildMappingModalDataFromItems(items, t);
      setMappingModalData(directModalData);
    }
  };

  const handleParseForRemap = async (file, explicitSheetName = null, explicitTableId = null) => {
    if (!file) return;
    setIsReparsing(true);
    try {
      const result = await parseTakeoffFile(file, explicitSheetName, explicitTableId);
      setMappingModalData(result);
      if (onImportContextChange) {
        onImportContextChange({
          file,
          mappingData: result,
        });
      }
    } catch (err) {
      console.error('Failed to parse file for remapping:', err);
      // Fallback: open directly using item rows
      const directModalData = buildMappingModalDataFromItems(items, t);
      setMappingModalData(directModalData);
    } finally {
      setIsReparsing(false);
    }
  };

  const handleSheetChange = (sheetName) => {
    if (importContext?.file) {
      handleParseForRemap(importContext.file, sheetName, null);
    }
  };

  const handleTableChange = (tableId) => {
    if (importContext?.file) {
      handleParseForRemap(importContext.file, mappingModalData?.activeSheetName || null, tableId);
    }
  };

  const handleMappingConfirm = ({ items: newItems, detectedLaborMode }) => {
    setMappingModalData(null);
    if (newItems && newItems.length > 0) {
      onItemsChange(newItems);
      if (detectedLaborMode && onRatesChange) {
        onRatesChange({ ...rates, laborMode: detectedLaborMode });
      }
      setSuccessToast(t('editStep.remapSuccessToast', 'Column mappings successfully applied!'));
      setTimeout(() => setSuccessToast(''), 3500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {successToast && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-sm font-semibold shadow-xs animate-fade-in">
          <span>✓</span>
          <span>{successToast}</span>
        </div>
      )}
      {readOnly && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {t('editStep.projectLockedTitle', { status: statusLabel })}
              </h4>
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
              {t('editStep.duplicateRevisionBtn')}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {readOnly
              ? t('editStep.viewTakeoffTitle', { status: statusLabel })
              : t('editStep.editTitle')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {readOnly
              ? t('editStep.viewTakeoffDesc', { status: statusLabel.toLowerCase() })
              : t('editStep.editDesc')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenRemapModal}
              disabled={isReparsing}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-xs cursor-pointer disabled:opacity-50"
              title={t('editStep.remapColumnsDesc', 'Re-open column mapping to adjust how spreadsheet headers map to takeoff attributes.')}
            >
              <svg className="h-4 w-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
              <span>{isReparsing ? '...' : t('editStep.remapColumnsBtn', 'Match Columns')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setScopeModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-amber-400 bg-amber-400/90 px-3.5 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 shadow-xs transition cursor-pointer"
            title={t('editStep.scopeInclusionsDesc', 'Manage scope inclusions, trade exclusions (fixtures, earthwork, permits), and client counter-offer rules.')}
          >
            <span>⚖️</span>
            <span>{t('editStep.scopeInclusionsBtn', 'Exclusions / Inclusions')}</span>
          </button>
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
            {readOnly ? t('editStep.viewPricingBtn') : t('editStep.pricingBtn')}
          </button>
        </div>
      </div>

      <TakeoffGrid
        items={items}
        onChange={onItemsChange}
        readOnly={readOnly}
        rates={rates}
        onRatesChange={onRatesChange}
      />

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onCalculate}
          disabled={items.length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
        >
          {readOnly ? t('editStep.viewEstimateBtn') : t('editStep.calculateBtn')}
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

      {scopeModalOpen && (
        <ScopeInclusionsModal
          scopeItems={rates?.scopeItems || DEFAULT_SCOPE_ITEMS}
          readOnly={readOnly}
          onSave={(newScopeItems) => {
            onRatesChange({ ...rates, scopeItems: newScopeItems });
            setSuccessToast(t('ratesDrawer.scopeSavedSuccess', 'Scope exclusions & inclusions updated.'));
            setTimeout(() => setSuccessToast(''), 3000);
          }}
          onClose={() => setScopeModalOpen(false)}
        />
      )}

      {mappingModalData && (
        <ColumnMappingModal
          headers={mappingModalData.headers}
          rawRows={mappingModalData.rawRows}
          initialMapping={mappingModalData.mapping}
          matchConfidences={mappingModalData.matchConfidences}
          overallConfidence={mappingModalData.overallConfidence}
          sampleMatrix={mappingModalData.sampleMatrix}
          initialHeaderRowIndex={mappingModalData.headerRowIndex}
          sheetNames={mappingModalData.sheetNames}
          activeSheetName={mappingModalData.activeSheetName}
          subTables={mappingModalData.subTables}
          activeTableId={mappingModalData.activeTableId}
          onSheetChange={handleSheetChange}
          onTableChange={handleTableChange}
          onConfirm={handleMappingConfirm}
          onCancel={() => setMappingModalData(null)}
        />
      )}
    </div>
  );
}
