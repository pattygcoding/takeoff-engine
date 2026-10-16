import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, Download, FileText, PenLine, Printer } from 'lucide-react';
import { formatCurrency } from '@/core/lib/shared/formatting';

export type PreviewTabKey = 'takeoff' | 'proposal' | 'export';

const TAB_ORDER: PreviewTabKey[] = ['takeoff', 'proposal', 'export'];

export interface PreviewRow {
  label: string;
  qty: string;
  unit: number;
  amount: number;
}

interface PanelRowProps {
  columns: { item: string; qty: string; unit: string; amount: string };
  rows: PreviewRow[];
  totalLabel: string;
  totalAmount: number;
}

export interface ProductPreviewMockupProps {
  /** Address shown in the browser chrome. */
  urlLabel: string;
  /** Accessible name of the tab list. */
  tablistLabel: string;
  tabLabels: Record<PreviewTabKey, string>;
  /** Small status note beside the address bar. */
  hint: string;
  fileLabel: string;
  mappedLabel: string;
  columns: { item: string; qty: string; unit: string; amount: string };
  rows: PreviewRow[];
  totalLabel: string;
  totalAmount: number;
  proposal: {
    title: string;
    project: string;
    number: string;
    signature: string;
    acceptedBy: string;
    eSigned: string;
    note: string;
  };
  exports: {
    heading: string;
    prepared: string;
    /** Only formats the app can really produce — PDF today (see product/lib/pdfExport). */
    items: Array<{ label: string; format: 'pdf' | 'print' }>;
  };
  eSign: { heading: string; status: string; clientUrl: string; note: string };
}

/**
 * Interactive device mockup used as the hero's product preview.
 *
 * Instead of a screenshot or stock device art, the frame (a browser window on a laptop base,
 * drawn entirely with the shared palette) hosts three *live* screens of the real workspace:
 * the imported takeoff grid, the generated client proposal, and the export/e-signature
 * hand-off. A proper `tablist` makes the screens switchable with the mouse and the keyboard
 * (arrow keys, Home/End), and each panel is labelled by its tab.
 */
