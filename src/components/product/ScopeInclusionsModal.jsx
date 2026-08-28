import React, { useState } from 'react';
import { SCOPE_STATUS, DEFAULT_SCOPE_ITEMS } from '@/lib/product/scope';
import { useTranslation } from '@/context/I18nContext';

export default function ScopeInclusionsModal({
  scopeItems = DEFAULT_SCOPE_ITEMS,
  onSave,
  onClose,
  readOnly = false,
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState(() => {
    return Array.isArray(scopeItems) && scopeItems.length > 0
      ? JSON.parse(JSON.stringify(scopeItems))
      : JSON.parse(JSON.stringify(DEFAULT_SCOPE_ITEMS));
  });

  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'fixtures' | 'site' | 'admin'
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('fixtures');

  const handleStatusChange = (id, newStatus) => {
    if (readOnly) return;
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: newStatus } : it))
    );
  };

  const handleRemoveItem = (id) => {
    if (readOnly) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (readOnly || !newTitle.trim()) return;

    const newItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category: newCategory,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Custom trade item',
      status: SCOPE_STATUS.INCLUDED,
      costImpact: 0,
      isStandard: false,
    };

    setItems((prev) => [...prev, newItem]);
    setNewTitle('');
    setNewDesc('');
  };

  const handleSave = () => {
    if (onSave) onSave(items);
    if (onClose) onClose();
  };

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter((it) => it.category === activeCategory);

  const includedCount = items.filter((it) => it.status === SCOPE_STATUS.INCLUDED).length;
  const excludedCount = items.filter((it) => it.status === SCOPE_STATUS.EXCLUDED).length;
  const addonsCount = items.filter((it) => it.status === SCOPE_STATUS.OPTIONAL_ADDON).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-7 border border-slate-200 max-h-[92vh] flex flex-col my-auto">
        {/* Modal Header with Yellow/Amber Accent */}
        <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl shrink-0 font-bold border border-amber-300">
              ⚖️
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {t('scopeModal.title', 'Scope Inclusions & Exclusions')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('scopeModal.subtitle', 'Configure trade boundaries, fixture provisions, and add-on alternates for bids.')}
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              ✓ {includedCount} {t('scopeModal.included', 'Included')}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold border border-red-200">
              ✕ {excludedCount} {t('scopeModal.excluded', 'Excluded')}
            </span>
            {addonsCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                + {addonsCount} {t('scopeModal.alternate', 'Alternates')}
              </span>
            )}
          </div>
        </div>

        {/* Trade Category Tabs */}
        <div className="pt-3 pb-2 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              activeCategory === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('scopeModal.catAll', 'All Items')} ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('fixtures')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              activeCategory === 'fixtures'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🚽 {t('scopeModal.catFixtures', 'Fixtures (Toilets, Sinks, Faucets)')}
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('site')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              activeCategory === 'site'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🚜 {t('scopeModal.catSite', 'Site & Trench Earthwork')}
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('admin')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              activeCategory === 'admin'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📋 {t('scopeModal.catAdmin', 'Permits & Testing')}
          </button>
        </div>

        {/* Scrollable Item List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 my-3 pr-1">
          {filteredItems.map((item) => {
            const isIncluded = item.status === SCOPE_STATUS.INCLUDED;
            const isExcluded = item.status === SCOPE_STATUS.EXCLUDED;
            const isAddon = item.status === SCOPE_STATUS.OPTIONAL_ADDON;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isIncluded
                    ? 'bg-emerald-50/40 border-emerald-200/80'
                    : isExcluded
                    ? 'bg-rose-50/40 border-rose-200/80'
                    : 'bg-indigo-50/40 border-indigo-200/80'
                }`}
              >
                <div className="space-y-0.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-md ${
                      item.category === 'fixtures'
                        ? 'bg-amber-100 text-amber-800'
                        : item.category === 'site'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                </div>

                {/* Status Switcher Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleStatusChange(item.id, SCOPE_STATUS.INCLUDED)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                      isIncluded
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✓ {t('scopeModal.btnIncluded', 'Include')}
                  </button>

                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleStatusChange(item.id, SCOPE_STATUS.EXCLUDED)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                      isExcluded
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✕ {t('scopeModal.btnExcluded', 'Exclude')}
                  </button>

                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleStatusChange(item.id, SCOPE_STATUS.OPTIONAL_ADDON)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                      isAddon
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    + {t('scopeModal.btnAddon', 'Add-On')}
                  </button>

                  {!item.isStandard && !readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition ml-1"
                      title={t('common.delete')}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Custom Scope Item Form */}
        {!readOnly && (
          <form onSubmit={handleAddItem} className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder={t('scopeModal.customTitlePlaceholder', 'Custom Item / Trade Boundary (e.g., ADA Sink Carriers)')}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-slate-700"
            >
              <option value="fixtures">🚽 Fixtures</option>
              <option value="site">🚜 Site & Utilities</option>
              <option value="admin">📋 Admin & Permits</option>
            </select>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
            >
              + {t('scopeModal.addCustomBtn', 'Add Item')}
            </button>
          </form>
        )}

        {/* Action Buttons */}
        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            {t('common.cancel')}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500 rounded-xl shadow-md transition cursor-pointer"
          >
            {t('scopeModal.saveAndApply', 'Save Scope Clarifications')}
          </button>
        </div>
      </div>
    </div>
  );
}
