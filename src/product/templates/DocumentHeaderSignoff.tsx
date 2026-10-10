import React from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from '@/core/components/context/I18nContext';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import type { Branding, EstimateLineItem, EstimateSystem, EstimateTotals, Project } from '@/types/models';

export const DEFAULT_DOC_ACCENT = '#1e3a8a';

export interface DocumentFigure {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
}

export interface DocumentColumn {
  header: string;
  align?: string;
  render: (item: EstimateLineItem) => ReactNode;
  strong?: boolean;
  muted?: boolean;
  className?: string;
}

export interface SignatureParty {
  title: string;
  subtitle?: string;
}

function formatPct(value: number | string | null | undefined): string {
  return formatNumber(Number(value) || 0, 1).replace(/\.0$/, '');
}

/**
 * Professional letterhead: accent rule, company block, document title and project meta.
 */
export function DocumentLetterhead({
  branding,
  title,
  project,
  accent = DEFAULT_DOC_ACCENT,
  badge,
}: {
  branding?: Branding | null;
  title: ReactNode;
  project?: Project | null;
  accent?: string;
  badge?: ReactNode;
}) {
  const { t } = useTranslation();
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const metaRows = [
    [t('product.templates.header.metaProject'), project?.name || t('product.templates.header.defaultProjectName')],
    project?.client_name && [t('product.templates.header.metaClient'), project.client_name],
    project?.location && [t('product.templates.header.metaSite'), project.location],
    [t('product.templates.header.metaDate'), today],
  ].filter(Boolean) as Array<[string, ReactNode]>;

  return (
    <>
      <div className="h-1.5 mb-6 rounded-sm" style={{ backgroundColor: accent }} />
      <header className="flex items-start justify-between gap-6 pb-5 border-b-2" style={{ borderColor: accent }}>
        <div className="min-w-0 space-y-0.5">
          {branding?.companyLogoUrl && (
            <img
              src={branding.companyLogoUrl}
              alt={branding.companyName || t('product.templates.header.companyLogoAlt')}
              className="h-12 w-auto object-contain mb-2"
            />
          )}
          <p className="text-base font-bold text-slate-900">
            {branding?.companyName || t('product.templates.header.defaultCompanyName')}
          </p>
          {branding?.companyAddress && <p className="text-slate-500">{branding.companyAddress}</p>}
          {branding?.companyPhone && (
            <p className="text-slate-500">{t('product.templates.header.phonePrefix', { phone: branding.companyPhone })}</p>
          )}
          {branding?.licenseNumber && (
            <p className="text-slate-500">{t('product.templates.header.licensePrefix', { license: branding.licenseNumber })}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <h1 className="text-xl font-bold uppercase tracking-[0.12em] max-w-[320px] ml-auto leading-tight" style={{ color: accent }}>
            {title}
          </h1>
          {badge && (
            <span className="inline-block mt-1.5 px-2 py-0.5 border border-rose-300 text-rose-700 text-[9px] font-bold uppercase tracking-widest rounded-sm">
              {badge}
            </span>
          )}
          <table className="ml-auto mt-3 text-[11px]">
            <tbody>
              {metaRows.map(([label, value]) => (
                <tr key={label}>
                  <td className="pr-3 py-0.5 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</td>
                  <td className="py-0.5 text-right font-semibold text-slate-900 max-w-[220px] break-words">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </header>
    </>
  );
}

export function DocumentSectionHeading({
  accent = DEFAULT_DOC_ACCENT,
  children,
}: {
  accent?: string;
  children: ReactNode;
}) {
  return (
    <h2
      className="mb-2 pb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-700 border-b break-after-avoid"
      style={{ borderColor: accent }}
    >
      {children}
    </h2>
  );
}

/**
 * Bordered strip of headline figures; the last (highlight) cell is filled with the accent color.
 */
export function DocumentKeyFigures({
  figures,
  highlight,
  accent = DEFAULT_DOC_ACCENT,
}: {
  figures: DocumentFigure[];
  highlight?: DocumentFigure;
  accent?: string;
}) {
  const cols = figures.length + (highlight ? 1 : 0);
  return (
    <section
      className="mt-6 grid border border-slate-300 break-inside-avoid"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {figures.map((fig) => (
        <div key={String(fig.label)} className="px-4 py-3 border-r border-slate-300 bg-slate-50">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{fig.label}</p>
          <p className="mt-0.5 text-base font-bold text-slate-900">{fig.value}</p>
          {fig.note && <p className="text-[10px] text-slate-500">{fig.note}</p>}
        </div>
      ))}
      {highlight && (
        <div className="px-4 py-3 text-white" style={{ backgroundColor: accent }}>
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{highlight.label}</p>
          <p className="mt-0.5 text-base font-bold">{highlight.value}</p>
        </div>
      )}
    </section>
  );
}

/**
 * Line items grouped by system with a header row per system and an optional subtotal row.
 * columns: [{ header, align?: 'right', render(item), strong?: bool, muted?: bool, className?: string }]
 */
export function DocumentSystemTable({
  bySystem,
  columns,
  subtotal,
  headerAside,
  accent = DEFAULT_DOC_ACCENT,
}: {
  bySystem?: EstimateSystem[];
  columns: DocumentColumn[];
  subtotal?: (sys: EstimateSystem) => ReactNode;
  headerAside?: (sys: EstimateSystem) => ReactNode;
  accent?: string;
}) {
  const { t } = useTranslation();

  if (!bySystem?.length) {
    return <p className="py-6 text-center text-slate-400 italic">{t('product.templates.shared.noItems')}</p>;
  }

  const cellClass = (col: DocumentColumn, ci: number) =>
    `py-1.5 px-2 ${col.align === 'right' ? 'text-right' : ''} ${
      col.className ?? (col.strong ? 'font-semibold text-slate-900' : col.muted ? 'text-slate-500' : ci === 0 ? 'font-medium text-slate-900' : '')
    }`;

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-y border-slate-300 bg-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-600">
          {columns.map((col) => (
            <th key={col.header} className={`py-2 px-2 ${col.align === 'right' ? 'text-right' : ''}`}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      {bySystem.map((sys) => (
        <tbody key={sys.system}>
          <tr className="break-after-avoid">
            <td colSpan={columns.length} className="pt-4 pb-1.5 px-2 border-b border-slate-300">
              <div className="flex items-baseline justify-between gap-3">
                <span>
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accent }}>
                    {sys.system}
                  </span>
                  <span className="ml-2 text-[10px] text-slate-400">
                    {t('product.templates.shared.itemsCount', { count: sys.items.length })}
                  </span>
                </span>
                {headerAside && <span className="font-bold text-slate-900">{headerAside(sys)}</span>}
              </div>
            </td>
          </tr>
          {sys.items.map((it, idx) => (
            <tr key={idx} className="border-b border-slate-100 even:bg-slate-50/70 break-inside-avoid">
              {columns.map((col, ci) => (
                <td key={col.header} className={cellClass(col, ci)}>
                  {col.render(it)}
                </td>
              ))}
            </tr>
          ))}
          {subtotal && (
            <tr className="break-inside-avoid border-t border-slate-300">
              <td
                colSpan={columns.length - 1}
                className="py-1.5 px-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500"
              >
                {t('product.templates.shared.systemSubtotal', { system: sys.system })}
              </td>
              <td className="py-1.5 px-2 text-right font-bold text-slate-900">{subtotal(sys)}</td>
            </tr>
          )}
        </tbody>
      ))}
    </table>
  );
}

/**
 * Right-aligned internal cost roll-up from direct costs through markups to the final bid.
 */
export function DocumentCostSummary({ totals, accent = DEFAULT_DOC_ACCENT }: { totals: EstimateTotals; accent?: string }) {
  const { t } = useTranslation();
  const k = (key: string) => t(`product.templates.shared.${key}`);

  const markupLabel = (labelKey: string, type?: string, pct?: number | string | null) =>
    type === 'fixed' ? k(labelKey) : t('product.templates.shared.labelWithPct', { label: k(labelKey), pct: formatPct(pct) });

  const rows = [
    { label: k('materialCost'), value: totals.totalMaterialCost },
    {
      label: k('laborCost'),
      note: t('product.templates.shared.hoursUnit', { hours: formatNumber(totals.totalLaborHours) }),
      value: totals.totalLaborCost,
    },
    (totals.totalEquipmentLineItemCost ?? 0) > 0 && { label: k('equipmentLineItems'), value: totals.totalEquipmentLineItemCost },
    { label: k('equipmentMobilization'), value: totals.equipmentLumpSum },
    (totals.miscCost ?? 0) > 0 && { label: k('miscCost'), value: totals.miscCost },
    { label: k('totalDirectCost'), value: totals.totalDirectCost, subtotal: true },
    { label: markupLabel('overhead', totals.overheadType, totals.overheadPct), value: totals.overheadAmount },
    { label: markupLabel('contingency', totals.contingencyType, totals.contingencyPct), value: totals.contingencyAmount },
    { label: markupLabel('profit', totals.profitType, totals.profitPct), value: totals.profitAmount },
  ].filter(Boolean) as Array<{
    label: ReactNode;
    value: number | string | null | undefined;
    note?: ReactNode;
    subtotal?: boolean;
  }>;

  return (
    <section className="mt-8 flex justify-end break-inside-avoid">
      <div className="w-full max-w-[340px]">
        <DocumentSectionHeading accent={accent}>{k('costSummaryHeading')}</DocumentSectionHeading>
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((row) => (
              <tr
                key={String(row.label)}
                className={row.subtotal ? 'border-t border-slate-400 font-bold text-slate-900' : 'border-b border-slate-100'}
              >
                <td className="py-1.5 pr-3">
                  {row.label}
                  {row.note && <span className="ml-1.5 text-[10px] text-slate-400">({row.note})</span>}
                </td>
                <td className="py-1.5 text-right">{formatCurrency(row.value)}</td>
              </tr>
            ))}
            <DocumentTotalRow label={k('finalBidAmount')} value={formatCurrency(totals.finalBidAmount)} accent={accent} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DocumentTotalRow({
  label,
  value,
  accent = DEFAULT_DOC_ACCENT,
  colSpan = 1,
}: {
  label: ReactNode;
  value: ReactNode;
  accent?: string;
  colSpan?: number;
}) {
  return (
    <tr className="text-white" style={{ backgroundColor: accent }}>
      <td colSpan={colSpan} className="py-2 px-2 text-[11px] font-bold uppercase tracking-wider">{label}</td>
      <td className="py-2 px-2 text-right text-sm font-bold">{value}</td>
    </tr>
  );
}

/**
 * Signature lines. parties: [{ title, subtitle? }]; showPrintedName adds a name/title line for contract use.
 */
export function DocumentSignatureBlock({
  heading,
  intro,
  parties,
  showPrintedName = false,
  accent = DEFAULT_DOC_ACCENT,
}: {
  heading: ReactNode;
  intro?: ReactNode;
  parties: SignatureParty[];
  showPrintedName?: boolean;
  accent?: string;
}) {
  const { t } = useTranslation();

  return (
    <section className="mt-10 break-inside-avoid">
      <DocumentSectionHeading accent={accent}>{heading}</DocumentSectionHeading>
      {intro && <p className="text-slate-600">{intro}</p>}
      <div className="grid grid-cols-2 gap-10 pt-4">
        {parties.map((party) => (
          <div key={party.title}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{party.title}</p>
            {party.subtitle && <p className="text-slate-500">{party.subtitle}</p>}
            <div className="border-b border-slate-400 h-9" />
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>{t('product.templates.signOff.authorizedSignature')}</span>
              <span>{t('product.templates.signOff.date')}</span>
            </div>
            {showPrintedName && (
              <>
                <div className="border-b border-slate-400 h-7" />
                <p className="mt-1 text-[10px] text-slate-500">{t('product.templates.signOff.printedName')}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function DocumentFillLine({
  label,
  value,
  labelWidth = 'w-24',
}: {
  label: ReactNode;
  value?: ReactNode;
  labelWidth?: string;
}) {
  return (
    <div className="flex items-end gap-2 py-1">
      <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider text-slate-500 ${labelWidth}`}>{label}</span>
      <span className="flex-1 border-b border-slate-300 min-h-[16px] text-slate-900 font-medium">{value}</span>
    </div>
  );
}

export function DocumentFooter({ confidential = false }: { confidential?: boolean }) {
  const { t } = useTranslation();
  return (
    <footer className="mt-10 pt-3 border-t border-slate-200 flex justify-between text-[9px] uppercase tracking-wider text-slate-400">
      <span>{t('product.templates.signOff.preparedWith')}</span>
      {confidential && <span>{t('product.templates.signOff.confidentialData')}</span>}
    </footer>
  );
}
