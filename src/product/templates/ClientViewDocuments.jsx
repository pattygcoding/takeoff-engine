import React from 'react';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { formatMarkupLine, formatMarkupBasisNote } from '@/product/lib/markupFormatting';
import { useTranslation } from '@/core/components/context/I18nContext';
import ScopeSummaryDisplay from '@/product/components/ScopeSummaryDisplay';
import { billableWarrantyItems, bidDivisionRows, sumApprovedChangeOrders } from '@/product/components/ClientModeViews';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentKeyFigures,
  DocumentSystemTable,
  DocumentTotalRow,
  DocumentSignatureBlock,
  DocumentFooter,
} from './DocumentHeaderSignoff';

/**
 * Print/PDF layouts for the five client-facing modes on the results page.
 * Always light-themed and sized for the 720px printable width used by exportNodeToPdf.
 */

const KEY = 'product.clientViews';
const PDF = 'product.clientViews.pdf';

const ACCENTS = {
  invoice: '#0f766e',
  proposal: '#2563eb',
  bid: '#1e3a8a',
  changeOrders: '#b45309',
  warranty: '#4338ca',
};

const STATUS_STYLES = {
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  resolved: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  rejected: 'bg-rose-50 text-rose-800 border-rose-300',
  pending: 'bg-amber-50 text-amber-800 border-amber-300',
  open: 'bg-amber-50 text-amber-800 border-amber-300',
  in_progress: 'bg-blue-50 text-blue-800 border-blue-300',
};

function DocShell({ children }) {
  return <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums bg-white">{children}</div>;
}

