import React, { useState, useEffect } from 'react';
import { ratesApi } from '@/lib/rates';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useTranslation } from '@/context/I18nContext';
import UpgradeModal from './UpgradeModal';

export default function RatesDrawer({ open, onClose, rates, onChange, readOnly = false }) {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const { t } = useTranslation();
  const [libraries, setLibraries] = useState({ systemDefaults: [], userLibraries: [] });
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateDescInput, setTemplateDescInput] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [loadLoading, setLoadLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadRates();
    }
  }, [open, user]);

  const loadRates = async () => {
    try {
      setLoadLoading(true);
      setErrorMsg('');
      const data = await ratesApi.list();
      setLibraries(data);
    } catch (err) {
      console.warn('Could not load rate templates:', err.message);
    } finally {
      setLoadLoading(false);
    }
  };

  const handleApplyTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const all = [...(libraries.systemDefaults || []), ...(libraries.userLibraries || [])];
    const match = all.find((t) => t.id === templateId);
    if (match && match.rates_json) {
      onChange({
        ...rates,
        ...match.rates_json,
      });
      setSuccessMsg(t('ratesDrawer.appliedTemplate', { name: match.name }));
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleSaveCurrentAsTemplate = async (e) => {
    e.preventDefault();
    if (!templateNameInput.trim()) return;

    setSaveLoading(true);
    setErrorMsg('');
    try {
      await ratesApi.create({
        name: templateNameInput.trim(),
        description: templateDescInput.trim(),
        isDefault: false,
        ratesJson: rates,
      });
      setTemplateNameInput('');
      setTemplateDescInput('');
      setShowSaveModal(false);
      setSuccessMsg(t('ratesDrawer.savedNewLibrary'));
      setTimeout(() => setSuccessMsg(''), 3500);
      await loadRates();
    } catch (err) {
      if (err.code === 'RATE_LIMIT_EXCEEDED') {
        setShowSaveModal(false);
        setShowUpgradeModal(true);
      } else {
        setErrorMsg(err.message || t('ratesDrawer.failedSaveTemplate'));
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId, e) => {
    e.stopPropagation();
    const confirmed = await showConfirm({
      title: t('ratesDrawer.deleteTitle'),
      message: t('ratesDrawer.deleteMessage'),
      confirmText: t('ratesDrawer.deleteConfirmText'),
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
      await ratesApi.delete(templateId);
      await loadRates();
      if (selectedTemplateId === templateId) setSelectedTemplateId('');
    } catch (err) {
      await showAlert({
        title: t('ratesDrawer.deleteErrorTitle'),
        message: err.message || t('ratesDrawer.deleteErrorMessage'),
        variant: 'error',
      });
    }
  };

  const update = (field) => (e) => {
    const value = e.target.value;
    onChange({ ...rates, [field]: value === '' ? '' : Number(value) });
  };

  const updateType = (field, type) => {
    onChange({ ...rates, [field]: type });
  };

  const miscItems = Array.isArray(rates.miscItems) ? rates.miscItems : [];

  const handleAddMiscItem = () => {
    const newItem = {
      id: String(Date.now() + Math.random()),
      title: '',
      amount: '',
    };
    const updated = [...miscItems, newItem];
    const totalAmount = updated.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    onChange({
      ...rates,
      miscItems: updated,
      miscCost: totalAmount,
    });
  };

  const handleUpdateMiscItem = (id, field, val) => {
    const updated = miscItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === 'amount' ? (val === '' ? '' : Number(val)) : val,
        };
      }
      return item;
    });
    const totalAmount = updated.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    onChange({
      ...rates,
      miscItems: updated,
      miscCost: totalAmount,
    });
  };

  const handleRemoveMiscItem = (id) => {
    const updated = miscItems.filter((item) => item.id !== id);
    const totalAmount = updated.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    onChange({
      ...rates,
      miscItems: updated,
      miscCost: totalAmount,
    });
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-20" onClick={onClose} />}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-30 transform transition-transform overflow-y-auto
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('ratesDrawer.title')}</h2>
              <p className="text-xs text-slate-500">{t('ratesDrawer.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" type="button">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {readOnly && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>{t('ratesDrawer.ratesLocked')}</span>
            </div>
          )}

          {/* Rate Template Switcher */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {t('ratesDrawer.rateLibraryTemplate')}
              </span>
              {user && !readOnly && (
                <button
                  type="button"
                  onClick={() => setShowSaveModal(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  {t('ratesDrawer.saveCurrentAsNew')}
                </button>
              )}
            </div>

            {successMsg && (
              <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
                ✓ {successMsg}
              </div>
            )}

            <select
              value={selectedTemplateId}
              onChange={(e) => handleApplyTemplate(e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed"
            >
              <option value="">{t('ratesDrawer.chooseRateTemplate')}</option>
              {libraries.userLibraries?.length > 0 && (
                <optgroup label={t('ratesDrawer.yourCustomLibraries')}>
                  {libraries.userLibraries.map((lib) => (
                    <option key={lib.id} value={lib.id}>
                      {lib.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label={t('ratesDrawer.systemDefaultLibraries')}>
                {libraries.systemDefaults?.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name}
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Custom Libraries manager pill */}
            {libraries.userLibraries?.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-2.5">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t('ratesDrawer.savedLibraries')}</p>
                {libraries.userLibraries.map((lib) => (
                  <div key={lib.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-slate-200">
                    <span className="truncate font-medium text-slate-700 max-w-[220px]">{lib.name}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTemplate(lib.id, e)}
                        className="text-slate-400 hover:text-red-600 transition ml-2"
                        title={t('ratesDrawer.deleteLibrary')}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <section>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">{t('ratesDrawer.baseLaborRate')}</h3>
            <Field label={t('ratesDrawer.baseLaborHourlyRate')} value={rates.laborHourlyRate} onChange={update('laborHourlyRate')} disabled={readOnly} />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">{t('ratesDrawer.trenchingEarthwork')}</h3>
            <Field label={t('ratesDrawer.trenchWidth')} value={rates.trenchWidthFt} onChange={update('trenchWidthFt')} disabled={readOnly} />
            <p className="text-xs text-slate-400 mt-1">
              {t('ratesDrawer.trenchVolumeFormula')}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">{t('ratesDrawer.markupBusinessConstants')}</h3>
            <DualModeField
              label={t('ratesDrawer.overhead')}
              value={rates.overheadPct}
              onChange={update('overheadPct')}
              type={rates.overheadType || 'percent'}
              onTypeChange={(t) => updateType('overheadType', t)}
              disabled={readOnly}
            />
            <DualModeField
              label={t('ratesDrawer.contingency')}
              value={rates.contingencyPct}
              onChange={update('contingencyPct')}
              type={rates.contingencyType || 'percent'}
              onTypeChange={(t) => updateType('contingencyType', t)}
              disabled={readOnly}
            />
            <DualModeField
              label={t('ratesDrawer.profitMargin')}
              value={rates.profitPct}
              onChange={update('profitPct')}
              type={rates.profitType || 'percent'}
              onTypeChange={(t) => updateType('profitType', t)}
              disabled={readOnly}
            />
            <DualModeField
              label={t('ratesDrawer.mobilizationEquipment')}
              value={rates.equipmentLumpSum}
              onChange={update('equipmentLumpSum')}
              type={rates.equipmentType || 'fixed'}
              onTypeChange={(t) => updateType('equipmentType', t)}
              disabled={readOnly}
            />

            {/* Itemized Miscellaneous Costs Section */}
            <div className="mb-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-slate-700 block">
                    {t('ratesDrawer.miscellaneousCosts')}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {t('ratesDrawer.miscTotal')} ${(rates.miscCost ?? 0).toLocaleString()}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleAddMiscItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                  >
                    {t('ratesDrawer.addMiscItem')}
                  </button>
                )}
              </div>

              {miscItems.length === 0 ? (
                <div className="p-3 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  {t('ratesDrawer.noMiscItems')}
                </div>
              ) : (
                <div className="space-y-2">
                  {miscItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <input
                        type="text"
                        placeholder={t('ratesDrawer.miscItemTitlePlaceholder')}
                        value={item.title || ''}
                        disabled={readOnly}
                        onChange={(e) => handleUpdateMiscItem(item.id, 'title', e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden w-28 shrink-0 focus-within:ring-1 focus-within:ring-indigo-500">
                        <span className="pl-2 text-xs text-slate-400">$</span>
                        <input
                          type="number"
                          placeholder={t('ratesDrawer.miscItemAmountPlaceholder')}
                          value={item.amount === 0 ? 0 : item.amount || ''}
                          disabled={readOnly}
                          onChange={(e) => handleUpdateMiscItem(item.id, 'amount', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs text-right outline-none"
                          step="any"
                        />
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMiscItem(item.id)}
                          aria-label="Remove item"
                          className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Save Template Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5">
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('ratesDrawer.saveModalTitle')}</h3>
              <p className="text-xs text-slate-500 mb-4">
                {t('ratesDrawer.saveModalSubtitle')}
              </p>

              {errorMsg && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  ✕ {errorMsg}
                </div>
              )}

              <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('ratesDrawer.templateName')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('ratesDrawer.templateNamePlaceholder')}
                    value={templateNameInput}
                    onChange={(e) => setTemplateNameInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('ratesDrawer.templateDescription')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('ratesDrawer.templateDescriptionPlaceholder')}
                    value={templateDescInput}
                    onChange={(e) => setTemplateDescInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {saveLoading ? t('ratesDrawer.saving') : t('ratesDrawer.saveTemplate')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </aside>
    </>
  );
}

function Field({ label, value, onChange, prefix, suffix, disabled = false }) {
  return (
    <label className="block mb-4">
      <span className="text-sm text-slate-600">{label}</span>
      <div className={`mt-1 flex items-center rounded-md border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden ${disabled ? 'bg-slate-50 opacity-80' : ''}`}>
        {prefix && <span className="pl-3 text-slate-400 text-sm">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm outline-none disabled:cursor-not-allowed"
          step="any"
        />
        {suffix && <span className="pr-3 text-slate-400 text-sm">{suffix}</span>}
      </div>
    </label>
  );
}

function DualModeField({ label, value, onChange, type = 'percent', onTypeChange, disabled = false }) {
  const isPercent = type === 'percent';
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-600">{label}</span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onTypeChange('percent')}
            className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${
              isPercent
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            } disabled:cursor-not-allowed`}
          >
            %
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onTypeChange('fixed')}
            className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${
              !isPercent
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            } disabled:cursor-not-allowed`}
          >
            $
          </button>
        </div>
      </div>
      <div className={`flex items-center rounded-md border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden ${disabled ? 'bg-slate-50 opacity-80' : ''}`}>
        {!isPercent && <span className="pl-3 text-slate-400 text-sm">$</span>}
        <input
          type="number"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm outline-none disabled:cursor-not-allowed"
          step="any"
        />
        {isPercent && <span className="pr-3 text-slate-400 text-sm">%</span>}
      </div>
    </div>
  );
}
