import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Download, FileSpreadsheet, Loader2, PenLine, Sparkles } from 'lucide-react';
import {
  createBlankItem,
  downloadSampleCsv,
  downloadSampleExcel,
  parseTakeoffFile,
  requestAiMapping,
} from '@/product/lib/csv';
import { useTranslation } from '@/core/components/context/I18nContext';
import ColumnMappingModal from './ColumnMappingModal';
import ImportMethodChooser from './ImportMethodChooser';
import { useAiAssist } from '@/product/lib/useAiAssist';
import { useSingleFlight } from '@/core/lib/shared/useSingleFlight';
import type { ImportMode } from './ImportMethodChooser';
import type { TakeoffFileLike } from '@/product/lib/csv';
import type { AiAssistResult, ColumnDefinition, ImportContext, QuoteMetadata, QuoteSections, ScopeItem, TakeoffItem } from '@/types/models';

interface MappingModalData {
  headers?: string[];
  rawRows?: Array<Record<string, string>>;
  currentMapping?: Record<string, string | number>;
  /** Column schema (canonical + imported passthrough columns) produced by the parser. */
  columns?: ColumnDefinition[];
  matchConfidences?: Record<string, number>;
  overallConfidence?: number;
  rawMatrix?: string[][];
  sampleMatrix?: string[][];
  headerRowIndex?: number;
  sheetNames?: string[];
  activeSheetName?: string;
  activeTableId?: string | null;
  subTables?: Array<{ id: string; label: string }>;
  quoteMeta?: QuoteMetadata;
  quoteSections?: QuoteSections;
  scopeItems?: ScopeItem[];
  [key: string]: unknown;
}

/** Checksum/verification summary returned by the parser for spreadsheet uploads. */
interface ChecksumSummary {
  hasSubtotals?: boolean;
  checksumMatches?: boolean;
  detectedSubtotals?: number;
  parsedSum?: number;
  [key: string]: unknown;
}

