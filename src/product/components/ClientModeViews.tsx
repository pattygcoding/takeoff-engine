import { useState } from 'react';
import type { ReactNode } from 'react';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';

export const CLIENT_VIEWS = ['invoice', 'proposal', 'bid', 'changeOrders', 'warranty'];

const inputClass =
  'w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1';
const thClass = 'py-1 pr-3';
const today = () => new Date().toISOString().slice(0, 10);
const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id_${Date.now()}`);

export function sumApprovedChangeOrders(changeOrders: any[] = []) {
  return changeOrders.filter((co) => co.status === 'approved').reduce((sum, co) => sum + (Number(co.amount) || 0), 0);
}

export function billableWarrantyItems(warrantyItems: any[] = []) {
  return warrantyItems.filter((w) => !w.covered && Number(w.cost) > 0);
}

export function defaultInvoiceNumber(project: any) {
  return `INV-${(project?.id || '').slice(0, 8).toUpperCase() || new Date().toISOString().slice(0, 10).replaceAll('-', '')}`;
}

// Spreads the marked-up bid across systems by direct-cost weight; the last row absorbs rounding drift.
export function bidDivisionRows(bySystem: any[], totals: any) {
  const total = totals.finalBidAmount || 0;
  const direct = totals.totalDirectCost || 0;
  const factor = direct > 0 ? total / direct : 0;
  const rows: Array<{ system: any; count: number; amount: number }> = bySystem.map((sys) => ({
    system: sys.system,
    count: sys.items.length,
    amount: Math.round(sys.directCost * factor * 100) / 100,
  }));
  if (rows.length > 0) {
    const drift = Math.round((total - rows.reduce((s, r) => s + r.amount, 0)) * 100) / 100;
    rows[rows.length - 1].amount += drift;
  }
  return rows;
}

export function ClientViewTabs({
  value,
  onChange,
  lockedViews = [],
}: {
  value: string;
  onChange: (view: string) => void;
  lockedViews?: string[];
}) {
  const { t } = useTranslation();
  return (
    <div role="tablist" className="no-print flex flex-wrap gap-2 mb-6">
      {CLIENT_VIEWS.map((view) => {
        const locked = lockedViews.includes(view);
        return (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={value === view}
            onClick={() => onChange(view)}
            title={locked ? t('product.clientViews.pdfProOnly') : undefined}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer ${
              value === view
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {t(`product.clientViews.tab_${view}`)}
            {locked && (
              <>
                <Lock className={`w-3.5 h-3.5 ${value === view ? 'text-amber-200' : 'text-amber-500'}`} aria-hidden="true" />
                <span className="sr-only">{t('product.clientViews.pdfProOnly')}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DocTitle({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900 dark:text-white">{title}</h2>
      <div className="text-right text-xs text-slate-600 dark:text-slate-400 space-y-0.5">{children}</div>
    </div>
  );
}

function ProjectInfo({ project }: { project: any }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
      <div>
        <p className={labelClass}>{t('product.clientViews.billTo')}</p>
        <p className="font-semibold">{project?.client_name || '—'}</p>
      </div>
      <div>
        <p className={labelClass}>{t('product.clientViews.project')}</p>
        <p className="font-semibold">{project?.name || t('product.resultsStep.defaultProposalTitle')}</p>
      </div>
      <div>
        <p className={labelClass}>{t('product.clientViews.location')}</p>
        <p className="font-semibold">{project?.location || '—'}</p>
      </div>
    </div>
  );
}

function SignatureBlock({ leftLabel, rightLabel }: { leftLabel: string; rightLabel: string }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-10 text-xs text-slate-600 dark:text-slate-400">
      {[leftLabel, rightLabel].map((label) => (
        <div key={label}>
          <div className="border-b border-slate-400 dark:border-slate-600 h-10" />
          <p className="mt-1 font-semibold">{label}</p>
          <p className="mt-3 border-b border-slate-300 dark:border-slate-700 h-6" />
          <p className="mt-1">{t('product.clientViews.date')}</p>
        </div>
      ))}
    </div>
  );
}

function TotalRow({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-3 py-1 ${
        strong
          ? 'text-xl font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800 mt-2'
          : 'text-sm text-slate-600 dark:text-slate-400'
      }`}
    >
      <span>{label}</span>
      <span className="font-mono whitespace-nowrap">{value}</span>
    </div>
  );
}

