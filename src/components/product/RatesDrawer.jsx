import React, { useState, useEffect } from 'react';
import { ratesApi } from '@/lib/product/rates';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';
import { useTranslation } from '@/context/I18nContext';
import {
  DEFAULT_WORKDAY_HOURS,
  DEFAULT_LABOR_ROLES,
  getNormalizedLaborRates,
  calculateBlendedCrewRate,
} from '@/lib/product/calculations';
import { DEFAULT_SCOPE_ITEMS, summarizeScope } from '@/lib/product/scope';
import ScopeInclusionsModal from '@/components/product/ScopeInclusionsModal';
import UpgradeModal from '@/components/billing/UpgradeModal';

export default function RatesDrawer({ open, onClose, rates, onChange, readOnly = false }) {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const { t } = useTranslation();
  const [libraries, setLibraries] = useState({ systemDefaults: [], userLibraries: [] });
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateDescInput, setTemplateDescInput] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
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

  const laborBasis = rates.laborRateBasis === 'daily' ? 'daily' : 'hourly';
  const workdayHours = Number(rates.workdayHours) > 0 ? Number(rates.workdayHours) : DEFAULT_WORKDAY_HOURS;
  const normalizedLabor = getNormalizedLaborRates(rates);

  const handleLaborBasisChange = (newBasis) => {
    if (readOnly) return;
    const currentHourly = Number(rates.laborHourlyRate) || normalizedLabor.laborHourlyRate;
    const currentDaily = Number(rates.laborDailyRate) || normalizedLabor.laborDailyRate;
    const currentHours = Number(rates.workdayHours) || workdayHours;

    if (newBasis === 'daily') {
      const derivedDaily = currentDaily > 0 ? currentDaily : Math.round(currentHourly * currentHours * 100) / 100;
      onChange({
        ...rates,
        laborRateBasis: 'daily',
        laborDailyRate: derivedDaily,
        laborHourlyRate: currentHours > 0 ? Math.round((derivedDaily / currentHours) * 100) / 100 : currentHourly,
        workdayHours: currentHours,
      });
    } else {
      const derivedHourly = currentHourly > 0 ? currentHourly : (currentHours > 0 ? Math.round((currentDaily / currentHours) * 100) / 100 : 65.0);
      onChange({
        ...rates,
        laborRateBasis: 'hourly',
        laborHourlyRate: derivedHourly,
        laborDailyRate: Math.round(derivedHourly * currentHours * 100) / 100,
        workdayHours: currentHours,
      });
    }
  };

  const handleHourlyRateChange = (e) => {
    if (readOnly) return;
    const val = e.target.value;
    if (val === '') {
      onChange({ ...rates, laborHourlyRate: '', laborDailyRate: '' });
      return;
    }
    const hourly = Number(val);
    const daily = Math.round(hourly * workdayHours * 100) / 100;
    onChange({
      ...rates,
      laborHourlyRate: hourly,
      laborDailyRate: daily,
    });
  };

  const handleDailyRateChange = (e) => {
    if (readOnly) return;
    const val = e.target.value;
    if (val === '') {
      onChange({ ...rates, laborDailyRate: '', laborHourlyRate: '' });
      return;
    }
    const daily = Number(val);
    const hourly = workdayHours > 0 ? Math.round((daily / workdayHours) * 100) / 100 : 0;
    onChange({
      ...rates,
      laborDailyRate: daily,
      laborHourlyRate: hourly,
    });
  };

  const handleWorkdayHoursChange = (e) => {
    if (readOnly) return;
    const val = e.target.value;
    if (val === '') {
      onChange({ ...rates, workdayHours: '' });
      return;
    }
    const hours = Number(val);
    if (laborBasis === 'daily') {
      const daily = Number(rates.laborDailyRate) || normalizedLabor.laborDailyRate;
      const hourly = hours > 0 ? Math.round((daily / hours) * 100) / 100 : 0;
      onChange({
        ...rates,
        workdayHours: hours,
        laborHourlyRate: hourly,
      });
    } else {
      const hourly = Number(rates.laborHourlyRate) || normalizedLabor.laborHourlyRate;
      const daily = Math.round(hourly * hours * 100) / 100;
      onChange({
        ...rates,
        workdayHours: hours,
        laborDailyRate: daily,
      });
    }
  };

  const laborRoles = Array.isArray(rates.laborRoles) && rates.laborRoles.length > 0
    ? rates.laborRoles
    : normalizedLabor.laborRoles;

  const [showCrewCalculator, setShowCrewCalculator] = useState(false);
  const [crewComposition, setCrewComposition] = useState(() =>
    laborRoles.map((r) => ({ roleId: r.id, title: r.title, hourlyRate: r.hourlyRate, count: r.id === 'journeyman' ? 2 : r.id === 'foreman' ? 1 : r.id === 'apprentice' ? 1 : 0 }))
  );

  const blendedResult = calculateBlendedCrewRate(crewComposition, laborRoles);

  const handleApplyBlendedRate = () => {
    if (readOnly || blendedResult.blendedHourlyRate <= 0) return;
    const blendedHourly = blendedResult.blendedHourlyRate;
    const blendedDaily = Math.round(blendedHourly * workdayHours * 100) / 100;

    onChange({
      ...rates,
      laborHourlyRate: blendedHourly,
      laborDailyRate: blendedDaily,
    });
    setShowCrewCalculator(false);
    setSuccessMsg(t('ratesDrawer.appliedBlendedCrewRate', { rate: blendedHourly.toFixed(2) }));
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleUpdateRole = (roleId, field, val) => {
    if (readOnly) return;
    const updated = laborRoles.map((r) => {
      if (r.id !== roleId) return r;
      if (field === 'title') {
        return { ...r, title: val };
      }
      if (field === 'hourlyRate') {
        const hourly = val === '' ? '' : Number(val);
        const daily = hourly === '' ? '' : Math.round(hourly * workdayHours * 100) / 100;
        return { ...r, hourlyRate: hourly, dailyRate: daily };
      }
      if (field === 'dailyRate') {
        const daily = val === '' ? '' : Number(val);
        const hourly = daily === '' ? '' : (workdayHours > 0 ? Math.round((daily / workdayHours) * 100) / 100 : 0);
        return { ...r, dailyRate: daily, hourlyRate: hourly };
      }
      return r;
    });

    onChange({
      ...rates,
      laborRoles: updated,
    });
  };

  const handleAddCustomRole = () => {
    if (readOnly) return;
    const newId = `role-${Date.now()}`;
    const newRole = {
      id: newId,
      title: t('ratesDrawer.newRolePlaceholder', 'Specialty Trade Role'),
      hourlyRate: 65.0,
      dailyRate: Math.round(65.0 * workdayHours * 100) / 100,
    };
    onChange({
      ...rates,
      laborRoles: [...laborRoles, newRole],
    });
  };

  const handleRemoveRole = (roleId) => {
    if (readOnly) return;
    if (laborRoles.length <= 1) return;
    const filtered = laborRoles.filter((r) => r.id !== roleId);
    onChange({
      ...rates,
      laborRoles: filtered,
    });
  };

  const miscItems = Array.isArray(rates?.miscItems) ? rates.miscItems : [];

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
      {open && <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-20" onClick={onClose} />}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-30 transform transition-transform overflow-y-auto text-slate-900 dark:text-slate-100
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('ratesDrawer.title')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('ratesDrawer.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" type="button">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {readOnly && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>{t('ratesDrawer.ratesLocked')}</span>
            </div>
          )}

          {/* Rate Template Switcher */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t('ratesDrawer.rateLibraryTemplate')}
              </span>
              {user && !readOnly && (
                <button
                  type="button"
                  onClick={() => setShowSaveModal(true)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition cursor-pointer"
                >
                  {t('ratesDrawer.saveCurrentAsNew')}
                </button>
              )}
            </div>

            {successMsg && (
              <div className="mb-3 p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg font-medium">
                ✓ {successMsg}
              </div>
            )}

            <select
              value={selectedTemplateId}
              onChange={(e) => handleApplyTemplate(e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed cursor-pointer"
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
              <div className="mt-3 space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-2.5">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('ratesDrawer.savedLibraries')}</p>
                {libraries.userLibraries.map((lib) => (
                  <div key={lib.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200 max-w-[220px]">{lib.name}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTemplate(lib.id, e)}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition ml-2 cursor-pointer"
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{t('ratesDrawer.baseLaborRate')}</h3>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleLaborBasisChange('hourly')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    laborBasis === 'hourly'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  } disabled:cursor-not-allowed`}
                >
                  {t('ratesDrawer.hourlyBasis', 'Hourly ($/hr)')}
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleLaborBasisChange('daily')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    laborBasis === 'daily'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  } disabled:cursor-not-allowed`}
                >
                  {t('ratesDrawer.dailyBasis', 'Daily ($/day)')}
                </button>
              </div>
            </div>

            {laborBasis === 'hourly' ? (
              <>
                <Field
                  label={t('ratesDrawer.baseLaborHourlyRate')}
                  value={rates.laborHourlyRate}
                  onChange={handleHourlyRateChange}
                  disabled={readOnly}
                  prefix="$"
                  suffix="/ hr"
                />
                <div className="flex items-center justify-between px-2.5 py-1.5 -mt-2 mb-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/60 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
                  <span className="font-medium">
                    {t('ratesDrawer.effectiveDailyRateBadge', {
                      rate: normalizedLabor.laborDailyRate.toFixed(2),
                      hours: workdayHours,
                    })}
                  </span>
                  <span className="text-[11px] text-indigo-500 dark:text-indigo-400">
                    ({workdayHours} hrs/day)
                  </span>
                </div>
              </>
            ) : (
              <>
                <Field
                  label={t('ratesDrawer.baseLaborDailyRate', 'Base Labor Daily Rate ($/day)')}
                  value={rates.laborDailyRate}
                  onChange={handleDailyRateChange}
                  disabled={readOnly}
                  prefix="$"
                  suffix="/ day"
                />
                <div className="flex items-center justify-between px-2.5 py-1.5 -mt-2 mb-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/60 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
                  <span className="font-medium">
                    {t('ratesDrawer.effectiveHourlyRateBadge', {
                      rate: normalizedLabor.laborHourlyRate.toFixed(2),
                    })}
                  </span>
                  <span className="text-[11px] text-indigo-500 dark:text-indigo-400">
                    ({workdayHours} hrs/day)
                  </span>
                </div>
              </>
            )}

            <Field
              label={t('ratesDrawer.workdayHours', 'Hours per Workday (hrs/day)')}
              value={rates.workdayHours ?? DEFAULT_WORKDAY_HOURS}
              onChange={handleWorkdayHoursChange}
              disabled={readOnly}
              suffix="hrs"
            />
          </section>

          {/* US-045: Labor Roles & Crew Rankings */}
          <section className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t('ratesDrawer.laborRolesHeader', 'Labor Roles & Crew Rankings')}
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {t('ratesDrawer.laborRolesDesc', 'Set trade tier billing rates and assign them to individual line items.')}
                </p>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setShowCrewCalculator(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900 cursor-pointer"
                  title={t('ratesDrawer.blendedCrewTooltip', 'Calculate composite blended hourly rate based on crew composition')}
                >
                  👥 {t('ratesDrawer.blendedCrewBtn', 'Crew Blend')}
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {laborRoles.map((role) => (
                <div
                  key={role.id}
                  className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={role.title}
                      disabled={readOnly}
                      onChange={(e) => handleUpdateRole(role.id, 'title', e.target.value)}
                      className="flex-1 min-w-0 font-semibold text-xs text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none"
                    />
                    {!readOnly && laborRoles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role.id)}
                        className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 text-xs p-1 cursor-pointer"
                        title={t('ratesDrawer.removeRole', 'Remove Role')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                      <span className="text-slate-400 dark:text-slate-500 mr-1">$</span>
                      <input
                        type="number"
                        step="any"
                        value={role.hourlyRate}
                        disabled={readOnly}
                        onChange={(e) => handleUpdateRole(role.id, 'hourlyRate', e.target.value)}
                        className="w-full bg-transparent text-right outline-none text-slate-900 dark:text-slate-100"
                        placeholder="0.00"
                      />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">/hr</span>
                    </div>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                      <span className="text-slate-400 dark:text-slate-500 mr-1">$</span>
                      <input
                        type="number"
                        step="any"
                        value={role.dailyRate}
                        disabled={readOnly}
                        onChange={(e) => handleUpdateRole(role.id, 'dailyRate', e.target.value)}
                        className="w-full bg-transparent text-right outline-none text-slate-900 dark:text-slate-100"
                        placeholder="0.00"
                      />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">/day</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={handleAddCustomRole}
                className="mt-3 w-full py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-white dark:bg-slate-800 border border-dashed border-indigo-200 dark:border-indigo-800/80 rounded-xl transition cursor-pointer"
              >
                + {t('ratesDrawer.addCustomRole', 'Add Custom Labor Role')}
              </button>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">{t('ratesDrawer.trenchingEarthwork')}</h3>
            <Field label={t('ratesDrawer.trenchWidth')} value={rates.trenchWidthFt} onChange={update('trenchWidthFt')} disabled={readOnly} />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {t('ratesDrawer.trenchVolumeFormula')}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">{t('ratesDrawer.markupBusinessConstants')}</h3>
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
            <div className="mb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                    {t('ratesDrawer.miscellaneousCosts')}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {t('ratesDrawer.miscTotal')} ${(rates.miscCost ?? 0).toLocaleString()}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleAddMiscItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900 cursor-pointer"
                  >
                    {t('ratesDrawer.addMiscItem')}
                  </button>
                )}
              </div>

              {miscItems.length === 0 ? (
                <div className="p-3 text-center bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-400 dark:text-slate-500">
                  {t('ratesDrawer.noMiscItems')}
                </div>
              ) : (
                <div className="space-y-2">
                  {miscItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <input
                        type="text"
                        placeholder={t('ratesDrawer.miscItemTitlePlaceholder')}
                        value={item.title || ''}
                        disabled={readOnly}
                        onChange={(e) => handleUpdateMiscItem(item.id, 'title', e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                      <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden w-28 shrink-0 focus-within:ring-1 focus-within:ring-indigo-500">
                        <span className="pl-2 text-xs text-slate-400 dark:text-slate-500">$</span>
                        <input
                          type="number"
                          placeholder={t('ratesDrawer.miscItemAmountPlaceholder')}
                          value={item.amount === 0 ? 0 : item.amount || ''}
                          disabled={readOnly}
                          onChange={(e) => handleUpdateMiscItem(item.id, 'amount', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs text-right outline-none bg-transparent text-slate-900 dark:text-slate-100"
                          step="any"
                        />
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMiscItem(item.id)}
                          aria-label="Remove item"
                          className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors cursor-pointer"
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 text-slate-900 dark:text-slate-100">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('ratesDrawer.saveModalTitle')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {t('ratesDrawer.saveModalSubtitle')}
              </p>

              {errorMsg && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-lg">
                  ✕ {errorMsg}
                </div>
              )}

              <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('ratesDrawer.templateName')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('ratesDrawer.templateNamePlaceholder')}
                    value={templateNameInput}
                    onChange={(e) => setTemplateNameInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('ratesDrawer.templateDescription')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('ratesDrawer.templateDescriptionPlaceholder')}
                    value={templateDescInput}
                    onChange={(e) => setTemplateDescInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {saveLoading ? t('ratesDrawer.saving') : t('ratesDrawer.saveTemplate')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Blended Crew Rate Calculator Modal */}
        {showCrewCalculator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👥</span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {t('ratesDrawer.crewCalcTitle', 'Blended Crew Rate Calculator')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('ratesDrawer.crewCalcSubtitle', 'Compose your standard jobsite crew to compute an accurate weighted average billing rate.')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCrewCalculator(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-lg p-1"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                  {t('ratesDrawer.crewHeadcount', 'Crew Headcount by Role')}
                </p>
                {laborRoles.map((role) => {
                  const compItem = crewComposition.find((c) => c.roleId === role.id) || { count: 0 };
                  const countVal = compItem.count ?? 0;

                  return (
                    <div
                      key={role.id}
                      className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{role.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          ${role.hourlyRate}/hr (${role.dailyRate}/day)
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const newCount = Math.max(0, countVal - 1);
                            setCrewComposition((prev) =>
                              prev.some((c) => c.roleId === role.id)
                                ? prev.map((c) => (c.roleId === role.id ? { ...c, count: newCount } : c))
                                : [...prev, { roleId: role.id, title: role.title, hourlyRate: role.hourlyRate, count: newCount }]
                            );
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-center transition cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-sm text-slate-900 dark:text-white">
                          {countVal}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newCount = countVal + 1;
                            setCrewComposition((prev) =>
                              prev.some((c) => c.roleId === role.id)
                                ? prev.map((c) => (c.roleId === role.id ? { ...c, count: newCount } : c))
                                : [...prev, { roleId: role.id, title: role.title, hourlyRate: role.hourlyRate, count: newCount }]
                            );
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-center transition cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Live Composite Calculation Result */}
                <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-indigo-800 dark:text-indigo-300 font-medium">{t('ratesDrawer.totalCrewHeadcount', 'Total Crew Size:')}</span>
                    <span className="font-bold text-indigo-950 dark:text-indigo-100">{blendedResult.totalCrewMembers} {t('ratesDrawer.workers', 'workers')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-indigo-800 dark:text-indigo-300 font-medium">{t('ratesDrawer.totalCrewCostHour', 'Total Crew Cost / Hour:')}</span>
                    <span className="font-bold text-indigo-950 dark:text-indigo-100">${blendedResult.totalCrewCostPerHour.toFixed(2)}/hr</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-indigo-200/60 dark:border-indigo-800/60">
                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{t('ratesDrawer.blendedHourlyRate', 'Blended Hourly Rate:')}</span>
                    <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">${blendedResult.blendedHourlyRate.toFixed(2)}/hr</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCrewCalculator(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleApplyBlendedRate}
                  disabled={blendedResult.blendedHourlyRate <= 0}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {t('ratesDrawer.applyAsBaseRate', 'Apply as Base Labor Rate')}
                </button>
              </div>
            </div>
          </div>
        )}

        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />

        {showScopeModal && (
          <ScopeInclusionsModal
            scopeItems={rates?.scopeItems || DEFAULT_SCOPE_ITEMS}
            readOnly={readOnly}
            onSave={(newScopeItems) => {
              onChange({ ...rates, scopeItems: newScopeItems });
              setSuccessMsg(t('ratesDrawer.scopeSavedSuccess', 'Scope exclusions & inclusions updated.'));
              setTimeout(() => setSuccessMsg(''), 3000);
            }}
            onClose={() => setShowScopeModal(false)}
          />
        )}
      </aside>
    </>
  );
}

function Field({ label, value, onChange, prefix, suffix, disabled = false }) {
  return (
    <label className="block mb-4">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className={`mt-1 flex items-center rounded-md border border-slate-300 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden bg-white dark:bg-slate-800 ${disabled ? 'bg-slate-50 dark:bg-slate-800/50 opacity-80' : ''}`}>
        {prefix && <span className="pl-3 text-slate-400 dark:text-slate-500 text-sm">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm outline-none bg-transparent text-slate-900 dark:text-slate-100 disabled:cursor-not-allowed"
          step="any"
        />
        {suffix && <span className="pr-3 text-slate-400 dark:text-slate-500 text-sm">{suffix}</span>}
      </div>
    </label>
  );
}

function DualModeField({ label, value, onChange, type = 'percent', onTypeChange, disabled = false }) {
  const isPercent = type === 'percent';
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onTypeChange('percent')}
            className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              isPercent
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            } disabled:cursor-not-allowed`}
          >
            %
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onTypeChange('fixed')}
            className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              !isPercent
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            } disabled:cursor-not-allowed`}
          >
            $
          </button>
        </div>
      </div>
      <div className={`flex items-center rounded-md border border-slate-300 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden bg-white dark:bg-slate-800 ${disabled ? 'bg-slate-50 dark:bg-slate-800/50 opacity-80' : ''}`}>
        {!isPercent && <span className="pl-3 text-slate-400 dark:text-slate-500 text-sm">$</span>}
        <input
          type="number"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm outline-none bg-transparent text-slate-900 dark:text-slate-100 disabled:cursor-not-allowed"
          step="any"
        />
        {isPercent && <span className="pr-3 text-slate-400 dark:text-slate-500 text-sm">%</span>}
      </div>
    </div>
  );
}
