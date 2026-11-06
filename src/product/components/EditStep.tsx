import { useState } from 'react';
import { Check, Sparkles, Lock } from 'lucide-react';
import { useTranslation } from '@/core/components/context/I18nContext';
import { parseTakeoffFile, buildMappingModalDataFromItems, requestAiMapping } from '@/product/lib/csv';
import { useAiAssist } from '@/product/lib/useAiAssist';
import { DEFAULT_SCOPE_ITEMS } from '@/product/lib/scope';
import TakeoffGrid from './TakeoffGrid';
import RatesDrawer from './RatesDrawer';
import ColumnMappingModal from './ColumnMappingModal';
import ScopeInclusionsModal from './ScopeInclusionsModal';
import type { TakeoffFileLike } from '@/product/lib/csv';
import type { AiAssistResult, ColumnDefinition, ImportContext, MappingModalData, Rates, TakeoffItem } from '@/types/models';

/** Per-status copy for the project banner, keyed by project status. */
const STATUS_COPY: Record<string, { label: string; description: string }> = {
  submitted: {
    label: 'product.editStep.statusSubmitted',
    description: 'product.editStep.submittedDesc',
  },
  archived: {
    label: 'product.editStep.statusArchived',
    description: 'product.editStep.archivedDesc',
  },
  declined: {
    label: 'product.editStep.statusDeclined',
    description: 'product.editStep.declinedDesc',
  },
  awarded: {
    label: 'product.editStep.statusAwarded',
    description: 'product.editStep.awardedDesc',
  },
};

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
  columns = [],
  onColumnsChange,
}: Readonly<{
  items: TakeoffItem[];
  onItemsChange: (items: TakeoffItem[]) => void;
  rates: Rates;
  onRatesChange: (rates: Rates) => void;
  onCalculate: () => void;
  readOnly?: boolean;
  projectStatus?: string;
  onDuplicate?: () => void;
  importContext?: ImportContext;
  onImportContextChange?: (context: ImportContext) => void;
  /** Ordered column schema (canonical + passthrough columns) shared with the grid. */
  columns?: ColumnDefinition[];
  /** Applies column add/rename/retype/delete changes made in the grid. */
  onColumnsChange?: (columns: ColumnDefinition[]) => void;
}>) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scopeExpanded, setScopeExpanded] = useState(false);
  const [mappingModalData, setMappingModalData] = useState<MappingModalData | null>(null);
  const [successToast, setSuccessToast] = useState('');
  const [isReparsing, setIsReparsing] = useState(false);
  // Opening the modal from "Remap Using AI" *is* the request, so the modal runs the assist on mount.
  const [aiAutoRun, setAiAutoRun] = useState(false);
  const ai = useAiAssist();

  const statusCopy = STATUS_COPY[projectStatus] ?? STATUS_COPY.awarded;
  const statusLabel = t(statusCopy.label);
  const statusDescription = t(statusCopy.description);

  /** Where a remap could read the sheet from: the uploaded file, or a matrix already in memory. */
  const remapMatrix = importContext?.mappingData?.rawMatrix;
  const hasRemapSource = Boolean(importContext?.file) || Boolean(remapMatrix && remapMatrix.length > 0);

  const aiPlanMissing = Boolean(ai.usage) && !ai.usage?.unlimited && (ai.usage?.max ?? 0) <= 0;
  const aiSpent = Boolean(ai.usage) && !ai.usage?.unlimited && (ai.usage?.remaining ?? 0) <= 0;

  /**
   * Everything that stops the AI remap, most specific first. The button is always shown (so the
   * affordance is discoverable and stays a "second chance"), and disabled with the reason why.
   */
  const aiRemapDisabledReason = readOnly
    ? t('product.editStep.projectLockedTitle', { status: statusLabel })
    : isReparsing
      ? null
      : !ai.enabled && ai.loaded
        ? t('product.aiAssist.disabledOnDeployment')
        : aiPlanMissing
          ? t('product.aiAssist.upgradeHint')
          : aiSpent
            ? t('product.aiAssist.quotaHint', { max: ai.usage?.max ?? 0 })
            : !hasRemapSource
              ? t('product.aiAssist.remapNeedsUpload')
              : null;
  const aiRemapDisabled = Boolean(aiRemapDisabledReason) || isReparsing;

  const closeMappingModal = () => {
    setMappingModalData(null);
    setAiAutoRun(false);
  };

  /** Opens the mapping modal with the AI armed, so the model does the remap instead of the user. */
  const handleOpenAiRemap = () => {
    if (aiRemapDisabled) return;
    setAiAutoRun(true);
    if (importContext?.mappingData) {
      setMappingModalData(importContext.mappingData);
      return;
    }
    if (importContext?.file) void handleParseForRemap(importContext.file);
  };

  /**
   * Runs the AI remap for the modal. Uses the uploaded file when it is still in memory, otherwise the
   * matrix the mapping payload already carries, so Step 2 works without re-uploading.
   */
  const handleAiAssist = async (): Promise<AiAssistResult | null> => {
    const file = importContext?.file ?? null;
    const matrixContext =
      !file && remapMatrix && remapMatrix.length > 0
        ? {
            matrix: remapMatrix,
            sheetNames: importContext?.mappingData?.sheetNames,
            activeSheetName: mappingModalData?.activeSheetName,
            headerRowIndex: mappingModalData?.headerRowIndex,
          }
        : null;

    if (!file && !matrixContext) return null;

    try {
      const result = await requestAiMapping(
        file,
        mappingModalData?.activeSheetName ?? null,
        mappingModalData?.activeTableId ?? null,
        matrixContext,
      );
      ai.recordUsage(result.usage);
      return result;
    } catch (err) {
      void ai.refresh();
      throw err;
    }
  };

  const handleOpenRemapModal = () => {
    if (readOnly) return;
    if (importContext?.mappingData) {
      setMappingModalData(importContext.mappingData);
    } else if (importContext?.file) {
      void handleParseForRemap(importContext.file);
    } else {
      // Direct opening: construct mapping modal data directly from existing items
      const directModalData = buildMappingModalDataFromItems(items, t, columns);
      setMappingModalData(directModalData);
    }
  };

  const handleParseForRemap = async (
    file: TakeoffFileLike | null,
    explicitSheetName: string | null = null,
    explicitTableId: string | null = null,
  ) => {
    if (!file) return;
    setIsReparsing(true);
    try {
      const result = await parseTakeoffFile(file, explicitSheetName, explicitTableId, null, columns);
      setMappingModalData(result);
      if (onImportContextChange) {
        onImportContextChange({
          file,
          mappingData: result,
          columns: result.columns ?? columns,
        });
      }
    } catch (err) {
      console.error('Failed to parse file for remapping:', err);
      // Fallback: open directly using item rows
      setAiAutoRun(false);
      const directModalData = buildMappingModalDataFromItems(items, t, columns);
      setMappingModalData(directModalData);
    } finally {
      setIsReparsing(false);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (importContext?.file) {
      void handleParseForRemap(importContext.file, sheetName, null);
    }
  };

  const handleTableChange = (tableId: string) => {
    if (importContext?.file) {
      void handleParseForRemap(importContext.file, mappingModalData?.activeSheetName || null, tableId);
    }
  };

  const handleMappingConfirm = ({
    items: newItems,
    detectedLaborMode,
    columns: newColumns,
  }: {
    items?: TakeoffItem[];
    detectedLaborMode?: string;
    columns?: ColumnDefinition[];
  }) => {
    setMappingModalData(null);
    setAiAutoRun(false);
    if (newColumns && newColumns.length > 0 && onColumnsChange) {
      onColumnsChange(newColumns);
    }
    if (newItems && newItems.length > 0) {
      onItemsChange(newItems);
      if (detectedLaborMode && onRatesChange) {
        onRatesChange({ ...rates, laborMode: detectedLaborMode });
      }
      setSuccessToast(t('product.editStep.remapSuccessToast', 'Column mappings successfully applied!'));
      setTimeout(() => setSuccessToast(''), 3500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {successToast && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl flex items-center gap-2 text-sm font-semibold shadow-xs animate-fade-in">
          <span><Check className="w-4 h-4" /></span>
          <span>{successToast}</span>
        </div>
      )}
      {readOnly && (
        <div className="mb-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {t('product.editStep.projectLockedTitle', { status: statusLabel })}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
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
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {t('product.editStep.duplicateRevisionBtn')}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {readOnly
              ? t('product.editStep.viewTakeoffTitle', { status: statusLabel })
              : t('product.editStep.editTitle')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {readOnly
              ? t('product.editStep.viewTakeoffDesc', { status: statusLabel.toLowerCase() })
              : t('product.editStep.editDesc')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenRemapModal}
              disabled={isReparsing}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition shadow-xs cursor-pointer disabled:opacity-50"
              title={t('product.editStep.remapColumnsDesc', 'Re-open column mapping to adjust how spreadsheet headers map to takeoff attributes.')}
            >
              <svg aria-hidden="true" className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
              <span>{isReparsing ? '...' : t('product.editStep.remapColumnsBtn', 'Match Columns')}</span>
            </button>
          )}
          {/* Always shown so it stays a discoverable second chance; disabled with the reason why. */}
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenAiRemap}
              disabled={aiRemapDisabled}
              className="inline-flex items-center gap-2 rounded-md border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40 px-3.5 py-2 text-sm font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={aiRemapDisabledReason ?? t('product.aiAssist.remapHint')}
            >
              {aiRemapDisabled ? (
                <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>{t('product.aiAssist.remapBtn')}</span>
              {ai.usage && !ai.usage.unlimited && (
                <span className="font-mono text-[11px] opacity-75">
                  {ai.usage.used}/{ai.usage.max}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
              />
            </svg>
            {readOnly ? t('product.editStep.viewPricingBtn') : t('product.editStep.pricingBtn')}
          </button>
        </div>
      </div>

      <TakeoffGrid
        items={items}
        onChange={onItemsChange}
        readOnly={readOnly}
        rates={rates}
        onRatesChange={onRatesChange}
        columns={columns}
        onColumnsChange={readOnly ? undefined : onColumnsChange}
      />

      <div className="mt-6">
        <ScopeInclusionsModal
          variant="panel"
          expanded={scopeExpanded}
          onToggleExpanded={() => setScopeExpanded((prev) => !prev)}
          scopeItems={rates?.scopeItems || DEFAULT_SCOPE_ITEMS}
          readOnly={readOnly}
          onSave={(newScopeItems) => onRatesChange({ ...rates, scopeItems: newScopeItems })}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onCalculate}
          disabled={items.length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
        >
          {readOnly ? t('product.editStep.viewEstimateBtn') : t('product.editStep.calculateBtn')}
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {mappingModalData && (
        <ColumnMappingModal
          headers={mappingModalData.headers}
          rawRows={mappingModalData.rawRows}
          columns={mappingModalData.columns}
          initialMapping={mappingModalData.mapping}
          matchConfidences={mappingModalData.matchConfidences}
          overallConfidence={mappingModalData.overallConfidence}
          sampleMatrix={mappingModalData.sampleMatrix}
          initialHeaderRowIndex={mappingModalData.headerRowIndex}
          sheetNames={mappingModalData.sheetNames}
          activeSheetName={mappingModalData.activeSheetName}
          subTables={mappingModalData.subTables}
          activeTableId={mappingModalData.activeTableId}
          aiAvailable={ai.enabled}
          aiUsage={ai.usage}
          aiAutoRun={aiAutoRun}
          onAiAssist={handleAiAssist}
          onSheetChange={handleSheetChange}
          onTableChange={handleTableChange}
          onConfirm={handleMappingConfirm}
          onCancel={closeMappingModal}
        />
      )}
    </div>
  );
}