export default function UploadStep({
  onItemsParsed,
}: Readonly<{
  onItemsParsed: (items: TakeoffItem[], options: ImportContext) => void;
}>) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [mappingModalData, setMappingModalData] = useState<MappingModalData | null>(null);
  const [currentUploadedFile, setCurrentUploadedFile] = useState<TakeoffFileLike | null>(null);
  const [checksumSummary, setChecksumSummary] = useState<ChecksumSummary | null>(null);
  // How the user wants to start: the deterministic parser, the AI-assisted import, or by hand.
  const [mode, setMode] = useState<ImportMode>('parser');
  // Opening the mapping modal *as* the AI request, so it runs the assist on mount.
  const [aiAutoRun, setAiAutoRun] = useState(false);
  // Tracks whether the user explicitly picked a sheet tab or sub-table dropdown.
  const [explicitSheetChosen, setExplicitSheetChosen] = useState(false);
  const [explicitTableChosen, setExplicitTableChosen] = useState(false);
  // AI mapping fallback: also offered as an optional rescue when the deterministic parse disappoints.
  const [aiRunning, setAiRunning] = useState(false);
  const [aiNotice, setAiNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const ai = useAiAssist();

  const aiPlanMissing = Boolean(ai.usage) && !ai.usage?.unlimited && (ai.usage?.max ?? 0) <= 0;
  const aiSpent = Boolean(ai.usage) && !ai.usage?.unlimited && (ai.usage?.remaining ?? 0) <= 0;
  /** Why the AI import cannot run, most specific reason first; null when it is usable. */
  const aiReason = !ai.enabled && ai.loaded
    ? t('product.aiAssist.disabledOnDeployment')
    : aiPlanMissing
      ? t('product.aiAssist.upgradeHint')
      : aiSpent
        ? t('product.aiAssist.quotaHint', { max: ai.usage?.max ?? 0 })
        : null;
  const aiAvailable = aiReason === null;
  const aiAllowanceLabel = ai.usage
    ? ai.usage.unlimited
      ? t('product.uploadStep.aiAllowanceUnlimited', 'Unlimited AI imports')
      : t('product.uploadStep.aiAllowance', {
          remaining: ai.usage.remaining ?? 0,
          max: ai.usage.max,
        })
    : null;

  // A plan change or an exhausted allowance can land after the choice was made; fall back rather
  // than leaving the page on a mode it can no longer run.
  useEffect(() => {
    if (mode === 'ai' && !aiAvailable) setMode('parser');
  }, [mode, aiAvailable]);

  /**
   * The "just do it for me" path: the AI maps the sheet and its result goes straight to step 2.
   * Also used as the automatic hand-off when "Import with AI" was chosen but the deterministic
   * parse could not read the sheet at all.
   */
  const runAiRescue = async (fileOverride?: TakeoffFileLike | null) => {
    const file = fileOverride ?? currentUploadedFile;
    if (!file || aiRunning) return;
    setAiRunning(true);
    setAiNotice('');
    setErrors([]);

    try {
      const result = await requestAiMapping(file);
      ai.recordUsage(result.usage);
      setAiNotice(
        t('product.aiAssist.appliedBody', {
          count: result.itemCount,
          confidence: Math.round((result.confidence ?? 0) * 100),
        }),
      );

      if (result.items && result.items.length > 0) {
        onItemsParsed(result.items, {
          detectedLaborMode: result.detectedLaborMode,
          file,
          mappingData: result,
          columns: result.columns,
          quoteMeta: result.quoteMeta,
          quoteSections: result.quoteSections,
          scopeItems: result.scopeItems,
        });
      }
    } catch (err) {
      setAiNotice((err as Error)?.message || t('product.aiAssist.failedFallback'));
      void ai.refresh();
    } finally {
      setAiRunning(false);
    }
  };

  const guard = useSingleFlight();
  const handleFile = guard(
    'parse',
    async (
      file: TakeoffFileLike | null,
      explicitSheetName: string | null = null,
      explicitTableId: string | null = null,
      modeOverride?: ImportMode,
    ) => {
      if (!file) return;
      const activeMode = modeOverride ?? mode;
      if (activeMode === 'manual') return;

      if (explicitSheetName === null && explicitTableId === null) {
        setExplicitSheetChosen(false);
        setExplicitTableChosen(false);
      }
      setFileName(file.name || '');
      setCurrentUploadedFile(file);
      setIsParsing(true);
      setErrors([]);
      setChecksumSummary(null);

      try {
        const result = await parseTakeoffFile(file, explicitSheetName, explicitTableId);
        setAiNotice('');

        // "Import with AI": the parse only supplies the sheet preview; the modal runs the assist on
        // open, so the AI decides the layout before the user sees any mapping controls.
        if (activeMode === 'ai') {
          setMappingModalData({ ...result, requiresMappingModal: true });
          setAiAutoRun(true);
          return;
        }

        if (result.requiresMappingModal) {
          setMappingModalData(result);
          return;
        }

        const { items, errors: parseErrors, checksum, detectedLaborMode } = result;
        setErrors(parseErrors || []);
        if (checksum?.hasSubtotals) {
          setChecksumSummary(checksum);
        }

        if (items && items.length > 0) {
          onItemsParsed(items, {
            detectedLaborMode,
            file,
            mappingData: result,
            columns: result.columns,
            // Quote sheets carry customer/document metadata and their own scope boundaries.
            quoteMeta: result.quoteMeta,
            quoteSections: result.quoteSections,
            scopeItems: result.scopeItems,
          });
        }
      } catch (err) {
        console.error('Failed to parse takeoff file:', err);
        // The user already asked for the assist, so a failed parse hands straight over to it.
        if (activeMode === 'ai') {
          setIsParsing(false);
          await runAiRescue(file);
          return;
        }
        const errMsg = (err as Error)?.message || t('product.uploadStep.parseError');
        setErrors([errMsg]);
      } finally {
        setIsParsing(false);
      }
    },
  );

  const handleSheetChange = (sheetName: string) => {
    if (currentUploadedFile) {
      setExplicitSheetChosen(true);
      setExplicitTableChosen(false);
      handleFile(currentUploadedFile, sheetName, null, mode);
    }
  };

  const handleTableChange = (tableId: string) => {
    if (currentUploadedFile) {
      setExplicitTableChosen(true);
      handleFile(currentUploadedFile, mappingModalData?.activeSheetName || null, tableId, mode);
    }
  };

  const handleMappingConfirm = ({
    items,
    errors: mappingErrors,
    checksum,
    detectedLaborMode,
    columns,
    quoteMeta,
    quoteSections,
    scopeItems,
    listedQuoteTotal,
    pricedColumnBasis,
    aiMappingData,
  }: {
    items?: TakeoffItem[];
    errors?: string[];
    checksum?: ChecksumSummary;
    detectedLaborMode?: string;
    columns?: ColumnDefinition[];
    quoteMeta?: QuoteMetadata;
    quoteSections?: QuoteSections;
    scopeItems?: ScopeItem[];
    listedQuoteTotal?: number;
    pricedColumnBasis?: 'unit' | 'line_total';
    aiMappingData?: AiAssistResult;
  }) => {
    setMappingModalData(null);
    setAiAutoRun(false);
    setErrors(mappingErrors || []);
    if (checksum?.hasSubtotals) {
      setChecksumSummary(checksum);
    }
    const resolvedQuoteMeta = quoteMeta ?? mappingModalData?.quoteMeta;
    const resolvedQuoteSections = quoteSections ?? mappingModalData?.quoteSections;
    const resolvedScopeItems = scopeItems ?? mappingModalData?.scopeItems;
    if (items && items.length > 0) {
      onItemsParsed(items, {
        detectedLaborMode,
        file: currentUploadedFile,
        mappingData: {
          ...mappingModalData,
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
        columns: columns ?? aiMappingData?.columns ?? mappingModalData?.columns,
        quoteMeta: resolvedQuoteMeta,
        quoteSections: resolvedQuoteSections,
        scopeItems: resolvedScopeItems,
      });
    }
  };

  /**
   * AI mapping from inside the mapping modal: the user reviews the result and confirms.
   * Errors propagate so the modal can show the backend's reason (quota, plan, upstream).
   */
  const handleAiAssistFromModal = async (): Promise<AiAssistResult | null> => {
    if (!currentUploadedFile) return null;
    try {
      const hasExplicitPick = explicitSheetChosen || explicitTableChosen;
      const result = await requestAiMapping(
        currentUploadedFile,
        explicitSheetChosen ? mappingModalData?.activeSheetName || null : null,
        explicitTableChosen ? mappingModalData?.activeTableId || null : null,
        hasExplicitPick
          ? {
              explicitSheetSelection: explicitSheetChosen,
              explicitTableSelection: explicitTableChosen,
            }
          : null,
      );
      ai.recordUsage(result.usage);
      return result;
    } catch (err) {
      void ai.refresh();
      throw err;
    }
  };

  /** Manual entry: skip the file entirely and land on step 2 with one empty row to type into. */
  const handleStartManual = () => {
    onItemsParsed([createBlankItem()], {});
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t('product.uploadStep.title')}
        </h1>
        <p className="mt-1.5 text-sm sm:text-base text-slate-500 dark:text-slate-400">
          {t('product.uploadStep.subtitle')}
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 sm:p-4 shadow-xs">
        <ImportMethodChooser
          mode={mode}
          onChange={setMode}
          aiAvailable={aiAvailable}
          aiReason={aiReason}
          aiAllowanceLabel={aiAllowanceLabel}
        />

        {mode === 'manual' ? (
          <div className="mt-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
            <PenLine className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
              {t('product.uploadStep.modeManualDesc', 'Skip the file and type your line items straight into the grid.')}
            </p>
            <button
              type="button"
              onClick={handleStartManual}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
            >
              {t('product.uploadStep.modeManualCta', 'Start with a blank grid')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {t(
                'product.uploadStep.modeManualHint',
                "You'll land on the item grid with one empty row. Add as many as you need.",
              )}
            </p>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              inputRef.current?.click();
            }}
            className={`mt-3 rounded-2xl border-2 border-dashed p-10 text-center transition duration-200 cursor-pointer
              ${isDragging
                ? mode === 'ai'
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40'
                  : 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                : mode === 'ai'
                  ? 'border-violet-300 dark:border-violet-800/80 bg-white dark:bg-slate-900 hover:border-violet-400 dark:hover:border-violet-500'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500'}`}
          >
            <input
              ref={inputRef}
              type="file"
              aria-label={t('product.uploadStep.browseLink')}
              accept=".csv,text/csv,.xlsx,.xls,.xlsm,.xlsb,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            {mode === 'ai' ? (
              <Sparkles className="mx-auto h-10 w-10 text-violet-500 dark:text-violet-400" aria-hidden="true" />
            ) : (
              <svg aria-hidden="true" className="mx-auto h-10 w-10 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
            )}
            <p className="mt-3 text-base font-semibold text-slate-700 dark:text-slate-200">
              {isParsing ? (
                t('product.uploadStep.parsingMessage')
              ) : (
                <>
                  {t('product.uploadStep.dragDropMessage')}{' '}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={`underline cursor-pointer ${
                      mode === 'ai'
                        ? 'text-violet-600 dark:text-violet-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {t('product.uploadStep.browseLink')}
                  </button>
                </>
              )}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 dark:text-slate-500">
              {fileName ||
                (mode === 'ai'
                  ? t('product.uploadStep.dropzoneAiHint', 'Choose a file and the AI will map it for you.')
                  : t('product.uploadStep.fileTypeHint'))}
            </p>
          </div>
        )}
      </div>

      {checksumSummary && (
        <div className={`mt-6 rounded-2xl border p-4 text-xs ${
          checksumSummary.checksumMatches
            ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
            : 'border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
        }`}>
          <div className="flex items-center gap-2 font-bold mb-1">
            <span>{checksumSummary.checksumMatches ? t('product.uploadStep.checksumVerified') : t('product.uploadStep.checksumNote')}</span>
          </div>
          <p>
            {t('product.uploadStep.checksumPrefix')} <strong>{Number(checksumSummary.detectedSubtotals).toLocaleString()}</strong> |
            {t('product.uploadStep.checksumParsedPrefix')} <strong>{Number(checksumSummary.parsedSum).toLocaleString()}</strong>
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-6 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4">
          <p className="font-semibold text-red-700 dark:text-red-300 mb-2">
            {t('product.uploadStep.issuesFound', { count: errors.length, plural: errors.length > 1 ? 's' : '' })}
          </p>
          <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1 max-h-40 overflow-y-auto">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Optional AI rescue: the parser could not read this sheet, so let the AI set up step 2. */}
      {ai.enabled && currentUploadedFile && errors.length > 0 && (
        <div className="mt-4 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 p-4">
          <p className="flex items-center gap-1.5 font-semibold text-violet-800 dark:text-violet-200">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {t('product.aiAssist.uploadCta')}
          </p>
          <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">{t('product.aiAssist.uploadHint')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runAiRescue()}
              disabled={
                aiRunning ||
                (ai.usage !== null &&
                  !ai.usage.unlimited &&
                  ((ai.usage.max ?? 0) <= 0 || (ai.usage.remaining ?? 0) <= 0))
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-xs transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  {t('product.aiAssist.runningChip')}
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('product.aiAssist.button')}
                </>
              )}
            </button>
            {ai.usage && !ai.usage.unlimited && (
              <span className="font-mono text-[11px] text-violet-700 dark:text-violet-300">
                {ai.usage.used}/{ai.usage.max}
              </span>
            )}
          </div>
        </div>
      )}

      {aiNotice && (
        <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-300">{aiNotice}</p>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            {t('product.uploadStep.needStartingPoint')}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadSampleCsv()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {t('product.uploadStep.csvTemplate')}
            </button>
            <button
              type="button"
              onClick={() => downloadSampleExcel()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {t('product.uploadStep.excelTemplate')}
            </button>
          </div>
        </div>

        <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            {t('product.uploadStep.sampleFilesLabel')}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={`${import.meta.env.BASE_URL}product/samples/sample_bluebeam_takeoff.csv`}
              download="sample_bluebeam_takeoff.csv"
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
            >
              {t('product.uploadStep.bluebeamSample')}
            </a>
            <a
              href={`${import.meta.env.BASE_URL}product/samples/sample_planswift_takeoff.csv`}
              download="sample_planswift_takeoff.csv"
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
            >
              {t('product.uploadStep.planswiftSample')}
            </a>
            <a
              href={`${import.meta.env.BASE_URL}product/samples/sample_trimble_agtek_takeoff.csv`}
              download="sample_trimble_agtek_takeoff.csv"
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
            >
              {t('product.uploadStep.trimbleSample')}
            </a>
            <a
              href={`${import.meta.env.BASE_URL}product/samples/sample_edge_cases_takeoff.csv`}
              download="sample_edge_cases_takeoff.csv"
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
            >
              {t('product.uploadStep.edgeCasesSample', 'Edge Cases Mega Sample')}
            </a>
          </div>
        </div>
      </div>

      <details className="group mt-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 transition-colors overflow-hidden">
        <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer select-none list-none hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {t('product.uploadStep.supportedColumnsSummary')}
            </span>
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 ml-2">
              — {t('product.uploadStep.supportedColumnsHint')}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200 group-open:rotate-180 shrink-0" aria-hidden="true" />
        </summary>

        <div className="px-5 pb-5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 text-xs">{t('product.uploadStep.ingestionTitle')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
            {t('product.uploadStep.ingestionDescription')}
          </p>

        <div className="space-y-4 my-3">
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('product.uploadStep.standardFieldsTitle', 'Standard Fields:')}
            </div>
            <code className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 block overflow-x-auto text-slate-800 dark:text-slate-200 font-mono">
              {t('product.uploadStep.standardFieldsList', 'system, item_description, size_spec, quantity, unit, avg_depth_ft')}
            </code>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('product.uploadStep.optionalFieldsTitle', 'Optional Fields:')}
            </div>
            <code className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 block overflow-x-auto text-slate-800 dark:text-slate-200 font-mono">
              {t('product.uploadStep.optionalFieldsList', 'material_cost_per_unit, labor_hours_per_unit, labor_unit_cost')}
            </code>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('product.uploadStep.fieldExamplesTitle', 'Supported Column Names & Value Examples:')}
            </div>
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 text-xs">
              <div className="space-y-2.5">
                <div className="border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">system</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({t('product.uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700 dark:text-slate-300">{t('product.uploadStep.exampleSystemHeaders', 'System, Trade, Phase, Division, Div, Category')}</span>)</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400 dark:text-slate-500">{t('product.uploadStep.valuesLabel', 'Sample values')}:</span> {t('product.uploadStep.exampleSystem', 'Plumbing, 02-31-00, Earthwork, Div 22, Site Utilities')}
                  </div>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">item_description</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({t('product.uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700 dark:text-slate-300">{t('product.uploadStep.exampleItemDescriptionHeaders', 'Description, Item Description, Scope, Name, Line Item, Item')}</span>)</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400 dark:text-slate-500">{t('product.uploadStep.valuesLabel', 'Sample values')}:</span> {t('product.uploadStep.exampleItemDescription', '4" PVC Sanitary Sewer Pipe, Trench Excavation, Water Main')}
                  </div>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">size_spec</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({t('product.uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700 dark:text-slate-300">{t('product.uploadStep.exampleSizeSpecHeaders', 'Size, Spec, Size/Spec, Pipe Size, Dimension, Material')}</span>)</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400 dark:text-slate-500">{t('product.uploadStep.valuesLabel', 'Sample values')}:</span> {t('product.uploadStep.exampleSizeSpec', '4" SCH-40, 6" SDR-35, 1/2" Type L, 8" C900')}
                  </div>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">quantity</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({t('product.uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700 dark:text-slate-300">{t('product.uploadStep.exampleQuantityHeaders', 'Qty, Quantity, Takeoff Qty, Amount, Est Qty, Count')}</span>)</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400 dark:text-slate-500">{t('product.uploadStep.valuesLabel', 'Sample values')}:</span> {t('product.uploadStep.exampleQuantity', '150, 2,450.50, 12, 500')}
                  </div>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">unit</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({t('product.uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700 dark:text-slate-300">{t('product.uploadStep.exampleUnitHeaders', 'Unit, UOM, Units, Unit of Measure, Measure')}</span>)</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400 dark:text-slate-500">{t('product.uploadStep.valuesLabel', 'Sample values')}:</span> {t('product.uploadStep.exampleUnit', 'LF, FT, EA, CY, SY, SQ FT, TONS, M, LBS')}
                  </div>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">avg_depth_ft</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({t('product.uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700 dark:text-slate-300">{t('product.uploadStep.exampleAvgDepthFtHeaders', 'Depth, Avg Depth, Depth (ft), Average Depth, Trench Depth')}</span>)</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400 dark:text-slate-500">{t('product.uploadStep.valuesLabel', 'Sample values')}:</span> {t('product.uploadStep.exampleAvgDepthFt', '4.5, 6.0, 8, 3.5\'')}
                  </div>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">material_cost_per_unit</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({t('product.uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700 dark:text-slate-300">{t('product.uploadStep.exampleMaterialCostHeaders', 'Material $/Unit, Material Unit Cost, Mat Rate, Material Price')}</span>)</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400 dark:text-slate-500">{t('product.uploadStep.valuesLabel', 'Sample values')}:</span> {t('product.uploadStep.exampleMaterialCostPerUnit', '$18.50, 42.00, $1,250.00')}
                  </div>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">labor_hours_per_unit</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({t('product.uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700 dark:text-slate-300">{t('product.uploadStep.exampleLaborHoursHeaders', 'Labor Hrs/Unit, Labor Hours, Crew Hrs/Unit, Manhours/Unit')}</span>)</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400 dark:text-slate-500">{t('product.uploadStep.valuesLabel', 'Sample values')}:</span> {t('product.uploadStep.exampleLaborHoursPerUnit', '0.25, 1.5, 0.08 hrs/unit')}
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">labor_unit_cost</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">({t('product.uploadStep.headersLabel', 'Header aliases')}: <span className="font-mono text-slate-700 dark:text-slate-300">{t('product.uploadStep.exampleLaborUnitCostHeaders', 'Labor $/Unit, Labor Unit Rate, Labor Rate/Unit, Labor Cost/Unit')}</span>)</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5 pl-2">
                    <span className="text-slate-400 dark:text-slate-500">{t('product.uploadStep.valuesLabel', 'Sample values')}:</span> {t('product.uploadStep.exampleLaborUnitCost', '$15.00/LF, $65.00/EA, 25.00')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t('product.uploadStep.needMoreDetail')}{' '}
            <Link
              to="/guide"
              className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              {t('product.uploadStep.readFullGuide')}
            </Link>
            .
          </p>
        </div>
      </details>

      <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
        {t('product.uploadStep.needMoreDetail')}{' '}
        <Link
          to="/guide"
          className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
        >
          {t('product.uploadStep.readFullGuide')}
        </Link>
      </p>

      {/* Interactive Column Mapping Modal */}
      {mappingModalData && (
        <ColumnMappingModal
          headers={mappingModalData.headers}
          rawRows={mappingModalData.rawRows}
          columns={mappingModalData.columns}
          initialMapping={mappingModalData.currentMapping}
          matchConfidences={mappingModalData.matchConfidences}
          overallConfidence={mappingModalData.overallConfidence}
          sampleMatrix={mappingModalData.rawMatrix || mappingModalData.sampleMatrix || []}
          initialHeaderRowIndex={mappingModalData.headerRowIndex ?? 0}
          sheetNames={mappingModalData.sheetNames}
          activeSheetName={mappingModalData.activeSheetName}
          subTables={mappingModalData.subTables || []}
          activeTableId={mappingModalData.activeTableId}
          aiAvailable={ai.enabled}
          aiUsage={ai.usage}
          aiAutoRun={aiAutoRun}
          onAiAssist={handleAiAssistFromModal}
          onSheetChange={handleSheetChange}
          onTableChange={handleTableChange}
          onConfirm={handleMappingConfirm}
          onCancel={() => {
            setMappingModalData(null);
            setAiAutoRun(false);
          }}
        />
      )}
    </div>
  );
}
