import { useRef, useState } from 'react';
import { Check, CopyPlus, Sparkles, Lock, SlidersHorizontal, Scale, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/core/components/context/I18nContext';
import { parseTakeoffFile, buildMappingModalDataFromItems, requestAiMapping } from '@/product/lib/csv';
import { useAiAssist } from '@/product/lib/useAiAssist';
import { DEFAULT_SCOPE_ITEMS, SCOPE_STATUS } from '@/product/lib/scope';
import { formatCurrency } from '@/product/lib/calculations';
import TakeoffGrid from './TakeoffGrid';
import RatesDrawer from './RatesDrawer';
import ColumnMappingModal from './ColumnMappingModal';
import ScopeInclusionsModal from './ScopeInclusionsModal';
import SaveStatusChip from './SaveStatusChip';
import StepTotalsBar from './StepTotalsBar';
import type { LiveEstimate } from '@/product/lib/useLiveEstimate';
import type { ProjectAutosave } from '@/product/lib/useProjectAutosave';
import type { TakeoffFileLike } from '@/product/lib/csv';
import type {
  AiAssistResult,
  ColumnDefinition,
  ImportContext,
  MappingModalData,
  QuoteMetadata,
  QuoteSections,
  Rates,
  ScopeItem,
  TakeoffItem,
} from '@/types/models';

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

/** Totals shown before the workspace's live estimate has landed (and in tests). */
const EMPTY_LIVE: LiveEstimate = { totals: {}, loading: false, ready: true, stale: false };

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
  live = EMPTY_LIVE,
  saveState,
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
  /** Live totals owned by the workspace, so the bar and the autosaved summary agree. */
  live?: LiveEstimate;
  /** Draft autosave state; omitted in tests and read-only surfaces. */
  saveState?: ProjectAutosave;
}>) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSection, setDrawerSection] = useState('all');
  const [scopeExpanded, setScopeExpanded] = useState(false);
  const scopeSectionRef = useRef<HTMLDivElement>(null);

  const openRatesSection = (section: string = 'all') => {
    setDrawerSection(section);
    setDrawerOpen(true);
  };

  const jumpToScopeBoundaries = () => {
    setScopeExpanded(true);
    requestAnimationFrame(() => {
      scopeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };
  const [mappingModalData, setMappingModalData] = useState<MappingModalData | null>(null);
  const [successToast, setSuccessToast] = useState('');
  const [isReparsing, setIsReparsing] = useState(false);
  // Opening the modal from "Remap Using AI" *is* the request, so the modal runs the assist on mount.
  const [aiAutoRun, setAiAutoRun] = useState(false);
  const [explicitSheetChosen, setExplicitSheetChosen] = useState(false);
  const [explicitTableChosen, setExplicitTableChosen] = useState(false);
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
    setExplicitSheetChosen(false);
    setExplicitTableChosen(false);
  };

  /** Opens the mapping modal with the AI armed, so the model does the remap instead of the user. */
  const handleOpenAiRemap = () => {
    if (aiRemapDisabled) return;
    setExplicitSheetChosen(false);
    setExplicitTableChosen(false);
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
    const hasExplicitPick = explicitSheetChosen || explicitTableChosen;
    const matrixContext =
      !file && remapMatrix && remapMatrix.length > 0
        ? {
            matrix: remapMatrix,
            sheetNames: importContext?.mappingData?.sheetNames,
            activeSheetName: mappingModalData?.activeSheetName,
            headerRowIndex: mappingModalData?.headerRowIndex,
            ...(hasExplicitPick
              ? {
                  explicitSheetSelection: explicitSheetChosen,
                  explicitTableSelection: explicitTableChosen,
                }
              : {}),
          }
        : hasExplicitPick
          ? {
              explicitSheetSelection: explicitSheetChosen,
              explicitTableSelection: explicitTableChosen,
            }
          : null;

    if (!file && (!remapMatrix || remapMatrix.length === 0)) return null;

    try {
      const result = await requestAiMapping(
        file,
        explicitSheetChosen ? mappingModalData?.activeSheetName ?? null : null,
        explicitTableChosen ? mappingModalData?.activeTableId ?? null : null,
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
      setExplicitSheetChosen(true);
      setExplicitTableChosen(false);
      void handleParseForRemap(importContext.file, sheetName, null);
    }
  };

  const handleTableChange = (tableId: string) => {
    if (importContext?.file) {
      setExplicitTableChosen(true);
      void handleParseForRemap(importContext.file, mappingModalData?.activeSheetName || null, tableId);
    }
  };

  const handleMappingConfirm = ({
    items: newItems,
    detectedLaborMode,
    columns: newColumns,
    quoteMeta,
    quoteSections,
    scopeItems,
    listedQuoteTotal,
    pricedColumnBasis,
    aiMappingData,
  }: {
    items?: TakeoffItem[];
    detectedLaborMode?: string;
    columns?: ColumnDefinition[];
    quoteMeta?: QuoteMetadata;
    quoteSections?: QuoteSections;
    scopeItems?: ScopeItem[];
    listedQuoteTotal?: number;
    pricedColumnBasis?: 'unit' | 'line_total';
    aiMappingData?: AiAssistResult;
  }) => {
    const prevModalData = mappingModalData;
    setMappingModalData(null);
    setAiAutoRun(false);
    setExplicitSheetChosen(false);
    setExplicitTableChosen(false);
    if (newColumns && newColumns.length > 0 && onColumnsChange) {
      onColumnsChange(newColumns);
    }
    if (newItems && newItems.length > 0) {
      onItemsChange(newItems);
      if (onRatesChange && (detectedLaborMode || (scopeItems && scopeItems.length > 0))) {
        onRatesChange({
          ...rates,
          ...(detectedLaborMode ? { laborMode: detectedLaborMode } : {}),
          ...(scopeItems && scopeItems.length > 0 ? { scopeItems } : {}),
        });
      }
      if (onImportContextChange) {
        const resolvedQuoteMeta = quoteMeta ?? importContext?.quoteMeta;
        const resolvedQuoteSections = quoteSections ?? importContext?.quoteSections;
        const resolvedScopeItems = scopeItems ?? importContext?.scopeItems;
        onImportContextChange({
          ...importContext,
          columns: newColumns ?? aiMappingData?.columns ?? importContext?.columns ?? columns,
          quoteMeta: resolvedQuoteMeta,
          quoteSections: resolvedQuoteSections,
          scopeItems: resolvedScopeItems,
          mappingData: {
            ...(importContext?.mappingData ?? prevModalData ?? {}),
            ...(aiMappingData
              ? {
                  headers: aiMappingData.headers,
                  rawRows: aiMappingData.rawRows,
                  mapping: aiMappingData.mapping,
                  currentMapping: aiMappingData.mapping,
                  matchConfidences: aiMappingData.matchConfidences,
                  overallConfidence: aiMappingData.confidence,
                  headerRowIndex: aiMappingData.headerRowIndex,
                  ...(aiMappingData.rawMatrix ? { rawMatrix: aiMappingData.rawMatrix } : {}),
                  ...(aiMappingData.sampleMatrix ? { sampleMatrix: aiMappingData.sampleMatrix } : {}),
                  sheetNames: aiMappingData.sheetNames,
                  activeSheetName: aiMappingData.activeSheetName,
                  subTables: aiMappingData.subTables,
                  activeTableId: aiMappingData.activeTableId,
                }
              : {}),
            ...(resolvedQuoteMeta ? { quoteMeta: resolvedQuoteMeta } : {}),
            ...(resolvedQuoteSections ? { quoteSections: resolvedQuoteSections } : {}),
            ...(resolvedScopeItems ? { scopeItems: resolvedScopeItems } : {}),
            ...(listedQuoteTotal !== undefined ? { listedQuoteTotal } : {}),
            ...(pricedColumnBasis ? { pricedColumnBasis } : {}),
          },
        });
      }
      setSuccessToast(t('product.editStep.remapSuccessToast', 'Column mappings successfully applied!'));
      setTimeout(() => setSuccessToast(''), 3500);
    }
  };

  const activeScopeItems = Array.isArray(rates?.scopeItems) && rates.scopeItems.length > 0
    ? rates.scopeItems
    : DEFAULT_SCOPE_ITEMS;
  const includedScopeCount = activeScopeItems.filter((s) => s.status === SCOPE_STATUS.INCLUDED).length;
  const excludedScopeCount = activeScopeItems.filter((s) => s.status === SCOPE_STATUS.EXCLUDED).length;
  const addonScopeCount = activeScopeItems.filter((s) => s.status === SCOPE_STATUS.OPTIONAL_ADDON).length;

  const baseLaborSummary =
    rates?.laborBasis === 'daily' && Number(rates?.laborDailyRate) > 0
      ? `${formatCurrency(Number(rates.laborDailyRate))}/day`
      : `${formatCurrency(Number(rates?.laborHourlyRate) || 65)}/hr`;

  const formatRatePill = (val: string | number | undefined, mode: string | undefined, fallbackPct: number) => {
    if (mode === 'fixed') return formatCurrency(Number(val) || 0);
    return `${val === undefined || val === '' ? fallbackPct : Number(val)}%`;
  };

  const markupSummary = `${t('product.resultsStep.overheadFixed')} ${formatRatePill(rates?.overheadPct, rates?.overheadType, 10)} · ${t('product.resultsStep.contingencyFixed')} ${formatRatePill(rates?.contingencyPct, rates?.contingencyType, 5)} · ${t('product.resultsStep.profitFixed')} ${formatRatePill(rates?.profitPct, rates?.profitType, 15)}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
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

      {/* Zone 1: Step Header & Spreadsheet Source Controls */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {readOnly
              ? t('product.editStep.viewTakeoffTitle', { status: statusLabel })
              : t('product.editStep.editTitle')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {readOnly
              ? t('product.editStep.viewTakeoffDesc', { status: statusLabel.toLowerCase() })
              : t('product.editStep.editDesc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {saveState && <SaveStatusChip state={saveState} />}

          {!readOnly && (
            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 p-1">
              <button
                type="button"
                onClick={handleOpenRemapModal}
                disabled={isReparsing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 shadow-2xs transition cursor-pointer disabled:opacity-50"
                title={t('product.editStep.remapColumnsDesc', 'Re-open column mapping to adjust how spreadsheet headers map to takeoff attributes.')}
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
                <span>{isReparsing ? '...' : t('product.editStep.remapColumnsBtn', 'Match Columns')}</span>
              </button>

              {/* Always shown so it stays a discoverable second chance; disabled with the reason why. */}
              <button
                type="button"
                onClick={handleOpenAiRemap}
                disabled={aiRemapDisabled}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={aiRemapDisabledReason ?? t('product.aiAssist.remapHint')}
              >
                {aiRemapDisabled ? (
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{t('product.aiAssist.remapBtn')}</span>
                {ai.usage && !ai.usage.unlimited && (
                  <span className="font-mono text-[10px] opacity-75">
                    {ai.usage.used}/{ai.usage.max}
                  </span>
                )}
              </button>
            </div>
          )}

          {!readOnly && onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <CopyPlus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              {t('product.editStep.duplicateDraftBtn')}
            </button>
          )}
        </div>
      </div>

      {/* Zone 2: Interactive Pricing, Rates & Scope Summary Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t('product.editStep.ratesSummaryTitle')}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => openRatesSection('labor')}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition cursor-pointer"
              >
                {t('product.editStep.baseLaborBadge', { rate: baseLaborSummary })}
              </button>
              <button
                type="button"
                onClick={() => openRatesSection('markups')}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition cursor-pointer"
              >
                {markupSummary}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openRatesSection('all')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 transition cursor-pointer shrink-0"
          >
            <span>{readOnly ? t('product.editStep.viewPricingBtn') : t('product.editStep.pricingBtn')}</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center shrink-0">
                <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t('product.editStep.scopeInclusionsBtn')}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold">
                {t('product.scopeModal.includedCount', { count: includedScopeCount })}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold">
                {t('product.scopeModal.excludedCount', { count: excludedScopeCount })}
              </span>
              {addonScopeCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold">
                  +{addonScopeCount} {t('product.scopeModal.btnAddon')}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={jumpToScopeBoundaries}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer shrink-0"
          >
            <span>{t('product.editStep.reviewScopeBtn')}</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Zone 3: Line-Item Grid & Scope Clarifications */}
      <TakeoffGrid
        items={items}
        onChange={onItemsChange}
        readOnly={readOnly}
        rates={rates}
        onRatesChange={onRatesChange}
        columns={columns}
        onColumnsChange={readOnly ? undefined : onColumnsChange}
      />

      <div ref={scopeSectionRef} className="mt-5 scroll-mt-6">
        <ScopeInclusionsModal
          variant="panel"
          expanded={scopeExpanded}
          onToggleExpanded={() => setScopeExpanded((prev) => !prev)}
          scopeItems={rates?.scopeItems || DEFAULT_SCOPE_ITEMS}
          readOnly={readOnly}
          onSave={(newScopeItems) => onRatesChange({ ...rates, scopeItems: newScopeItems })}
        />
      </div>

      <RatesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        rates={rates}
        onChange={onRatesChange}
        readOnly={readOnly}
        initialSection={drawerSection}
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

      {/* Zone 4: Sticky Live Totals + Primary Step 3 CTA */}
      <StepTotalsBar
        totals={live.totals}
        loading={live.loading}
        stale={live.stale}
        itemCount={items.length}
        onCalculate={onCalculate}
        calculateLabel={readOnly ? t('product.editStep.viewEstimateBtn') : t('product.editStep.calculateBtn')}
      />
    </div>
  );
}
