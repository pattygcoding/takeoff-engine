import React, { useState, useEffect } from 'react';
import {
  SCOPE_STATUS,
  DEFAULT_SCOPE_ITEMS,
  getSavedScopePresets,
  saveScopePreset,
  deleteScopePreset,
} from '@/product/lib/scope';
import { useTranslation } from '@/core/components/context/I18nContext';

export default function ScopeInclusionsModal({
  scopeItems = DEFAULT_SCOPE_ITEMS,
  onSave,
  onClose,
  readOnly = false,
  // 'modal' (default, centered overlay dialog) or 'panel' (inline collapsible strip)
  variant = 'modal',
  expanded = false,
  onToggleExpanded,
}) {
  const { t } = useTranslation();
  const isPanel = variant === 'panel';
  const [items, setItems] = useState(() => {
    return Array.isArray(scopeItems) && scopeItems.length > 0
      ? JSON.parse(JSON.stringify(scopeItems))
      : JSON.parse(JSON.stringify(DEFAULT_SCOPE_ITEMS));
  });

  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'fixtures' | 'site' | 'admin'
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('fixtures');

  // Preset management state
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [showSavePresetInput, setShowSavePresetInput] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetFeedback, setPresetFeedback] = useState('');

  useEffect(() => {
    setPresets(getSavedScopePresets());
  }, []);

  // Keep local items in sync if parent-provided scope data changes externally (panel stays mounted)
  useEffect(() => {
    if (isPanel) {
      setItems(
        Array.isArray(scopeItems) && scopeItems.length > 0
          ? JSON.parse(JSON.stringify(scopeItems))
          : JSON.parse(JSON.stringify(DEFAULT_SCOPE_ITEMS))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeItems]);

  const applyItemChanges = (updater) => {
    const nextItems = updater(items);
    setItems(nextItems);
    onSave?.(nextItems);
  };

  const handleStatusChange = (id, newStatus) => {
    if (readOnly) return;
    applyItemChanges((currentItems) =>
      currentItems.map((it) => (it.id === id ? { ...it, status: newStatus } : it))
    );
  };

  const handleRemoveItem = (id) => {
    if (readOnly) return;
    applyItemChanges((currentItems) => currentItems.filter((it) => it.id !== id));
  };

  // Add-on pricing stays negotiable even when the rest of the project is locked/submitted.
  const handleCostImpactChange = (id, rawValue) => {
    const parsed = rawValue === '' ? 0 : Number(rawValue);
    applyItemChanges((currentItems) =>
      currentItems.map((it) => (it.id === id ? { ...it, costImpact: Number.isFinite(parsed) ? parsed : 0 } : it))
    );
  };

  const handleCostImpactTypeChange = (id, costImpactType) => {
    applyItemChanges((currentItems) =>
      currentItems.map((it) => (it.id === id ? { ...it, costImpactType } : it))
    );
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
      costImpactType: 'flat',
      isStandard: false,
    };

    applyItemChanges((currentItems) => [...currentItems, newItem]);
    setNewTitle('');
    setNewDesc('');
  };

  const handleSavePreset = (e) => {
    e.preventDefault();
    if (!presetNameInput.trim()) return;
    const created = saveScopePreset(presetNameInput.trim(), items);
    if (created) {
      const updatedList = getSavedScopePresets();
      setPresets(updatedList);
      setSelectedPresetId(created.id);
      setShowSavePresetInput(false);
      setPresetNameInput('');
      setPresetFeedback(t('product.scopeModal.presetSaved', 'Preset saved successfully!'));
      setTimeout(() => setPresetFeedback(''), 3000);
    }
  };

  const handleApplyPreset = (presetId) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const found = presets.find((p) => p.id === presetId);
    if (found && Array.isArray(found.items)) {
      applyItemChanges(() => JSON.parse(JSON.stringify(found.items)));
      setPresetFeedback(t('product.scopeModal.presetLoaded', 'Preset applied!'));
      setTimeout(() => setPresetFeedback(''), 3000);
    }
  };

  const handleDeletePreset = (presetId, e) => {
    e.stopPropagation();
    const updated = deleteScopePreset(presetId);
    setPresets(updated);
    if (selectedPresetId === presetId) {
      setSelectedPresetId('');
    }
    setPresetFeedback(t('product.scopeModal.presetDeleted', 'Preset removed.'));
    setTimeout(() => setPresetFeedback(''), 3000);
  };

  const handleResetToDefault = () => {
    applyItemChanges(() => JSON.parse(JSON.stringify(DEFAULT_SCOPE_ITEMS)));
    setSelectedPresetId('');
    setPresetFeedback(t('product.scopeModal.resetApplied', 'Reset to defaults.'));
    setTimeout(() => setPresetFeedback(''), 3000);
  };

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter((it) => it.category === activeCategory);

  const includedCount = items.filter((it) => it.status === SCOPE_STATUS.INCLUDED).length;
  const excludedCount = items.filter((it) => it.status === SCOPE_STATUS.EXCLUDED).length;
  const addonsCount = items.filter((it) => it.status === SCOPE_STATUS.OPTIONAL_ADDON).length;
  const naCount = items.filter((it) => it.status === SCOPE_STATUS.NOT_APPLICABLE).length;

  const metricsBadges = (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
        ✓ {includedCount} {t('product.scopeModal.included', 'Included')}
      </span>
      <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
        ✕ {excludedCount} {t('product.scopeModal.excluded', 'Excluded')}
      </span>
      {addonsCount > 0 && (
        <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
          + {addonsCount} {t('product.scopeModal.alternate', 'Alternates')}
        </span>
      )}
      {naCount > 0 && (
        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">
          — {naCount} {t('product.scopeModal.na', 'N/A')}
        </span>
      )}
    </div>
  );

  const body = (
    <>
      {/* Preset Management Toolbar */}
      {!readOnly && (
          <div className="py-2.5 px-3.5 my-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                💾 {t('product.scopeModal.presetsLabel', 'Presets')}:
              </span>
              <select
                value={selectedPresetId}
                onChange={(e) => handleApplyPreset(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 font-medium cursor-pointer"
              >
                <option value="">{t('product.scopeModal.selectPreset', '-- Select Preset Template --')}</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.items?.length || 0} items)
                  </option>
                ))}
              </select>

              {selectedPresetId && (
                <button
                  type="button"
                  onClick={(e) => handleDeletePreset(selectedPresetId, e)}
                  className="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer font-bold"
                  title={t('product.scopeModal.deletePresetTooltip', 'Delete this preset')}
                >
                  ✕ {t('core.common.delete')}
                </button>
              )}

              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-medium transition cursor-pointer"
              >
                ↺ {t('product.scopeModal.btnResetDefault', 'Reset Defaults')}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!showSavePresetInput ? (
                <button
                  type="button"
                  onClick={() => setShowSavePresetInput(true)}
                  className="px-3 py-1.5 bg-amber-400 dark:bg-amber-500 hover:bg-amber-500 dark:hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  + {t('product.scopeModal.btnSaveAsPreset', 'Save as Preset')}
                </button>
              ) : (
                <form onSubmit={handleSavePreset} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    placeholder={t('product.scopeModal.presetNamePlaceholder', 'Preset name (e.g. Turnkey Civil Scope)...')}
                    value={presetNameInput}
                    onChange={(e) => setPresetNameInput(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!presetNameInput.trim()}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    ✓ {t('core.common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSavePresetInput(false);
                      setPresetNameInput('');
                    }}
                    className="px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                  >
                    ✕
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {presetFeedback && (
          <div className="px-3 py-1.5 mb-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold animate-fade-in flex items-center gap-1.5">
            <span>ℹ️</span>
            <span>{presetFeedback}</span>
          </div>
        )}

        {/* Trade Category Tabs */}
        <div className="pt-1 pb-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              activeCategory === 'all'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('product.scopeModal.catAll', 'All Items')} ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('fixtures')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              activeCategory === 'fixtures'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            🚽 {t('product.scopeModal.catFixtures', 'Fixtures (Toilets, Sinks, Faucets)')}
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('site')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              activeCategory === 'site'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            🚜 {t('product.scopeModal.catSite', 'Site & Trench Earthwork')}
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('admin')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              activeCategory === 'admin'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            📋 {t('product.scopeModal.catAdmin', 'Permits & Testing')}
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('misc')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              activeCategory === 'misc'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            📦 {t('product.scopeModal.catMisc', 'Miscellaneous & Other')}
          </button>
        </div>

        {/* Scrollable Item List */}
        <div className={`space-y-2.5 my-2.5 pr-1 ${isPanel ? 'max-h-[26rem] overflow-y-auto' : 'flex-1 overflow-y-auto'}`}>
          {filteredItems.map((item) => {
            const isIncluded = item.status === SCOPE_STATUS.INCLUDED;
            const isExcluded = item.status === SCOPE_STATUS.EXCLUDED;
            const isAddon = item.status === SCOPE_STATUS.OPTIONAL_ADDON;
            const isNA = item.status === SCOPE_STATUS.NOT_APPLICABLE;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isIncluded
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60'
                    : isExcluded
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/60'
                    : isAddon
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-800/60'
                    : 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'
                }`}
              >
                <div className="space-y-0.5 max-w-lg min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-md ${
                      item.category === 'fixtures'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        : item.category === 'site'
                        ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                        : item.category === 'admin'
                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words">{item.description}</p>

                  {isAddon && (
                    <div className="pt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                          {t('product.scopeModal.addonPriceLabel', 'Add-on price')}
                        </span>
                        <div className="inline-flex rounded-lg border border-indigo-200 dark:border-indigo-800 overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCostImpactTypeChange(item.id, 'flat')}
                            className={`px-2 py-1 text-[11px] font-bold transition cursor-pointer ${
                              item.costImpactType === 'percent'
                                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300'
                                : 'bg-indigo-600 text-white'
                            }`}
                          >
                            $
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCostImpactTypeChange(item.id, 'percent')}
                            className={`px-2 py-1 text-[11px] font-bold transition cursor-pointer ${
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
                          step="0.01"
                          min="0"
                          value={item.costImpact ?? 0}
                          onChange={(e) => handleCostImpactChange(item.id, e.target.value)}
                          className="w-24 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      {item.costImpactType === 'percent' && (
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                          {t('product.counterOfferModal.percentAmountBasis', 'Percentage add-ons are calculated from the initial direct cost before contingency and profit are applied.')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Switcher Buttons */}
                <div className="flex flex-wrap items-center gap-1 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleStatusChange(item.id, SCOPE_STATUS.INCLUDED)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                      isIncluded
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    ✓ {t('product.scopeModal.btnIncluded', 'Include')}
                  </button>

                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleStatusChange(item.id, SCOPE_STATUS.EXCLUDED)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                      isExcluded
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    ✕ {t('product.scopeModal.btnExcluded', 'Exclude')}
                  </button>

                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleStatusChange(item.id, SCOPE_STATUS.OPTIONAL_ADDON)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                      isAddon
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    + {t('product.scopeModal.btnAddon', 'Add-On')}
                  </button>

                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleStatusChange(item.id, SCOPE_STATUS.NOT_APPLICABLE)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                      isNA
                        ? 'bg-slate-600 dark:bg-slate-500 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    — {t('product.scopeModal.btnNA', 'N/A')}
                  </button>

                  {!item.isStandard && !readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition ml-0.5 cursor-pointer"
                      title={t('core.common.delete')}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Custom Scope Item Form with Title, Category, and Description */}
        {!readOnly && (
          <form onSubmit={handleAddItem} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={t('product.scopeModal.customTitlePlaceholder', 'Item title (e.g., ADA Sink Carriers, Trench Dewatering)')}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="text-xs px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="fixtures">🚽 Fixtures</option>
                <option value="site">🚜 Site & Utilities</option>
                <option value="admin">📋 Admin & Permits</option>
                <option value="misc">📦 Misc & Other</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={t('product.scopeModal.customDescPlaceholder', 'Item description / spec notes (e.g., Owner furnishes, contractor installs per drawing P-102)...')}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
              >
                + {t('product.scopeModal.addCustomBtn', 'Add Item')}
              </button>
            </div>
          </form>
        )}

        {/* Action Buttons */}
        <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {isPanel ? (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {t('product.scopeModal.autoAppliedHint', 'Changes apply to this project\u2019s proposal.')}
            </span>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              {t('core.common.close', 'Close')}
            </button>
          )}
        </div>
    </>
  );

  if (isPanel) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center text-lg shrink-0 font-bold border border-amber-300 dark:border-amber-700">
              ⚖️
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug truncate">
                {t('product.scopeModal.title', 'Scope Inclusions & Exclusions')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate hidden sm:block">
                {t('product.scopeModal.subtitle', 'Configure trade boundaries, fixture provisions, add-ons, and exclusions.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {metricsBadges}
            <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </button>

        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-slate-100 dark:border-slate-800">
              {body}
            </div>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full p-5 sm:p-7 border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col my-auto text-slate-900 dark:text-slate-100">
        {/* Modal Header with Yellow/Amber Accent */}
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center text-xl shrink-0 font-bold border border-amber-300 dark:border-amber-700">
              ⚖️
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                {t('product.scopeModal.title', 'Scope Inclusions & Exclusions')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('product.scopeModal.subtitle', 'Configure trade boundaries, fixture provisions, add-ons, and exclusions.')}
              </p>
            </div>
          </div>

          {metricsBadges}
        </div>

        {body}
      </div>

    </div>
  );
}

function SavedConfirmModal({ t, onDismiss }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold border border-emerald-300 dark:border-emerald-700">
          ✓
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-4">
          {t('product.scopeModal.savedConfirmTitle', 'Saved Successfully')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          {t('product.scopeModal.savedConfirmDesc', 'Your scope inclusions and exclusions have been saved and applied to this project.')}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
        >
          {t('core.common.ok', 'OK')}
        </button>
      </div>
    </div>
  );
}


