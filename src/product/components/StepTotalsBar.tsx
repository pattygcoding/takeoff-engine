import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { formatMarkupBasisNote, formatMarkupLine } from '@/product/lib/markupFormatting';
import { useTranslation } from '@/core/components/context/I18nContext';
import type { EstimateTotals } from '@/types/models';

/** Combined equipment line-item cost plus lump sum, matching ResultsStep. */
function equipmentLineTotal(totals: EstimateTotals): number {
  return (totals.totalEquipmentLineItemCost ?? 0) + (totals.equipmentLumpSum ?? 0);
}

/** Sub-label noting the equipment mobilisation portion, when present. */
function equipmentMobNote(totals: EstimateTotals): string | undefined {
  if ((totals.equipmentLumpSum ?? 0) <= 0) return undefined;
  return `Incl. ${formatCurrency(totals.equipmentLumpSum)} mob`;
}

/**
 * Sticky live totals for Step 2.
 *
 * Collapsed it shows the headline numbers a bidder watches while editing (material, labor + hours,
 * equipment/mobilization, direct cost) plus the final bid. Expanding reveals the same breakdown
 * Step 3 renders, including the markup basis for overhead, contingency and profit.
 *
 * `sticky` rather than `fixed`: it pins to the bottom of the viewport while the grid scrolls, then
 * scrolls away at the end of Step 2 so the global footer stays reachable.
 */
export default function StepTotalsBar({
  totals,
  loading,
  stale,
  itemCount,
}: Readonly<{
  totals: EstimateTotals;
  loading: boolean;
  stale: boolean;
  itemCount: number;
}>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const hasEquipmentLineItems = (totals.totalEquipmentLineItemCost ?? 0) > 0;
  const equipmentTotal = hasEquipmentLineItems ? equipmentLineTotal(totals) : (totals.equipmentLumpSum ?? 0);
  const isEmpty = itemCount === 0;

  const status = loading
    ? t('product.liveTotals.updating', 'Updating…')
    : stale
      ? t('product.liveTotals.stale', "Couldn't refresh totals — showing the last update.")
      : isEmpty
        ? t('product.liveTotals.empty', 'Add a line item to see live totals.')
        : '';

  return (
    <div className="no-print sticky bottom-0 z-30 mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-[0_-8px_24px_rgba(15,23,42,0.10)]">
      {expanded && (
        <div
          id="live-totals-breakdown"
          className="max-h-[45vh] overflow-y-auto border-b border-slate-200 dark:border-slate-700 p-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <BreakdownCard
              label={t('product.resultsStep.totalMaterialCost')}
              value={formatCurrency(totals.totalMaterialCost)}
            />
            <BreakdownCard
              label={t('product.resultsStep.totalLabor')}
              value={formatCurrency(totals.totalLaborCost)}
              sub={t('product.resultsStep.laborHrs', { count: formatNumber(totals.totalLaborHours) })}
            />
            {hasEquipmentLineItems ? (
              <BreakdownCard
                label={t('product.resultsStep.equipmentLineItems', 'Equipment & Machinery')}
                value={formatCurrency(equipmentLineTotal(totals))}
                sub={equipmentMobNote(totals)}
              />
            ) : (
              <BreakdownCard
                label={t('product.resultsStep.equipmentMobilization')}
                value={formatCurrency(totals.equipmentLumpSum)}
              />
            )}
            {(totals.miscCost ?? 0) > 0 && (
              <BreakdownCard
                label={t('product.resultsStep.miscellaneousCosts')}
                value={formatCurrency(totals.miscCost)}
              />
            )}
            {(totals.scopeAddonsCost ?? 0) > 0 && (
              <BreakdownCard
                label={t('product.resultsStep.scopeAddonsCost', 'Scope Add-Ons')}
                value={formatCurrency(totals.scopeAddonsCost)}
                sub={t('product.resultsStep.scopeAddonsExcludedSub', 'Not included in total')}
              />
            )}
            <BreakdownCard
              label={t('product.resultsStep.totalDirectCost')}
              value={formatCurrency(totals.totalDirectCost)}
            />
            <BreakdownCard
              label={t('product.resultsStep.overheadFixed')}
              value={formatCurrency(totals.overheadAmount)}
              sub={formatMarkupLine(t('product.resultsStep.overheadFixed'), totals.overheadAmount, totals.overheadPct, t)}
            />
            <BreakdownCard
              label={t('product.resultsStep.contingencyFixed')}
              value={formatCurrency(totals.contingencyAmount)}
              sub={formatMarkupLine(t('product.resultsStep.contingencyFixed'), totals.contingencyAmount, totals.contingencyPct, t)}
            />
            <BreakdownCard
              label={t('product.resultsStep.profitFixed')}
              value={formatCurrency(totals.profitAmount)}
              sub={formatMarkupLine(t('product.resultsStep.profitFixed'), totals.profitAmount, totals.profitPct, t)}
            />
            <BreakdownCard
              label={t('product.resultsStep.finalBidAmount')}
              value={formatCurrency(totals.finalBidAmount)}
              highlight
            />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
            {formatMarkupBasisNote(t)}
          </p>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Stat
              label={t('product.resultsStep.totalMaterialCost')}
              value={formatCurrency(totals.totalMaterialCost)}
            />
            <Stat
              label={t('product.resultsStep.totalLabor')}
              value={formatCurrency(totals.totalLaborCost)}
              sub={t('product.resultsStep.laborHrs', { count: formatNumber(totals.totalLaborHours) })}
            />
            <Stat
              label={t('product.liveTotals.equipmentShort', 'Equip / Mob')}
              value={formatCurrency(equipmentTotal)}
            />
            <Stat
              label={t('product.resultsStep.totalDirectCost')}
              value={formatCurrency(totals.totalDirectCost)}
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('product.resultsStep.finalBidAmount')}
              </p>
              <p className="font-mono text-lg font-bold tracking-tight text-blue-700 dark:text-blue-300">
                {formatCurrency(totals.finalBidAmount)}
              </p>
            </div>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls="live-totals-breakdown"
              aria-label={
                expanded
                  ? t('product.liveTotals.collapseAria', 'Hide the full cost breakdown')
                  : t('product.liveTotals.expandAria', 'Show the full cost breakdown')
              }
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {expanded
                ? t('product.liveTotals.hideBreakdown', 'Hide breakdown')
                : t('product.liveTotals.showBreakdown', 'Show breakdown')}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {status && (
          <p
            role="status"
            className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-medium ${
              stale && !loading
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
            {status}
          </p>
        )}
      </div>
    </div>
  );
}

/** One compact headline figure in the collapsed bar. */
function Stat({ label, value, sub }: Readonly<{ label: string; value: string; sub?: string }>) {
  return (
    <div className="min-w-0">
      <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="whitespace-nowrap font-mono text-sm font-bold text-slate-900 dark:text-white">
        {value}
        {sub && (
          <span className="ml-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">{sub}</span>
        )}
      </p>
    </div>
  );
}

/** One card in the expanded breakdown, mirroring Step 3's summary cards. */
function BreakdownCard({
  label,
  value,
  sub,
  highlight,
}: Readonly<{ label: string; value: string; sub?: string; highlight?: boolean }>) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? 'border-blue-300 dark:border-blue-700 bg-blue-50/80 dark:bg-blue-950/60'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 font-mono text-lg font-bold tracking-tight ${
          highlight ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] leading-snug text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}