export default function ProductPreviewMockup({
  urlLabel,
  tablistLabel,
  tabLabels,
  hint,
  fileLabel,
  mappedLabel,
  columns,
  rows,
  totalLabel,
  totalAmount,
  proposal,
  exports,
  eSign,
}: Readonly<ProductPreviewMockupProps>) {
  const [tab, setTab] = useState<PreviewTabKey>('takeoff');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (index: number) => {
    setTab(TAB_ORDER[index]);
    tabRefs.current[index]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = TAB_ORDER.indexOf(tab);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab((current + 1) % TAB_ORDER.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab((current - 1 + TAB_ORDER.length) % TAB_ORDER.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(TAB_ORDER.length - 1);
    }
  };

  return (
    <div className="relative">
      <div className="relative overflow-hidden border-2 border-[var(--lp-ink)] bg-[var(--lp-card)] shadow-[var(--lp-shadow-frame)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b-2 border-[var(--lp-ink)] bg-[var(--lp-inverse)] px-3 py-2 text-[var(--lp-inverse-text)] sm:px-4">
          <span aria-hidden="true" className="flex shrink-0 gap-1.5">
            <span className="h-2.5 w-2.5 bg-[var(--lp-inverse-rule)]" />
            <span className="h-2.5 w-2.5 bg-[var(--lp-inverse-rule)]" />
            <span className="h-2.5 w-2.5 bg-[var(--lp-accent-on-ink)]" />
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{urlLabel}</span>
          <span className="hidden shrink-0 font-mono text-[10.5px] sm:inline">{hint}</span>
        </div>

        {/* Screen switcher */}
        <div role="tablist" aria-label={tablistLabel} className="flex border-b-2 border-[var(--lp-ink)] bg-[var(--lp-card-alt)]">
          {TAB_ORDER.map((key, index) => {
            const selected = tab === key;
            return (
              <button
                key={key}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`preview-tab-${key}`}
                aria-selected={selected}
                aria-controls={`preview-panel-${key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(key)}
                onKeyDown={handleTabKeyDown}
                className={`min-w-0 flex-1 truncate border-r border-[var(--lp-rule)] px-2 py-2.5 text-[11.5px] font-semibold transition-colors last:border-r-0 sm:px-3 sm:text-[12.5px] ${
                  selected
                    ? 'bg-[var(--lp-card)] text-[var(--lp-ink)] shadow-[inset_0_-3px_0_0_var(--lp-accent)]'
                    : 'text-[var(--lp-muted)] hover:bg-[var(--lp-card)] hover:text-[var(--lp-ink)]'
                }`}
              >
                {tabLabels[key]}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`preview-panel-${tab}`}
          aria-labelledby={`preview-tab-${tab}`}
          className="min-h-[300px] p-3 sm:p-4"
        >
          {tab === 'takeoff' ? (
            <TakeoffPanel
              fileLabel={fileLabel}
              mappedLabel={mappedLabel}
              columns={columns}
              rows={rows}
              totalLabel={totalLabel}
              totalAmount={totalAmount}
            />
          ) : null}
          {tab === 'proposal' ? (
            <ProposalPanel
              proposal={proposal}
              columns={columns}
              rows={rows}
              totalLabel={totalLabel}
              totalAmount={totalAmount}
            />
          ) : null}
          {tab === 'export' ? <ExportPanel exports={exports} eSign={eSign} /> : null}
        </div>
      </div>

      {/* Laptop base, drawn with the palette rather than a device image */}
      <div aria-hidden="true" className="mx-auto h-3 w-[92%] border-x-2 border-b-2 border-[var(--lp-ink)] bg-[var(--lp-card-alt)]" />
      <div aria-hidden="true" className="mx-auto h-1.5 w-[26%] bg-[var(--lp-rule)]" />
    </div>
  );
}

/** Shared line-item table used by the takeoff and proposal screens. */
function LineItemTable({ columns, rows }: Readonly<Pick<PanelRowProps, 'columns' | 'rows'>>) {
  // `table-fixed` with explicit widths keeps the item column readable; without it the browser
  // collapses that column and the descriptions ellipsize after a few characters.
  return (
    <table className="mt-2 w-full table-fixed border-collapse text-[12.5px]">
      <thead>
        <tr className="text-[10px] uppercase tracking-[0.06em] text-[var(--lp-muted)]">
          <th scope="col" className="w-[38%] py-1.5 text-left font-semibold">{columns.item}</th>
          <th scope="col" className="w-[24%] py-1.5 text-right font-semibold">{columns.qty}</th>
          <th scope="col" className="hidden w-[18%] py-1.5 text-right font-semibold sm:table-cell">{columns.unit}</th>
          <th scope="col" className="w-[20%] py-1.5 text-right font-semibold">{columns.amount}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-t border-[var(--lp-rule)] transition-colors hover:bg-[var(--lp-tint)]">
            <td className="truncate py-1.5 pr-2">{row.label}</td>
            <td className="truncate py-1.5 text-right font-mono text-[11.5px] tabular-nums">{row.qty}</td>
            <td className="hidden truncate py-1.5 text-right font-mono text-[11.5px] tabular-nums sm:table-cell">
              {formatCurrency(row.unit)}
            </td>
            <td className="truncate py-1.5 text-right font-mono text-[11.5px] tabular-nums">
              {formatCurrency(row.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Screen 1: the imported spreadsheet with its auto-mapped columns. */
function TakeoffPanel({
  fileLabel,
  mappedLabel,
  columns,
  rows,
  totalLabel,
  totalAmount,
}: Readonly<{ fileLabel: string; mappedLabel: string } & PanelRowProps>) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--lp-rule)] pb-2">
        <span className="min-w-0 truncate font-mono text-[11px]">{fileLabel}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[var(--lp-accent-text)]">
          <Check className="h-3 w-3" aria-hidden="true" />
          {mappedLabel}
        </span>
      </div>
      <LineItemTable columns={columns} rows={rows} />
      <div className="mt-2 flex items-center justify-between gap-3 bg-[var(--lp-accent)] px-3 py-2 text-white">
        <span className="text-[12px] font-bold">{totalLabel}</span>
        <b className="font-mono text-[15px] tabular-nums">{formatCurrency(totalAmount)}</b>
      </div>
    </div>
  );
}

/** Screen 2: the generated client proposal, including the signature block. */
function ProposalPanel({
  proposal,
  columns,
  rows,
  totalLabel,
  totalAmount,
}: { proposal: ProductPreviewMockupProps['proposal'] } & PanelRowProps) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-b-2 border-[var(--lp-ink)] pb-3">
        <div className="min-w-0">
          <p className="text-[16px] font-extrabold tracking-[-0.02em]">{proposal.title}</p>
          <p className="truncate text-[11.5px] text-[var(--lp-muted)]">{proposal.project}</p>
        </div>
        <p className="shrink-0 text-right font-mono text-[10.5px] text-[var(--lp-muted)]">{proposal.number}</p>
      </div>
      <LineItemTable columns={columns} rows={rows} />
      <div className="mt-2 flex items-center justify-between gap-3 bg-[var(--lp-accent)] px-3 py-2 text-white">
        <span className="text-[12px] font-bold">{totalLabel}</span>
        <b className="font-mono text-[15px] tabular-nums">{formatCurrency(totalAmount)}</b>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate border-b border-[var(--lp-ink)] pb-0.5 text-[18px] italic tracking-[-0.01em]">
            {proposal.signature}
          </p>
          <p className="mt-1 text-[10.5px] text-[var(--lp-muted)]">{proposal.acceptedBy}</p>
          <p className="mt-0.5 text-[10.5px] text-[var(--lp-muted)]">{proposal.note}</p>
        </div>
        <span className="shrink-0 border-2 border-[var(--lp-accent)] px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.05em] text-[var(--lp-accent-text)]">
          {proposal.eSigned}
        </span>
      </div>
    </div>
  );
}

/** Screen 3: the deliverables and the client acceptance hand-off. */
function ExportPanel({ exports, eSign }: Readonly<Pick<ProductPreviewMockupProps, 'exports' | 'eSign'>>) {
  const icons = { pdf: FileText, print: Printer } as const;

  // These two labels are preview chrome, not document sections: they are deliberately `<p>` rather
  // than headings. As `<h3>` they sat directly under the hero's `<h1>` (the widget lives in the
  // hero), which axe reports as a skipped heading level; promoting them to `<h2>` would instead
  // inject "Deliverables" / "Client acceptance" into the page outline next to the real sections.
  const labelClass = 'text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--lp-muted)]';

  return (
    <div className="grid gap-5">
      <section>
        <p className={labelClass}>{exports.heading}</p>
        <ul className="mt-2 grid gap-1.5">
          {exports.items.map(({ label, format }) => {
            const Icon = icons[format];
            return (
              <li
                key={label}
                className="flex items-center gap-2.5 border border-[var(--lp-rule)] bg-[var(--lp-card-alt)] px-2.5 py-2 text-[12.5px]"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
                <span className="ml-auto shrink-0 text-[11px] text-[var(--lp-muted)]">{exports.prepared}</span>
                <Download className="h-3.5 w-3.5 shrink-0 text-[var(--lp-muted)]" aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <p className={labelClass}>{eSign.heading}</p>
        <div className="mt-2 border-2 border-[var(--lp-ink)] bg-[var(--lp-card-alt)] p-3">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold">
            <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {eSign.status}
          </p>
          <p className="mt-2 flex items-center gap-2 border border-[var(--lp-rule)] bg-[var(--lp-card)] px-2.5 py-1.5 font-mono text-[11px]">
            <span className="min-w-0 truncate">{eSign.clientUrl}</span>
          </p>
          <p className="mt-2 text-[11.5px] text-[var(--lp-muted)]">{eSign.note}</p>
        </div>
      </section>
    </div>
  );
}
