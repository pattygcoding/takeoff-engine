import React, { useState } from 'react';
import {
  SCOPE_STATUS,
  DEFAULT_SCOPE_ITEMS,
  categorizeScope,
  formatScopeAddonImpact,
  formatScopeStatusLabel,
} from '@/product/lib/scope';
import { useTranslation } from '@/core/components/context/I18nContext';

export default function ClientCounterOfferModal({
  currentScope = DEFAULT_SCOPE_ITEMS,
  clientName = '',
  signerEmail = '',
  baseAmount = 0,
  onSubmit,
  onClose,
  submitting = false,
}) {
  const { t } = useTranslation();
  const [scopeList, setScopeList] = useState(() => {
    const initialList = Array.isArray(currentScope) && currentScope.length > 0
      ? currentScope
      : DEFAULT_SCOPE_ITEMS;

    return JSON.parse(JSON.stringify(initialList)).map((item) => ({
      ...item,
      originalStatus: item.originalStatus ?? item.status ?? SCOPE_STATUS.INCLUDED,
      originalAmount: Number(item.originalAmount ?? item.amount ?? item.costImpact ?? 0) || 0,
      amount: Number(item.amount ?? item.costImpact ?? 0) || 0,
      originalCostImpactType: item.originalCostImpactType ?? item.costImpactType ?? 'flat',
      costImpactType: item.costImpactType ?? 'flat',
    }));
  });

  const [counterNotes, setCounterNotes] = useState('');
  const [name, setName] = useState(clientName || '');
  const [email, setEmail] = useState(signerEmail || '');

  const handleStatusChange = (id, nextStatus) => {
    setScopeList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const normalizedStatus = nextStatus || item.status || SCOPE_STATUS.INCLUDED;
        const nextItem = {
          ...item,
          status: normalizedStatus,
          requestedChange: true,
        };

        if (normalizedStatus === SCOPE_STATUS.OPTIONAL_ADDON) {
          const baseAmount = Number(item.amount ?? item.originalAmount ?? item.costImpact ?? 0) || 0;
          return { ...nextItem, amount: baseAmount || Number(item.costImpact ?? 0) || 0 };
        }

        return { ...nextItem, amount: 0 };
      })
    );
  };

  const handleAmountChange = (id, rawValue) => {
    const parsed = rawValue === '' ? 0 : Number(rawValue);
    setScopeList((prev) => prev.map((item) => (
      item.id === id
        ? {
            ...item,
            status: item.status === SCOPE_STATUS.OPTIONAL_ADDON ? SCOPE_STATUS.OPTIONAL_ADDON : item.status,
            amount: Number.isFinite(parsed) ? parsed : 0,
            requestedChange: true,
          }
        : item
    )));
  };

  const handleAmountTypeChange = (id, costImpactType) => {
    setScopeList((prev) => prev.map((item) => (
      item.id === id
        ? { ...item, costImpactType, requestedChange: true }
        : item
    )));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const scopeChanges = scopeList.map((it) => ({
      id: it.id,
      title: it.title,
      category: it.category,
      originalStatus: it.originalStatus ?? it.status,
      originalAmount: Number(it.originalAmount ?? it.costImpact ?? 0) || 0,
      originalCostImpactType: it.originalCostImpactType ?? it.costImpactType ?? 'flat',
      status: it.status,
      amount: Number(it.amount ?? it.costImpact ?? 0) || 0,
      costImpactType: it.costImpactType ?? 'flat',
    }));

    if (onSubmit) {
      onSubmit({
        counterNotes: counterNotes.trim(),
        scopeChanges,
        clientName: name.trim(),
        signerEmail: email.trim(),
      });
    }
  };

  const { included, excluded } = categorizeScope(scopeList);
  const statusOptions = [
    { value: SCOPE_STATUS.INCLUDED, label: `✓ ${t('product.counterOfferModal.statusIncluded', 'Included')}` },
    { value: SCOPE_STATUS.EXCLUDED, label: `✕ ${t('product.counterOfferModal.statusExcluded', 'Excluded')}` },
    { value: SCOPE_STATUS.OPTIONAL_ADDON, label: `+ ${t('product.counterOfferModal.statusOptionalAddon', 'Optional Add-On')}` },
    { value: SCOPE_STATUS.NOT_APPLICABLE, label: `— ${t('product.counterOfferModal.statusNotApplicable', 'N/A')}` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col my-auto text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 flex items-center justify-center text-xl shrink-0 font-bold border border-amber-300 dark:border-amber-700">
              ⚖️
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                {t('product.counterOfferModal.title', 'Scope Exclusions & Inclusions / Counter-Offer')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('product.counterOfferModal.subtitle', 'Review or modify included and excluded items (fixtures, permits, trenching) and submit a counter-offer.')}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto space-y-4 my-3 pr-1">
          {/* Information Callout */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs rounded-xl flex items-start gap-2">
            <span className="text-base">💡</span>
            <p className="leading-relaxed font-medium">
              {t('product.counterOfferModal.notice', 'Select each item’s requested status and proposed add-on amount before sending the proposal revision.')}
            </p>
          </div>

          {/* Scope Item Status Controls */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t('product.counterOfferModal.itemsHeader', 'Scope Boundaries & Fixtures')}
            </h4>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {scopeList
                .filter((item) => item.status !== SCOPE_STATUS.NOT_APPLICABLE)
                .map((item) => {
                  const isAddon = item.status === SCOPE_STATUS.OPTIONAL_ADDON;
                  const resolvedBaseAmount = Number(item?.baseAmount ?? item?.calculatedBaseAmount ?? baseAmount ?? 0) || 0;
                  const addonImpact = isAddon
                    ? formatScopeAddonImpact({ ...item, costImpact: item.amount }, resolvedBaseAmount)
                    : null;
                  const statusBadgeClasses = isAddon
                    ? 'bg-indigo-600 text-white'
                    : item.status === SCOPE_STATUS.INCLUDED
                      ? 'bg-emerald-600 text-white'
                      : item.status === SCOPE_STATUS.EXCLUDED
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-600 text-white';

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border transition ${
                        isAddon
                          ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30'
                          : item.status === SCOPE_STATUS.INCLUDED
                            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30'
                            : item.status === SCOPE_STATUS.EXCLUDED
                              ? 'border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30'
                              : 'border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</span>
                            {item.category === 'fixtures' && (
                              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 px-1.5 py-0.2 rounded">
                                🚽 Fixture
                              </span>
                            )}
                            {isAddon && (
                              <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 px-1.5 py-0.2 rounded">
                                + {t('product.counterOfferModal.addonTag', 'Optional Add-On')}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${statusBadgeClasses}`}>
                          {formatScopeStatusLabel(item.status)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {statusOptions.map((option) => {
                          const selected = option.value === item.status;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleStatusChange(item.id, option.value)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                                selected
                                  ? 'border-slate-900 dark:border-slate-200 bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900'
                                  : 'border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      {item.status === SCOPE_STATUS.OPTIONAL_ADDON && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            {t('product.counterOfferModal.addonAmountLabel', 'Add-On Amount')}
                          </label>
                          <div className="inline-flex rounded-lg border border-indigo-200 dark:border-indigo-800 overflow-hidden shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAmountTypeChange(item.id, 'flat')}
                              aria-label="Dollar amount"
                              className={`w-7 py-1.5 text-xs font-bold transition cursor-pointer ${
                                item.costImpactType === 'percent'
                                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-indigo-600 text-white'
                              }`}
                            >
                              $
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAmountTypeChange(item.id, 'percent')}
                              aria-label="Percentage amount"
                              className={`w-7 py-1.5 text-xs font-bold transition cursor-pointer ${
                                item.costImpactType === 'percent'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300'
                              }`}
                            >
                              %
                            </button>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={Number(item.amount ?? item.originalAmount ?? 0)}
                            onChange={(e) => handleAmountChange(item.id, e.target.value)}
                            className="w-28 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                      )}

                      {addonImpact && (
                        <div className="mt-2 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                          {item.costImpactType === 'percent' ? addonImpact : `Current contractor price: ${addonImpact}`}
                        </div>
                      )}
                      {item.costImpactType === 'percent' && (
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                          {t('product.counterOfferModal.percentAmountBasis', 'Percentage add-ons are calculated from the initial direct cost before contingency and profit are applied.')}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              {t('product.counterOfferModal.notesLabel', 'Counter-Offer Details & Proposed Revisions')}
            </label>
            <textarea
              rows={3}
              required
              placeholder={t('product.counterOfferModal.notesPlaceholder', 'e.g. Please include 2 ADA commercial sinks and all fixtures. We will provide our own site dumpsters.')}
              value={counterNotes}
              onChange={(e) => setCounterNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Signer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('product.counterOfferModal.nameLabel', 'Your Name')}
              </label>
              <input
                type="text"
                required
                placeholder={t('product.counterOfferModal.namePlaceholder', 'Full Name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('product.counterOfferModal.emailLabel', 'Your Contact Email')}
              </label>
              <input
                type="email"
                required
                placeholder={t('product.counterOfferModal.emailPlaceholder', 'client@company.com')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              {t('core.common.cancel')}
            </button>

            <button
              type="submit"
              disabled={submitting || !counterNotes.trim()}
              className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? t('product.counterOfferModal.submitting', 'Submitting...') : t('product.counterOfferModal.submitBtn', 'Send Scope Counter-Offer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