export function InvoiceView({
  bySystem,
  totals,
  changeOrders,
  warrantyItems,
  project,
  invoiceNumber,
  setInvoiceNumber,
  netDays,
  setNetDays,
}: {
  bySystem: any[];
  totals: any;
  changeOrders: any[];
  warrantyItems: any[];
  project: any;
  invoiceNumber: string;
  setInvoiceNumber: (value: any) => void;
  netDays: number | string;
  setNetDays: (value: any) => void;
}) {
  const { t } = useTranslation();
  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate.getTime() + (Number(netDays) || 0) * 86400000);

  const approvedCOs = changeOrders.filter((co) => co.status === 'approved');
  const billableWarranty = billableWarrantyItems(warrantyItems);
  const warrantyTotal = billableWarranty.reduce((s, w) => s + Number(w.cost), 0);
  const amountDue = (totals.finalBidAmount || 0) + sumApprovedChangeOrders(changeOrders) + warrantyTotal;
  const markupTotal = (totals.overheadAmount || 0) + (totals.contingencyAmount || 0) + (totals.profitAmount || 0);

  return (
    <div>
      <div className="no-print grid grid-cols-2 gap-3 mb-6 max-w-md">
        <div>
          <label className={labelClass} htmlFor="invoice-number">{t('product.clientViews.invoiceNumber')}</label>
          <input id="invoice-number" className={inputClass} maxLength={40} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="invoice-net-days">{t('product.clientViews.netDays')}</label>
          <input id="invoice-net-days" type="number" min={0} max={365} className={inputClass} value={netDays} onChange={(e) => setNetDays(e.target.value)} />
        </div>
      </div>

      <DocTitle title={t('product.clientViews.invoiceTitle')}>
        <p><span className="font-semibold">{t('product.clientViews.invoiceNumber')}:</span> {invoiceNumber}</p>
        <p><span className="font-semibold">{t('product.clientViews.invoiceDate')}:</span> {invoiceDate.toLocaleDateString()}</p>
        <p><span className="font-semibold">{t('product.clientViews.dueDate')}:</span> {dueDate.toLocaleDateString()}</p>
      </DocTitle>

      <ProjectInfo project={project} />

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <th className={thClass}>{t('product.resultsStep.colDescription')}</th>
            <th className={`${thClass} text-right`}>{t('product.resultsStep.colQty')}</th>
            <th className={thClass}>{t('product.resultsStep.colUnit')}</th>
            <th className={`${thClass} text-right`}>{t('product.clientViews.unitPrice')}</th>
            <th className={`${thClass} text-right`}>{t('product.clientViews.amount')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {bySystem.flatMap((sys) =>
            sys.items.map((item: any) => (
              <tr key={item.id}>
                <td className="py-1.5 pr-3">{item.description}{item.sizeSpec ? ` — ${item.sizeSpec}` : ''}</td>
                <td className="py-1.5 pr-3 text-right font-mono">{item.quantity}</td>
                <td className="py-1.5 pr-3">{item.unit}</td>
                <td className="py-1.5 pr-3 text-right font-mono">
                  {Number(item.quantity) > 0 ? formatCurrency(item.directCost / item.quantity) : '—'}
                </td>
                <td className="py-1.5 pr-3 text-right font-mono">{formatCurrency(item.directCost)}</td>
              </tr>
            ))
          )}
          {approvedCOs.map((co) => (
            <tr key={co.id}>
              <td className="py-1.5 pr-3" colSpan={4}>{co.number} — {co.title || t('product.clientViews.changeOrder')}</td>
              <td className="py-1.5 pr-3 text-right font-mono">{formatCurrency(co.amount)}</td>
            </tr>
          ))}
          {billableWarranty.map((w) => (
            <tr key={w.id}>
              <td className="py-1.5 pr-3" colSpan={4}>{t('product.clientViews.warrantyLine', { issue: w.issue || w.location || '' })}</td>
              <td className="py-1.5 pr-3 text-right font-mono">{formatCurrency(w.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <div className="w-full sm:w-80">
          <TotalRow label={t('product.resultsStep.subtotal')} value={formatCurrency(totals.totalDirectCost)} />
          <TotalRow label={t('product.clientViews.overheadAndProfit')} value={formatCurrency(markupTotal)} />
          <TotalRow label={t('product.clientViews.originalContract')} value={formatCurrency(totals.finalBidAmount)} />
          {approvedCOs.length > 0 && (
            <TotalRow label={t('product.clientViews.approvedChanges')} value={formatCurrency(sumApprovedChangeOrders(changeOrders))} />
          )}
          {warrantyTotal > 0 && <TotalRow label={t('product.clientViews.billableWarranty')} value={formatCurrency(warrantyTotal)} />}
          <TotalRow strong label={t('product.clientViews.amountDue')} value={formatCurrency(amountDue)} />
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-500 dark:text-slate-400">{t('product.clientViews.paymentTerms', { days: Number(netDays) || 0 })}</p>
    </div>
  );
}

export function GeneralBidView({
  project,
  bySystem,
  totals,
  children,
}: {
  project: any;
  bySystem: any[];
  totals: any;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const total = totals.finalBidAmount || 0;
  const rows = bidDivisionRows(bySystem, totals);

  return (
    <div>
      <DocTitle title={t('product.clientViews.bidTitle')}>
        <p><span className="font-semibold">{t('product.clientViews.bidDate')}:</span> {new Date().toLocaleDateString()}</p>
      </DocTitle>

      <ProjectInfo project={project} />

      <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{t('product.clientViews.bidStatement')}</p>
      <div className="text-center my-6">
        <p className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">{t('product.clientViews.lumpSumBid')}</p>
        <p className="text-4xl font-black text-slate-900 dark:text-white mt-1">{formatCurrency(total)}</p>
      </div>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <th className={thClass}>{t('product.clientViews.bidDivision')}</th>
            <th className={`${thClass} text-right`}>{t('product.clientViews.lineItems')}</th>
            <th className={`${thClass} text-right`}>{t('product.clientViews.amount')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row.system}>
              <td className="py-2 pr-3 font-medium">{row.system}</td>
              <td className="py-2 pr-3 text-right">{row.count}</td>
              <td className="py-2 pr-3 text-right font-mono">{formatCurrency(row.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold border-t border-slate-300 dark:border-slate-700">
            <td className="py-2 pr-3" colSpan={2}>{t('product.clientViews.totalBid')}</td>
            <td className="py-2 pr-3 text-right font-mono">{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>

      {children}

      <ul className="mt-6 list-disc pl-5 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <li>{t('product.clientViews.bidNote1')}</li>
        <li>{t('product.clientViews.bidNote2')}</li>
        <li>{t('product.clientViews.bidNote3')}</li>
      </ul>

      <SignatureBlock leftLabel={t('product.clientViews.submittedBy')} rightLabel={t('product.clientViews.receivedBy')} />
    </div>
  );
}

export function ProposalPackageHeader({ project }: { project: any }) {
  const { t } = useTranslation();
  return (
    <>
      <DocTitle title={t('product.clientViews.proposalTitle')}>
        <p><span className="font-semibold">{t('product.clientViews.proposalDate')}:</span> {new Date().toLocaleDateString()}</p>
      </DocTitle>
      <ProjectInfo project={project} />
      <p className="text-sm text-slate-700 dark:text-slate-300 mb-8">{t('product.clientViews.proposalIntro')}</p>
    </>
  );
}

export function ProposalPackageFooter() {
  const { t } = useTranslation();
  return (
    <div className="mt-10">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-2">
        {t('product.clientProposal.termsTitle')}
      </h3>
      <ol className="list-decimal pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-1">
        <li>{t('product.clientProposal.term1')}</li>
        <li>{t('product.clientProposal.term2')}</li>
        <li>{t('product.clientProposal.term3')}</li>
        <li>{t('product.clientViews.term4')}</li>
        <li>{t('product.clientViews.term5')}</li>
      </ol>
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 mt-8">
        {t('product.clientViews.acceptanceTitle')}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('product.clientViews.acceptanceText')}</p>
      <SignatureBlock leftLabel={t('product.clientViews.contractorSignature')} rightLabel={t('product.clientViews.clientSignature')} />
    </div>
  );
}

function SaveNotice({ canEdit, saving }: { canEdit: boolean; saving: boolean }) {
  const { t } = useTranslation();
  if (!canEdit) {
    return (
      <p className="no-print mb-4 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
        {t('product.clientViews.saveProjectFirst')}
      </p>
    );
  }
  return saving ? <p className="no-print mb-2 text-xs text-slate-500">{t('product.resultsStep.saving')}</p> : null;
}

function RowActions({ onEdit, onDelete, disabled }: { onEdit: () => void; onDelete: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="no-print flex items-center justify-end gap-1">
      <button type="button" disabled={disabled} onClick={onEdit} aria-label={t('product.clientViews.edit')} className="p-1 text-slate-500 hover:text-blue-600 disabled:opacity-40 cursor-pointer">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button type="button" disabled={disabled} onClick={onDelete} aria-label={t('product.clientViews.delete')} className="p-1 text-slate-500 hover:text-red-600 disabled:opacity-40 cursor-pointer">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const statusBadge: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
};

function StatusBadge({ status, label }: { status: string; label: ReactNode }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge[status] || ''}`}>{label}</span>;
}

function useRecordEditor(records: any[], onSave: (records: any[]) => any, blank: any) {
  const [draft, setDraft] = useState<any>(blank);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const reset = () => {
    setDraft(blank);
    setEditingId(null);
  };

  const submit = async (e: React.FormEvent, build: (draft: any) => any) => {
    e.preventDefault();
    const next = editingId
      ? records.map((r) => (r.id === editingId ? { ...r, ...build(draft) } : r))
      : [...records, { id: newId(), ...build(draft) }];
    if (await onSave(next)) reset();
  };

  const edit = (record: any) => {
    setEditingId(record.id);
    setDraft({ ...blank, ...record });
  };

  const remove = (id: string | number | undefined) => onSave(records.filter((r) => r.id !== id));

  return { draft, setDraft, editingId, reset, submit, edit, remove };
}

const blankCO = { title: '', description: '', amount: '', scheduleDays: '', status: 'pending', date: '' };

export function ChangeOrdersView({
  project,
  totals,
  changeOrders,
  onSave,
  canEdit,
  saving,
}: {
  project: any;
  totals: any;
  changeOrders: any[];
  onSave: (records: any[]) => any;
  canEdit: boolean;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const editor = useRecordEditor(changeOrders, onSave, { ...blankCO, date: today() });
  const { draft, setDraft } = editor;
  const original = totals.finalBidAmount || 0;
  const approved = sumApprovedChangeOrders(changeOrders);
  const pending = changeOrders.filter((co) => co.status === 'pending').reduce((s, co) => s + (Number(co.amount) || 0), 0);
  const disabled = !canEdit || saving;

  const nextNumber = () => {
    const max = changeOrders.reduce((m, co) => Math.max(m, parseInt(String(co.number).replace(/\D/g, ''), 10) || 0), 0);
    return `CO-${String(max + 1).padStart(3, '0')}`;
  };

  const build = (d: any) => ({
    number: d.number || nextNumber(),
    title: d.title.trim(),
    description: d.description.trim(),
    amount: Number(d.amount) || 0,
    scheduleDays: parseInt(d.scheduleDays, 10) || 0,
    status: d.status,
    date: d.date,
  });

  return (
    <div>
      <SaveNotice canEdit={canEdit} saving={saving} />

      <form onSubmit={(e) => editor.submit(e, build)} className="no-print mb-8 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
        <p className="text-sm font-bold mb-3">
          {editor.editingId ? t('product.clientViews.editChangeOrder') : t('product.clientViews.addChangeOrder')}
        </p>
        <fieldset disabled={disabled} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-3">
            <label className={labelClass} htmlFor="co-title">{t('product.clientViews.coTitle')}</label>
            <input id="co-title" required maxLength={200} className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="co-amount">{t('product.clientViews.amount')}</label>
            <input id="co-amount" type="number" step="0.01" required className={inputClass} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="co-days">{t('product.clientViews.scheduleDays')}</label>
            <input id="co-days" type="number" step="1" className={inputClass} value={draft.scheduleDays} onChange={(e) => setDraft({ ...draft, scheduleDays: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="co-date">{t('product.clientViews.date')}</label>
            <input id="co-date" type="date" className={inputClass} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </div>
          <div className="sm:col-span-5">
            <label className={labelClass} htmlFor="co-description">{t('product.clientViews.coDescription')}</label>
            <textarea id="co-description" rows={2} maxLength={2000} className={inputClass} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="co-status">{t('product.clientViews.status')}</label>
            <select id="co-status" className={inputClass} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              {['pending', 'approved', 'rejected'].map((s) => (
                <option key={s} value={s}>{t(`product.clientViews.status_${s}`)}</option>
              ))}
            </select>
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 mt-3">
          {editor.editingId && (
            <button type="button" onClick={editor.reset} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">
              {t('product.resultsStep.cancel')}
            </button>
          )}
          <button type="submit" disabled={disabled} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 cursor-pointer">
            <Plus className="w-4 h-4" /> {editor.editingId ? t('product.clientViews.saveChanges') : t('product.clientViews.addChangeOrder')}
          </button>
        </div>
      </form>

      <DocTitle title={t('product.clientViews.changeOrdersTitle')}>
        <p><span className="font-semibold">{t('product.clientViews.date')}:</span> {new Date().toLocaleDateString()}</p>
      </DocTitle>
      <ProjectInfo project={project} />

      {changeOrders.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">{t('product.clientViews.noChangeOrders')}</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <th className={thClass}>#</th>
              <th className={thClass}>{t('product.clientViews.date')}</th>
              <th className={thClass}>{t('product.clientViews.coTitle')}</th>
              <th className={`${thClass} text-right`}>{t('product.clientViews.scheduleDays')}</th>
              <th className={thClass}>{t('product.clientViews.status')}</th>
              <th className={`${thClass} text-right`}>{t('product.clientViews.amount')}</th>
              <th className={`${thClass} no-print`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {changeOrders.map((co) => (
              <tr key={co.id} className="align-top">
                <td className="py-2 pr-3 font-mono text-xs">{co.number}</td>
                <td className="py-2 pr-3 text-xs whitespace-nowrap">{co.date || '—'}</td>
                <td className="py-2 pr-3">
                  <p className="font-medium">{co.title}</p>
                  {co.description && <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line">{co.description}</p>}
                </td>
                <td className="py-2 pr-3 text-right">{co.scheduleDays || 0}</td>
                <td className="py-2 pr-3"><StatusBadge status={co.status} label={t(`product.clientViews.status_${co.status}`)} /></td>
                <td className="py-2 pr-3 text-right font-mono">{formatCurrency(co.amount)}</td>
                <td className="py-2 no-print"><RowActions disabled={disabled} onEdit={() => editor.edit(co)} onDelete={() => editor.remove(co.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <div className="w-full sm:w-80">
          <TotalRow label={t('product.clientViews.originalContract')} value={formatCurrency(original)} />
          <TotalRow label={t('product.clientViews.approvedChanges')} value={formatCurrency(approved)} />
          <TotalRow label={t('product.clientViews.pendingChanges')} value={formatCurrency(pending)} />
          <TotalRow strong label={t('product.clientViews.revisedContract')} value={formatCurrency(original + approved)} />
        </div>
      </div>

      <SignatureBlock leftLabel={t('product.clientViews.contractorSignature')} rightLabel={t('product.clientViews.ownerApproval')} />
    </div>
  );
}

const blankWarranty = { location: '', issue: '', resolution: '', status: 'open', covered: true, cost: '', dateReported: '' };

export function WarrantyView({
  project,
  warrantyItems,
  onSave,
  canEdit,
  saving,
}: {
  project: any;
  warrantyItems: any[];
  onSave: (records: any[]) => any;
  canEdit: boolean;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const editor = useRecordEditor(warrantyItems, onSave, { ...blankWarranty, dateReported: today() });
  const { draft, setDraft } = editor;
  const disabled = !canEdit || saving;
  const counts = warrantyItems.reduce((acc, w) => ({ ...acc, [w.status]: (acc[w.status] || 0) + 1 }), {});
  const billableTotal = billableWarrantyItems(warrantyItems).reduce((s, w) => s + Number(w.cost), 0);

  const build = (d: any) => ({
    dateReported: d.dateReported,
    location: d.location.trim(),
    issue: d.issue.trim(),
    resolution: d.resolution.trim(),
    status: d.status,
    covered: d.covered,
    cost: d.covered ? 0 : Math.max(0, Number(d.cost) || 0),
  });

  return (
    <div>
      <SaveNotice canEdit={canEdit} saving={saving} />

      <form onSubmit={(e) => editor.submit(e, build)} className="no-print mb-8 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
        <p className="text-sm font-bold mb-3">
          {editor.editingId ? t('product.clientViews.editWarrantyItem') : t('product.clientViews.addWarrantyItem')}
        </p>
        <fieldset disabled={disabled} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div>
            <label className={labelClass} htmlFor="w-date">{t('product.clientViews.dateReported')}</label>
            <input id="w-date" type="date" className={inputClass} value={draft.dateReported} onChange={(e) => setDraft({ ...draft, dateReported: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="w-location">{t('product.clientViews.warrantyLocation')}</label>
            <input id="w-location" maxLength={200} className={inputClass} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          </div>
          <div>
            <label className={labelClass} htmlFor="w-status">{t('product.clientViews.status')}</label>
            <select id="w-status" className={inputClass} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              {['open', 'in_progress', 'resolved'].map((s) => (
                <option key={s} value={s}>{t(`product.clientViews.status_${s}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="w-covered">{t('product.clientViews.coverage')}</label>
            <select id="w-covered" className={inputClass} value={draft.covered ? 'yes' : 'no'} onChange={(e) => setDraft({ ...draft, covered: e.target.value === 'yes' })}>
              <option value="yes">{t('product.clientViews.covered')}</option>
              <option value="no">{t('product.clientViews.billable')}</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="w-cost">{t('product.clientViews.billableCost')}</label>
            <input id="w-cost" type="number" min={0} step="0.01" disabled={draft.covered} className={inputClass} value={draft.covered ? '' : draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass} htmlFor="w-issue">{t('product.clientViews.warrantyIssue')}</label>
            <textarea id="w-issue" required rows={2} maxLength={2000} className={inputClass} value={draft.issue} onChange={(e) => setDraft({ ...draft, issue: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass} htmlFor="w-resolution">{t('product.clientViews.warrantyResolution')}</label>
            <textarea id="w-resolution" rows={2} maxLength={2000} className={inputClass} value={draft.resolution} onChange={(e) => setDraft({ ...draft, resolution: e.target.value })} />
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 mt-3">
          {editor.editingId && (
            <button type="button" onClick={editor.reset} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">
              {t('product.resultsStep.cancel')}
            </button>
          )}
          <button type="submit" disabled={disabled} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 cursor-pointer">
            <Plus className="w-4 h-4" /> {editor.editingId ? t('product.clientViews.saveChanges') : t('product.clientViews.addWarrantyItem')}
          </button>
        </div>
      </form>

      <DocTitle title={t('product.clientViews.warrantyTitle')}>
        <p><span className="font-semibold">{t('product.clientViews.date')}:</span> {new Date().toLocaleDateString()}</p>
      </DocTitle>
      <ProjectInfo project={project} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-center">
        {['open', 'in_progress', 'resolved'].map((s) => (
          <div key={s} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <p className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400">{t(`product.clientViews.status_${s}`)}</p>
            <p className="text-xl font-bold">{counts[s] || 0}</p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
          <p className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400">{t('product.clientViews.billableWarranty')}</p>
          <p className="text-xl font-bold font-mono">{formatCurrency(billableTotal)}</p>
        </div>
      </div>

      {warrantyItems.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">{t('product.clientViews.noWarrantyItems')}</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <th className={thClass}>{t('product.clientViews.dateReported')}</th>
              <th className={thClass}>{t('product.clientViews.warrantyIssue')}</th>
              <th className={thClass}>{t('product.clientViews.warrantyResolution')}</th>
              <th className={thClass}>{t('product.clientViews.coverage')}</th>
              <th className={thClass}>{t('product.clientViews.status')}</th>
              <th className={`${thClass} text-right`}>{t('product.clientViews.billableCost')}</th>
              <th className={`${thClass} no-print`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {warrantyItems.map((w) => (
              <tr key={w.id} className="align-top">
                <td className="py-2 pr-3 text-xs whitespace-nowrap">{w.dateReported || '—'}</td>
                <td className="py-2 pr-3">
                  {w.location && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{w.location}</p>}
                  <p className="whitespace-pre-line">{w.issue}</p>
                </td>
                <td className="py-2 pr-3 text-xs whitespace-pre-line">{w.resolution || '—'}</td>
                <td className="py-2 pr-3 text-xs">{w.covered ? t('product.clientViews.covered') : t('product.clientViews.billable')}</td>
                <td className="py-2 pr-3"><StatusBadge status={w.status} label={t(`product.clientViews.status_${w.status}`)} /></td>
                <td className="py-2 pr-3 text-right font-mono">{w.covered ? '—' : formatCurrency(w.cost)}</td>
                <td className="py-2 no-print"><RowActions disabled={disabled} onEdit={() => editor.edit(w)} onDelete={() => editor.remove(w.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SignatureBlock leftLabel={t('product.clientViews.contractorSignature')} rightLabel={t('product.clientViews.ownerAcknowledgement')} />
    </div>
  );
}