function StatusPill({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-block px-1.5 py-0.5 border rounded-sm text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${STATUS_STYLES[status] || 'border-slate-300 text-slate-600'}`}>
      {t(`${KEY}.status_${status}`)}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';
  // Stored as YYYY-MM-DD; parse as local date so it doesn't shift a day in negative UTC offsets.
  const [y, m, d] = String(value).split('-').map(Number);
  const date = y && m && d ? new Date(y, m - 1, d) : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function PartiesBlock({ project, accent, aside }) {
  const { t } = useTranslation();
  return (
    <section className="mt-6 grid grid-cols-2 gap-6 break-inside-avoid">
      <div className="border border-slate-300">
        <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: accent }}>
          {t(`${KEY}.billTo`)}
        </p>
        <div className="px-3 py-2 space-y-0.5">
          <p className="text-sm font-bold text-slate-900">{project?.client_name || '—'}</p>
          <p className="text-slate-600">{project?.name || t('product.templates.header.defaultProjectName')}</p>
          {project?.location && <p className="text-slate-500">{project.location}</p>}
        </div>
      </div>
      <div className="border border-slate-300">
        <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: accent }}>
          {aside.title}
        </p>
        <table className="w-full">
          <tbody>
            {aside.rows.map(([label, value]) => (
              <tr key={label} className="border-b border-slate-100 last:border-b-0">
                <td className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</td>
                <td className="px-3 py-1 text-right font-semibold text-slate-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryTable({ rows, total, accent }) {
  return (
    <section className="mt-6 flex justify-end break-inside-avoid">
      <table className="w-full max-w-[340px] border-collapse">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.subtotal ? 'border-t border-slate-400 font-bold text-slate-900' : 'border-b border-slate-100'}>
              <td className="py-1.5 pr-3">{row.label}</td>
              <td className="py-1.5 text-right whitespace-nowrap">{row.value}</td>
            </tr>
          ))}
          <DocumentTotalRow label={total.label} value={total.value} accent={accent} />
        </tbody>
      </table>
    </section>
  );
}

function EmptyNotice({ children }) {
  return <p className="py-6 text-center text-slate-400 italic border border-dashed border-slate-300">{children}</p>;
}

/* ------------------------------------------------------------------ */
/* 1. Invoice                                                          */
/* ------------------------------------------------------------------ */
export function InvoiceDocument({ estimate, branding, currentProject, changeOrders = [], warrantyItems = [], invoiceNumber, netDays }) {
  const { t } = useTranslation();
  const { totals = {}, bySystem = [] } = estimate;
  const accent = branding?.brandColor || ACCENTS.invoice;
  const days = Number(netDays) || 0;
  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate.getTime() + days * 86400000);

  const approvedCOs = changeOrders.filter((co) => co.status === 'approved');
  const approvedTotal = sumApprovedChangeOrders(changeOrders);
  const billableWarranty = billableWarrantyItems(warrantyItems);
  const warrantyTotal = billableWarranty.reduce((s, w) => s + Number(w.cost), 0);
  const markupTotal = (totals.overheadAmount || 0) + (totals.contingencyAmount || 0) + (totals.profitAmount || 0);
  const amountDue = (totals.finalBidAmount || 0) + approvedTotal + warrantyTotal;

  const columns = [
    { header: t('product.resultsStep.colDescription'), render: (it) => (it.sizeSpec ? `${it.description} — ${it.sizeSpec}` : it.description) },
    { header: t('product.resultsStep.colQty'), align: 'right', render: (it) => formatNumber(it.quantity, 0) },
    { header: t('product.resultsStep.colUnit'), muted: true, render: (it) => it.unit },
    { header: t(`${KEY}.unitPrice`), align: 'right', render: (it) => (Number(it.quantity) > 0 ? formatCurrency(it.directCost / it.quantity) : '—') },
    { header: t(`${KEY}.amount`), align: 'right', strong: true, render: (it) => formatCurrency(it.directCost) },
  ];

  return (
    <DocShell>
      <DocumentLetterhead branding={branding} title={t(`${KEY}.invoiceTitle`)} project={currentProject} accent={accent} />

      <PartiesBlock
        project={currentProject}
        accent={accent}
        aside={{
          title: t(`${PDF}.invoiceDetails`),
          rows: [
            [t(`${KEY}.invoiceNumber`), invoiceNumber || '—'],
            [t(`${KEY}.invoiceDate`), invoiceDate.toLocaleDateString()],
            [t(`${KEY}.dueDate`), dueDate.toLocaleDateString()],
            [t(`${PDF}.terms`), t(`${PDF}.netTerms`, { days })],
          ],
        }}
      />

      <DocumentKeyFigures
        accent={accent}
        figures={[
          { label: t(`${KEY}.originalContract`), value: formatCurrency(totals.finalBidAmount) },
          { label: t(`${KEY}.approvedChanges`), value: formatCurrency(approvedTotal) },
          { label: t(`${KEY}.billableWarranty`), value: formatCurrency(warrantyTotal) },
        ]}
        highlight={{ label: t(`${KEY}.amountDue`), value: formatCurrency(amountDue) }}
      />

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${PDF}.contractWork`)}</DocumentSectionHeading>
        <DocumentSystemTable bySystem={bySystem} columns={columns} accent={accent} subtotal={(sys) => formatCurrency(sys.directCost)} />
      </section>

      {approvedCOs.length > 0 && (
        <section className="mt-8">
          <DocumentSectionHeading accent={accent}>{t(`${PDF}.approvedChangeOrders`)}</DocumentSectionHeading>
          <table className="w-full border-collapse text-left">
            <tbody>
              {approvedCOs.map((co) => (
                <tr key={co.id} className="border-b border-slate-100 break-inside-avoid align-top">
                  <td className="py-1.5 px-2 w-20 font-mono text-[10px] text-slate-500">{co.number}</td>
                  <td className="py-1.5 px-2">
                    <p className="font-semibold text-slate-900">{co.title || t(`${KEY}.changeOrder`)}</p>
                    {co.description && <p className="text-slate-500 whitespace-pre-line">{co.description}</p>}
                  </td>
                  <td className="py-1.5 px-2 w-24 text-right font-semibold text-slate-900">{formatCurrency(co.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {billableWarranty.length > 0 && (
        <section className="mt-8">
          <DocumentSectionHeading accent={accent}>{t(`${KEY}.billableWarranty`)}</DocumentSectionHeading>
          <table className="w-full border-collapse text-left">
            <tbody>
              {billableWarranty.map((w) => (
                <tr key={w.id} className="border-b border-slate-100 break-inside-avoid align-top">
                  <td className="py-1.5 px-2 w-20 text-[10px] text-slate-500 whitespace-nowrap">{formatDate(w.dateReported)}</td>
                  <td className="py-1.5 px-2">
                    {w.location && <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{w.location}</p>}
                    <p className="text-slate-900 whitespace-pre-line">{w.issue}</p>
                    {w.resolution && (
                      <p className="text-slate-500 whitespace-pre-line">
                        <span className="font-semibold">{t(`${KEY}.warrantyResolution`)}:</span> {w.resolution}
                      </p>
                    )}
                  </td>
                  <td className="py-1.5 px-2 w-24 text-right font-semibold text-slate-900">{formatCurrency(w.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <SummaryTable
        accent={accent}
        rows={[
          { label: t('product.resultsStep.subtotal'), value: formatCurrency(totals.totalDirectCost) },
          { label: t(`${KEY}.overheadAndProfit`), value: formatCurrency(markupTotal) },
          { label: t(`${KEY}.originalContract`), value: formatCurrency(totals.finalBidAmount), subtotal: true },
          approvedCOs.length > 0 && { label: t(`${KEY}.approvedChanges`), value: formatCurrency(approvedTotal) },
          warrantyTotal > 0 && { label: t(`${KEY}.billableWarranty`), value: formatCurrency(warrantyTotal) },
        ].filter(Boolean)}
        total={{ label: t(`${KEY}.amountDue`), value: formatCurrency(amountDue) }}
      />

      <section className="mt-8 p-3 border-l-4 bg-slate-50 break-inside-avoid" style={{ borderColor: accent }}>
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{t(`${PDF}.paymentInstructions`)}</p>
        <p className="mt-1 text-slate-700">{t(`${KEY}.paymentTerms`, { days })}</p>
      </section>

      <p className="mt-6 text-center text-sm font-semibold" style={{ color: accent }}>{t(`${PDF}.thankYou`)}</p>

      <DocumentFooter />
    </DocShell>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Proposal Package                                                 */
/* ------------------------------------------------------------------ */
export function ProposalPackageDocument({ estimate, branding, currentProject, rates }) {
  const { t } = useTranslation();
  const { totals = {}, bySystem = [] } = estimate;
  const accent = branding?.brandColor || ACCENTS.proposal;

  const columns = [
    { header: t('product.resultsStep.colDescription'), render: (it) => it.description },
    { header: t('product.resultsStep.colSizeSpec'), muted: true, render: (it) => it.sizeSpec },
    { header: t('product.resultsStep.colQty'), align: 'right', render: (it) => formatNumber(it.quantity, 0) },
    { header: t('product.resultsStep.colUnit'), muted: true, render: (it) => it.unit },
    { header: t('product.resultsStep.colLineTotal'), align: 'right', strong: true, render: (it) => formatCurrency(it.directCost) },
  ];

  const terms = [
    t('product.clientProposal.term1'),
    t('product.clientProposal.term2'),
    t('product.clientProposal.term3'),
    t(`${KEY}.term4`),
    t(`${KEY}.term5`),
  ];

  return (
    <DocShell>
      <DocumentLetterhead branding={branding} title={t(`${KEY}.proposalTitle`)} project={currentProject} accent={accent} />

      <p className="mt-6 pl-3 border-l-2 text-slate-600" style={{ borderColor: accent }}>{t(`${KEY}.proposalIntro`)}</p>

      <section className="mt-6 py-5 text-center border border-slate-300 bg-slate-50 break-inside-avoid">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{t('product.resultsStep.totalProjectInvestment')}</p>
        <p className="mt-1 text-3xl font-black" style={{ color: accent }}>{formatCurrency(totals.finalBidAmount)}</p>
      </section>

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${PDF}.itemizedPricing`)}</DocumentSectionHeading>
        <DocumentSystemTable bySystem={bySystem} columns={columns} accent={accent} subtotal={(sys) => formatCurrency(sys.directCost)} />
      </section>

      <SummaryTable
        accent={accent}
        rows={[
          { label: t('product.resultsStep.subtotal'), value: formatCurrency(totals.totalDirectCost) },
          { label: formatMarkupLine(t('product.resultsStep.overheadFixed'), totals.overheadAmount, totals.overheadPct, t), value: formatCurrency(totals.overheadAmount) },
          { label: formatMarkupLine(t('product.resultsStep.contingencyFixed'), totals.contingencyAmount, totals.contingencyPct, t), value: formatCurrency(totals.contingencyAmount) },
          { label: formatMarkupLine(t('product.resultsStep.profitFixed'), totals.profitAmount, totals.profitPct, t), value: formatCurrency(totals.profitAmount) },
        ]}
        total={{ label: t('product.resultsStep.totalBid'), value: formatCurrency(totals.finalBidAmount) }}
      />
      <p className="mt-2 text-right text-[10px] text-slate-500">{formatMarkupBasisNote(t)}</p>
      {totals.scopeAddonsCost > 0 && (
        <p className="mt-1 text-right text-[10px] text-blue-700">
          {t('product.resultsStep.scopeAddonsNote', { amount: formatCurrency(totals.scopeAddonsCost) })}
        </p>
      )}

      <div className="break-inside-avoid" data-pdf-block>
        <ScopeSummaryDisplay scopeItems={rates?.scopeItems} baseAmount={totals.totalDirectCost} forceLight className="mt-8" />
      </div>

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t('product.clientProposal.termsTitle')}</DocumentSectionHeading>
        <ol className="list-decimal pl-5 space-y-1 text-slate-600">
          {terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ol>
      </section>

      <DocumentSignatureBlock
        accent={accent}
        heading={t(`${KEY}.acceptanceTitle`)}
        intro={t(`${KEY}.acceptanceText`)}
        showPrintedName
        parties={[
          { title: t(`${KEY}.contractorSignature`), subtitle: branding?.companyName },
          { title: t(`${KEY}.clientSignature`), subtitle: currentProject?.client_name },
        ]}
      />

      <DocumentFooter />
    </DocShell>
  );
}

/* ------------------------------------------------------------------ */
/* 3. General Bid                                                      */
/* ------------------------------------------------------------------ */
export function GeneralBidDocument({ estimate, branding, currentProject, rates }) {
  const { t } = useTranslation();
  const { totals = {}, bySystem = [] } = estimate;
  const accent = branding?.brandColor || ACCENTS.bid;
  const rows = bidDivisionRows(bySystem, totals);
  const total = totals.finalBidAmount || 0;

  return (
    <DocShell>
      <DocumentLetterhead branding={branding} title={t(`${KEY}.bidTitle`)} project={currentProject} accent={accent} />

      <p className="mt-6 text-slate-700">{t(`${KEY}.bidStatement`)}</p>

      <section className="mt-5 grid grid-cols-3 border-2 break-inside-avoid" style={{ borderColor: accent }}>
        <div className="col-span-2 px-4 py-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{t(`${KEY}.lumpSumBid`)}</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{formatCurrency(total)}</p>
          <p className="mt-1 text-[10px] text-slate-500">{t(`${PDF}.bidAmountWords`)}</p>
          <div className="mt-1 border-b border-slate-400 h-5" />
        </div>
        <div className="px-4 py-4 text-white flex flex-col justify-center" style={{ backgroundColor: accent }}>
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{t(`${KEY}.bidDate`)}</p>
          <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-wider opacity-80">{t(`${KEY}.bidDivision`)}</p>
          <p className="text-sm font-bold">{rows.length}</p>
        </div>
      </section>

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${PDF}.bidBreakdown`)}</DocumentSectionHeading>
        {rows.length === 0 ? (
          <EmptyNotice>{t('product.templates.shared.noItems')}</EmptyNotice>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2 px-2 w-10">#</th>
                <th className="py-2 px-2">{t(`${KEY}.bidDivision`)}</th>
                <th className="py-2 px-2 text-right">{t(`${KEY}.lineItems`)}</th>
                <th className="py-2 px-2 text-right">{t(`${PDF}.pctOfBid`)}</th>
                <th className="py-2 px-2 text-right">{t(`${KEY}.amount`)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.system} className="border-b border-slate-100 even:bg-slate-50/70 break-inside-avoid">
                  <td className="py-2 px-2 text-slate-400">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="py-2 px-2 font-semibold text-slate-900">{row.system}</td>
                  <td className="py-2 px-2 text-right">{row.count}</td>
                  <td className="py-2 px-2 text-right text-slate-500">{total > 0 ? `${formatNumber((row.amount / total) * 100, 1)}%` : '—'}</td>
                  <td className="py-2 px-2 text-right font-semibold text-slate-900">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
              <DocumentTotalRow label={t(`${KEY}.totalBid`)} value={formatCurrency(total)} accent={accent} colSpan={4} />
            </tbody>
          </table>
        )}
      </section>

      <div className="break-inside-avoid" data-pdf-block>
        <ScopeSummaryDisplay scopeItems={rates?.scopeItems} baseAmount={totals.totalDirectCost} forceLight className="mt-8" />
      </div>

      <section className="mt-8 break-inside-avoid">
        <DocumentSectionHeading accent={accent}>{t(`${PDF}.bidQualifications`)}</DocumentSectionHeading>
        <ul className="list-disc pl-5 space-y-1 text-slate-600">
          <li>{t(`${KEY}.bidNote1`)}</li>
          <li>{t(`${KEY}.bidNote2`)}</li>
          <li>{t(`${KEY}.bidNote3`)}</li>
        </ul>
      </section>

      <DocumentSignatureBlock
        accent={accent}
        heading={t(`${PDF}.bidSubmission`)}
        showPrintedName
        parties={[
          { title: t(`${KEY}.submittedBy`), subtitle: branding?.companyName },
          { title: t(`${KEY}.receivedBy`), subtitle: currentProject?.client_name },
        ]}
      />

      <DocumentFooter />
    </DocShell>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Change Orders                                                    */
/* ------------------------------------------------------------------ */
export function ChangeOrdersDocument({ estimate, branding, currentProject, changeOrders = [] }) {
  const { t } = useTranslation();
  const { totals = {} } = estimate;
  const accent = branding?.brandColor || ACCENTS.changeOrders;
  const original = totals.finalBidAmount || 0;
  const approved = sumApprovedChangeOrders(changeOrders);
  const sumBy = (status, field) =>
    changeOrders.filter((co) => co.status === status).reduce((s, co) => s + (Number(co[field]) || 0), 0);
  const pending = sumBy('pending', 'amount');
  const approvedDays = sumBy('approved', 'scheduleDays');

  return (
    <DocShell>
      <DocumentLetterhead branding={branding} title={t(`${KEY}.changeOrdersTitle`)} project={currentProject} accent={accent} />

      <DocumentKeyFigures
        accent={accent}
        figures={[
          { label: t(`${KEY}.originalContract`), value: formatCurrency(original) },
          { label: t(`${KEY}.approvedChanges`), value: formatCurrency(approved), note: t(`${PDF}.daysAdded`, { days: approvedDays }) },
          { label: t(`${KEY}.pendingChanges`), value: formatCurrency(pending) },
        ]}
        highlight={{ label: t(`${KEY}.revisedContract`), value: formatCurrency(original + approved) }}
      />

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${PDF}.changeOrderRegister`)}</DocumentSectionHeading>
        {changeOrders.length === 0 ? (
          <EmptyNotice>{t(`${KEY}.noChangeOrders`)}</EmptyNotice>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2 px-2 w-16">#</th>
                <th className="py-2 px-2 w-20">{t(`${KEY}.date`)}</th>
                <th className="py-2 px-2">{t(`${PDF}.descriptionOfChange`)}</th>
                <th className="py-2 px-2 w-14 text-right">{t(`${PDF}.days`)}</th>
                <th className="py-2 px-2 w-20">{t(`${KEY}.status`)}</th>
                <th className="py-2 px-2 w-24 text-right">{t(`${KEY}.amount`)}</th>
              </tr>
            </thead>
            <tbody>
              {changeOrders.map((co) => (
                <tr key={co.id} className="border-b border-slate-200 align-top break-inside-avoid">
                  <td className="py-2 px-2 font-mono text-[10px] font-bold" style={{ color: accent }}>{co.number}</td>
                  <td className="py-2 px-2 text-[10px] text-slate-600 whitespace-nowrap">{formatDate(co.date)}</td>
                  <td className="py-2 px-2">
                    <p className="font-semibold text-slate-900">{co.title}</p>
                    {co.description && <p className="mt-0.5 text-slate-600 whitespace-pre-line">{co.description}</p>}
                  </td>
                  <td className="py-2 px-2 text-right">{co.scheduleDays || 0}</td>
                  <td className="py-2 px-2"><StatusPill status={co.status} /></td>
                  <td className={`py-2 px-2 text-right font-semibold ${co.status === 'rejected' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {formatCurrency(co.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <SummaryTable
        accent={accent}
        rows={[
          { label: t(`${KEY}.originalContract`), value: formatCurrency(original) },
          { label: t(`${KEY}.approvedChanges`), value: formatCurrency(approved) },
          { label: t(`${KEY}.pendingChanges`), value: formatCurrency(pending) },
        ]}
        total={{ label: t(`${KEY}.revisedContract`), value: formatCurrency(original + approved) }}
      />
      <p className="mt-2 text-right text-[10px] text-slate-500">{t(`${PDF}.pendingNote`)}</p>

      <DocumentSignatureBlock
        accent={accent}
        heading={t(`${PDF}.changeOrderAuthorization`)}
        intro={t(`${PDF}.changeOrderAuthorizationText`)}
        showPrintedName
        parties={[
          { title: t(`${KEY}.contractorSignature`), subtitle: branding?.companyName },
          { title: t(`${KEY}.ownerApproval`), subtitle: currentProject?.client_name },
        ]}
      />

      <DocumentFooter />
    </DocShell>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Warranty Work                                                    */
/* ------------------------------------------------------------------ */
export function WarrantyDocument({ branding, currentProject, warrantyItems = [] }) {
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENTS.warranty;
  const counts = warrantyItems.reduce((acc, w) => ({ ...acc, [w.status]: (acc[w.status] || 0) + 1 }), {});
  const billableTotal = billableWarrantyItems(warrantyItems).reduce((s, w) => s + Number(w.cost), 0);

  return (
    <DocShell>
      <DocumentLetterhead branding={branding} title={t(`${KEY}.warrantyTitle`)} project={currentProject} accent={accent} />

      <DocumentKeyFigures
        accent={accent}
        figures={['open', 'in_progress', 'resolved'].map((s) => ({ label: t(`${KEY}.status_${s}`), value: counts[s] || 0 }))}
        highlight={{ label: t(`${KEY}.billableWarranty`), value: formatCurrency(billableTotal) }}
      />

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${PDF}.warrantyRegister`, { count: warrantyItems.length })}</DocumentSectionHeading>
        {warrantyItems.length === 0 ? (
          <EmptyNotice>{t(`${KEY}.noWarrantyItems`)}</EmptyNotice>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2 px-2 w-8">#</th>
                <th className="py-2 px-2 w-20">{t(`${KEY}.dateReported`)}</th>
                <th className="py-2 px-2">{t(`${KEY}.warrantyIssue`)}</th>
                <th className="py-2 px-2">{t(`${KEY}.warrantyResolution`)}</th>
                <th className="py-2 px-2 w-20">{t(`${KEY}.status`)}</th>
                <th className="py-2 px-2 w-24 text-right">{t(`${KEY}.billableCost`)}</th>
              </tr>
            </thead>
            <tbody>
              {warrantyItems.map((w, idx) => (
                <tr key={w.id} className="border-b border-slate-200 align-top break-inside-avoid">
                  <td className="py-2 px-2 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-2 text-[10px] text-slate-600 whitespace-nowrap">{formatDate(w.dateReported)}</td>
                  <td className="py-2 px-2">
                    {w.location && <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>{w.location}</p>}
                    <p className="text-slate-900 whitespace-pre-line">{w.issue}</p>
                  </td>
                  <td className="py-2 px-2 text-slate-600 whitespace-pre-line">{w.resolution || '—'}</td>
                  <td className="py-2 px-2 space-y-1">
                    <StatusPill status={w.status} />
                    <p className="text-[9px] text-slate-500">{w.covered ? t(`${KEY}.covered`) : t(`${KEY}.billable`)}</p>
                  </td>
                  <td className="py-2 px-2 text-right font-semibold text-slate-900">{w.covered ? '—' : formatCurrency(w.cost)}</td>
                </tr>
              ))}
              {billableTotal > 0 && <DocumentTotalRow label={t(`${KEY}.billableWarranty`)} value={formatCurrency(billableTotal)} accent={accent} colSpan={5} />}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8 p-3 border-l-4 bg-slate-50 break-inside-avoid" style={{ borderColor: accent }}>
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{t(`${PDF}.warrantyCoverageHeading`)}</p>
        <p className="mt-1 text-slate-700">{t(`${KEY}.term5`)} {t(`${PDF}.warrantyCoverageText`)}</p>
      </section>

      <DocumentSignatureBlock
        accent={accent}
        heading={t(`${PDF}.warrantyAcknowledgement`)}
        intro={t(`${PDF}.warrantyAcknowledgementText`)}
        showPrintedName
        parties={[
          { title: t(`${KEY}.contractorSignature`), subtitle: branding?.companyName },
          { title: t(`${KEY}.ownerAcknowledgement`), subtitle: currentProject?.client_name },
        ]}
      />

      <DocumentFooter />
    </DocShell>
  );
}

export const CLIENT_VIEW_DOCUMENTS = {
  invoice: InvoiceDocument,
  proposal: ProposalPackageDocument,
  bid: GeneralBidDocument,
  changeOrders: ChangeOrdersDocument,
  warranty: WarrantyDocument,
};
