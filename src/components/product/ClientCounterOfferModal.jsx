import React, { useState } from 'react';
import { SCOPE_STATUS, DEFAULT_SCOPE_ITEMS, categorizeScope } from '@/lib/product/scope';
import { useTranslation } from '@/context/I18nContext';

export default function ClientCounterOfferModal({
  currentScope = DEFAULT_SCOPE_ITEMS,
  clientName = '',
  signerEmail = '',
  onSubmit,
  onClose,
  submitting = false,
}) {
  const { t } = useTranslation();
  const [scopeList, setScopeList] = useState(() => {
    return Array.isArray(currentScope) && currentScope.length > 0
      ? JSON.parse(JSON.stringify(currentScope))
      : JSON.parse(JSON.stringify(DEFAULT_SCOPE_ITEMS));
  });

  const [counterNotes, setCounterNotes] = useState('');
  const [name, setName] = useState(clientName || '');
  const [email, setEmail] = useState(signerEmail || '');

  const handleToggleStatus = (id) => {
    setScopeList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        // Cycle between INCLUDED <-> EXCLUDED
        const nextStatus =
          item.status === SCOPE_STATUS.INCLUDED
            ? SCOPE_STATUS.EXCLUDED
            : SCOPE_STATUS.INCLUDED;
        return { ...item, status: nextStatus, requestedChange: true };
      })
    );
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const scopeChanges = scopeList.map((it) => ({
      id: it.id,
      title: it.title,
      category: it.category,
      status: it.status,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center text-xl shrink-0 font-bold border border-amber-300">
              ⚖️
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {t('counterOfferModal.title', 'Scope Exclusions & Inclusions / Counter-Offer')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('counterOfferModal.subtitle', 'Review or modify included and excluded items (fixtures, permits, trenching) and submit a counter-offer.')}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto space-y-4 my-3 pr-1">
          {/* Information Callout */}
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2">
            <span className="text-base">💡</span>
            <p className="leading-relaxed font-medium">
              {t('counterOfferModal.notice', 'Toggle any item below to request shifting between Included (Contractor supplies) and Excluded (Owner supplies).')}
            </p>
          </div>

          {/* Scope Item Toggles */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('counterOfferModal.itemsHeader', 'Scope Boundaries & Fixtures')}
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {scopeList.map((item) => {
                const isInc = item.status === SCOPE_STATUS.INCLUDED;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleStatus(item.id)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 select-none ${
                      isInc
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-rose-50/60 border-rose-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{item.title}</span>
                        {item.category === 'fixtures' && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                            🚽 Fixture
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 transition ${
                        isInc
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-rose-600 text-white shadow-2xs'
                      }`}
                    >
                      {isInc ? '✓ Included' : '✕ Excluded'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t('counterOfferModal.notesLabel', 'Counter-Offer Details & Proposed Revisions')}
            </label>
            <textarea
              rows={3}
              required
              placeholder={t('counterOfferModal.notesPlaceholder', 'e.g. Please include 2 ADA commercial sinks and all fixtures. We will provide our own site dumpsters.')}
              value={counterNotes}
              onChange={(e) => setCounterNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Signer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t('counterOfferModal.nameLabel', 'Your Name')}
              </label>
              <input
                type="text"
                required
                placeholder={t('counterOfferModal.namePlaceholder', 'Full Name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t('counterOfferModal.emailLabel', 'Your Contact Email')}
              </label>
              <input
                type="email"
                required
                placeholder={t('counterOfferModal.emailPlaceholder', 'client@company.com')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              {t('common.cancel')}
            </button>

            <button
              type="submit"
              disabled={submitting || !counterNotes.trim()}
              className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? t('counterOfferModal.submitting', 'Submitting...') : t('counterOfferModal.submitBtn', 'Send Scope Counter-Offer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
