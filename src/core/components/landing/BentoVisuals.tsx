import { Check, Download, FileText, PenLine, Printer, Ruler } from 'lucide-react';
import { formatCurrency } from '@/core/lib/shared/formatting';

/**
 * Live mini-visuals for the landing Bento tiles.
 *
 * These are real DOM marks built from the shared `--lp-*` palette rather than images, so they
 * stay crisp at every zoom level, follow the light/dark theme, and never need alt text or
 * placeholder art. Each one is decorative: `BentoCard` wraps it in an `aria-hidden` layer and
 * the tile copy carries the meaning.
 */

const VISUAL_SURFACE = 'border-b border-[var(--lp-rule)] bg-[var(--lp-tint)] p-5 pt-6 sm:p-6 sm:pt-7';

/** Import tile: the source spreadsheets plus the column aliases the mapper matched. */
export function ColumnMappingVisual({
  mappedLabel,
  columnLabels,
  sources = ['Bluebeam', 'PlanSwift', 'Trimble'],
}: Readonly<{
  mappedLabel: string;
  columnLabels: string[];
  sources?: string[];
}>) {
  return (
    <div className={VISUAL_SURFACE}>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source) => (
          <span
            key={source}
            className="border border-[var(--lp-rule)] bg-[var(--lp-card)] px-2 py-1 font-mono text-[10.5px] tracking-[0.03em]"
          >
            {source}
          </span>
        ))}
      </div>
      <p className="mt-3.5 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--lp-accent-text)]">
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {mappedLabel}
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {columnLabels.map((label) => (
          <span
            key={label}
            className="truncate border border-dashed border-[var(--lp-rule)] px-1.5 py-1 font-mono text-[10.5px] text-[var(--lp-muted)]"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Proposal tile: a trimmed proposal document with its signed total. */
export function ProposalVisual({
  documentTitle,
  eSigned,
  lines,
  totalLabel,
  totalAmount,
}: Readonly<{
  documentTitle: string;
  eSigned: string;
  lines: Array<{ label: string; amount: number }>;
  totalLabel: string;
  totalAmount: number;
}>) {
  return (
    <div className={VISUAL_SURFACE}>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[13px] font-extrabold tracking-[-0.02em]">{documentTitle}</span>
        <span className="shrink-0 border border-[var(--lp-accent)] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.05em] text-[var(--lp-accent-text)]">
          {eSigned}
        </span>
      </div>
      <ul className="mt-3 grid gap-1.5">
        {lines.map((line) => (
          <li
            key={line.label}
            className="flex items-baseline justify-between gap-3 border-b border-[var(--lp-rule)] pb-1.5 text-[12.5px]"
          >
            <span className="truncate">{line.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-[var(--lp-muted)]">
              {formatCurrency(line.amount)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 bg-[var(--lp-accent)] px-3 py-1.5 text-white">
        <span className="text-[12px] font-bold">{totalLabel}</span>
        <b className="font-mono text-[15px] tabular-nums">{formatCurrency(totalAmount)}</b>
      </div>
    </div>
  );
}

/**
 * Earthwork tile: the volume formula plus the value the calculator on this page is producing
 * right now, so the tile is live rather than static copy.
 */
export function VolumeFormulaVisual({
  formula,
  output,
  units,
}: Readonly<{
  formula: string;
  output: string;
  units: string;
}>) {
  return (
    <div className={VISUAL_SURFACE}>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-mono text-[13px] tracking-[-0.01em]">{formula}</span>
        <span className="inline-flex shrink-0 items-center justify-center border-2 border-[var(--lp-ink)] bg-[var(--lp-card)] p-1.5">
          <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-[26px] font-semibold tabular-nums tracking-[-0.03em]">{output}</span>
        <small className="text-[12px] text-[var(--lp-muted)]">{units}</small>
      </p>
    </div>
  );
}

/** Takeoff grid tile: an editable row with the active cell marked, like the real workspace. */
export function EditableGridVisual({
  headers,
  rows,
}: Readonly<{
  headers: { item: string; qty: string; rate: string };
  rows: Array<{ label: string; qty: string; rate: number }>;
}>) {
  return (
    <div className={VISUAL_SURFACE}>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--lp-muted)]">
        <span>{headers.item}</span>
        <span className="text-right">{headers.qty}</span>
        <span className="text-right">{headers.rate}</span>
      </div>
      <div className="mt-1.5 grid gap-1">
        {rows.map((row, index) => {
          const active = index === 1;
          return (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-[var(--lp-rule)] pb-1 text-[12px] ${
                active ? 'bg-[var(--lp-card)]' : ''
              }`}
            >
              <span className="truncate">{row.label}</span>
              <span className="text-right font-mono tabular-nums text-[var(--lp-muted)]">{row.qty}</span>
              <span
                className={`text-right font-mono tabular-nums ${
                  active ? 'border-b-2 border-[var(--lp-accent)] font-semibold' : ''
                }`}
              >
                {formatCurrency(row.rate)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Export tile: the deliverables the same numbers can leave as (PDF only — that is what ships). */
export function ExportFormatVisual({
  items,
}: Readonly<{
  items: Array<{ label: string; format: 'pdf' | 'print' }>;
}>) {
  const icons = { pdf: FileText, print: Printer } as const;

  return (
    <div className={VISUAL_SURFACE}>
      <ul className="grid gap-1.5">
        {items.map(({ label, format }) => {
          const Icon = icons[format];
          return (
            <li
              key={label}
              className="flex items-center gap-2.5 border border-[var(--lp-rule)] bg-[var(--lp-card)] px-2.5 py-1.5 text-[12px]"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
              <Download className="ml-auto h-3.5 w-3.5 shrink-0 text-[var(--lp-muted)]" aria-hidden="true" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Signature banner tile: the read-only client portal and the recorded signature. */
export function SignatureVisual({
  clientUrl,
  signature,
  eSigned,
}: Readonly<{
  clientUrl: string;
  signature: string;
  eSigned: string;
}>) {
  return (
    <div className="w-full lg:w-[320px]">
      <div className="flex items-center gap-2 border border-[var(--lp-rule)] bg-[var(--lp-card-alt)] px-2.5 py-1.5 font-mono text-[11px]">
        <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{clientUrl}</span>
      </div>
      <div className="mt-4 border-b-2 border-[var(--lp-ink)] pb-1 text-[22px] italic tracking-[-0.01em]">
        {signature}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[11px] text-[var(--lp-muted)]">{eSigned}</span>
        <span className="h-2 w-2 shrink-0 bg-[var(--lp-accent)]" aria-hidden="true" />
      </div>
    </div>
  );
}
