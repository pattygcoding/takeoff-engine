import { useMemo, useState } from 'react';
import { createBlankItem } from '@/lib/product/csv';
import { useTranslation } from '@/context/I18nContext';
import {
  getNormalizedLaborRates,
  getItemEffectiveLaborRate,
  calculateEquipmentRentalCost,
  DEFAULT_EQUIPMENT_CATALOG,
} from '@/lib/product/calculations';

const DEFAULT_SYSTEMS = ['Sanitary', 'Storm', 'Domestic Water', 'Equipment & Mobilization'];
const DEFAULT_UNITS = ['LF', 'EA', 'SF', 'CY', 'SY', 'TON', 'LS', 'HR'];

export default function TakeoffGrid({ items, onChange, readOnly = false, rates = {}, onRatesChange }) {
  const { t } = useTranslation();
  const laborInputMode = rates?.laborMode === 'cost' ? 'cost' : 'hours';
  const normalizedLabor = getNormalizedLaborRates(rates);
  const hourlyRate = normalizedLabor.laborHourlyRate;
  const laborRoles = normalizedLabor.laborRoles;

  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [bulkRoleId, setBulkRoleId] = useState('');

  const handleToggleSelectAll = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map((it) => it.id)));
    }
  };

  const handleToggleSelectItem = (id) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItemIds(next);
  };

  const handleApplyBulkLaborRole = () => {
    if (readOnly || selectedItemIds.size === 0) return;
    const updated = items.map((it) => {
      if (selectedItemIds.has(it.id)) {
        return {
          ...it,
          laborRoleId: bulkRoleId === 'base' ? null : bulkRoleId || null,
        };
      }
      return it;
    });
    onChange(updated);
    setSelectedItemIds(new Set());
    setBulkRoleId('');
  };

  const handleSetLaborInputMode = (mode) => {
    if (onRatesChange) {
      onRatesChange({ ...rates, laborMode: mode });
    }
  };

  // Dynamically compute system and unit options from items plus defaults so imported custom trades are always selectable
  const systemOptions = useMemo(() => {
    const set = new Set(DEFAULT_SYSTEMS);
    items.forEach((it) => {
      if (it.system && it.system.trim()) set.add(it.system.trim());
    });
    return Array.from(set);
  }, [items]);

  const unitOptions = useMemo(() => {
    const set = new Set(DEFAULT_UNITS);
    items.forEach((it) => {
      if (it.unit && it.unit.trim()) set.add(it.unit.trim());
    });
    return Array.from(set);
  }, [items]);

  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const equipmentCatalog = Array.isArray(rates?.equipmentCatalog) && rates.equipmentCatalog.length > 0
    ? rates.equipmentCatalog
    : DEFAULT_EQUIPMENT_CATALOG;

  const [selectedCatalogId, setSelectedCatalogId] = useState('mini-excavator');
  const [eqDurationQty, setEqDurationQty] = useState(1);
  const [eqDurationUnit, setEqDurationUnit] = useState('weeks');
  const [eqIncludeDelivery, setEqIncludeDelivery] = useState(true);
  const [eqCustomTitle, setEqCustomTitle] = useState('');
  const [eqCustomDailyRate, setEqCustomDailyRate] = useState(350);
  const [eqCustomWeeklyRate, setEqCustomWeeklyRate] = useState(1200);
  const [eqCustomMonthlyRate, setEqCustomMonthlyRate] = useState(3600);
  const [eqCustomDeliveryFee, setEqCustomDeliveryFee] = useState(250);
  const [eqCustomFuelPct, setEqCustomFuelPct] = useState(5);

  const handleOpenAddEquipmentModal = () => {
    const firstEq = equipmentCatalog[0] || {};
    setSelectedCatalogId(firstEq.id || 'custom');
    setEqCustomTitle(firstEq.title || 'Heavy Machinery Rental');
    setEqCustomDailyRate(firstEq.dailyRate || 350);
    setEqCustomWeeklyRate(firstEq.weeklyRate || 1200);
    setEqCustomMonthlyRate(firstEq.monthlyRate || 3600);
    setEqCustomDeliveryFee(firstEq.deliveryFee || 250);
    setEqCustomFuelPct(firstEq.fuelSurchargePct ?? 5);
    setEqDurationQty(1);
    setEqDurationUnit('weeks');
    setEqIncludeDelivery(true);
    setShowAddEquipmentModal(true);
  };

  const handleCatalogSelectChange = (e) => {
    const val = e.target.value;
    setSelectedCatalogId(val);
    if (val === 'custom') {
      setEqCustomTitle('');
    } else {
      const match = equipmentCatalog.find((eq) => eq.id === val);
      if (match) {
        setEqCustomTitle(match.title);
        setEqCustomDailyRate(match.dailyRate);
        setEqCustomWeeklyRate(match.weeklyRate);
        setEqCustomMonthlyRate(match.monthlyRate);
        setEqCustomDeliveryFee(match.deliveryFee);
        setEqCustomFuelPct(match.fuelSurchargePct ?? 0);
      }
    }
  };

  const handleConfirmAddEquipment = (e) => {
    e.preventDefault();
    if (readOnly) return;

    const previewItem = {
      isEquipment: true,
      equipmentDurationQty: Number(eqDurationQty) || 1,
      equipmentDurationUnit: eqDurationUnit,
      equipmentDailyRate: Number(eqCustomDailyRate) || 0,
      equipmentWeeklyRate: Number(eqCustomWeeklyRate) || 0,
      equipmentMonthlyRate: Number(eqCustomMonthlyRate) || 0,
      equipmentDeliveryFee: Number(eqCustomDeliveryFee) || 0,
      equipmentFuelSurchargePct: Number(eqCustomFuelPct) || 0,
      includeDelivery: eqIncludeDelivery,
    };
    const costDetails = calculateEquipmentRentalCost(previewItem);

    const newEquipmentItem = {
      id: `eq-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      system: 'Equipment & Mobilization',
      description: eqCustomTitle || t('takeoffGrid.equipmentItemFallback', 'Machinery Rental'),
      sizeSpec: `${eqDurationQty} ${eqDurationUnit} rental${eqIncludeDelivery ? ' + Delivery' : ''}`,
      quantity: Number(eqDurationQty) || 1,
      unit: eqDurationUnit === 'days' ? 'DAY' : eqDurationUnit === 'months' ? 'MO' : 'WK',
      avgDepthFt: '',
      materialCostPerUnit: 0,
      laborHoursPerUnit: 0,
      laborUnitCost: 0,
      laborRoleId: null,
      isEquipment: true,
      equipmentDurationQty: Number(eqDurationQty) || 1,
      equipmentDurationUnit: eqDurationUnit,
      equipmentDailyRate: Number(eqCustomDailyRate) || 0,
      equipmentWeeklyRate: Number(eqCustomWeeklyRate) || 0,
      equipmentMonthlyRate: Number(eqCustomMonthlyRate) || 0,
      equipmentDeliveryFee: Number(eqCustomDeliveryFee) || 0,
      equipmentFuelSurchargePct: Number(eqCustomFuelPct) || 0,
      includeDelivery: eqIncludeDelivery,
      equipmentCost: costDetails.totalCost,
    };

    onChange([...items, newEquipmentItem]);
    setShowAddEquipmentModal(false);
  };

  const updateItem = (id, field, value) => {
    if (readOnly) return;
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const removeItem = (id) => {
    if (readOnly) return;
    onChange(items.filter((it) => it.id !== id));
  };

  const addRow = () => {
    if (readOnly) return;
    onChange([...items, createBlankItem()]);
  };

  const numberField = (item, field) => (e) => {
    if (readOnly) return;
    const v = e.target.value;
    updateItem(item.id, field, v === '' ? '' : Number(v));
  };

  const laborCostField = (item) => (e) => {
    if (readOnly) return;
    const v = e.target.value;
    if (v === '') {
      onChange(items.map((it) => (it.id === item.id ? { ...it, laborHoursPerUnit: '', laborUnitCost: '' } : it)));
      return;
    }
    const cost = Number(v);
    const hrs = hourlyRate > 0 ? Math.round((cost / hourlyRate) * 100) / 100 : (item.laborHoursPerUnit || 0);
    onChange(items.map((it) => (it.id === item.id ? { ...it, laborHoursPerUnit: hrs, laborUnitCost: cost } : it)));
  };

  const textField = (item, field) => (e) => {
    if (readOnly) return;
    updateItem(item.id, field, e.target.value);
  };

  return (
    <div className="space-y-3">
      {/* Bulk Labor Role Action Toolbar */}
      {!readOnly && items.length > 0 && selectedItemIds.size > 0 && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {t('takeoffGrid.selectedItemsCount', { count: selectedItemIds.size }, `${selectedItemIds.size} items selected`)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkRoleId}
              onChange={(e) => setBulkRoleId(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">{t('takeoffGrid.chooseLaborRole', 'Choose Labor Role...')}</option>
              <option value="base">{t('takeoffGrid.projectBaseRate', 'Project Base Rate')}</option>
              {laborRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.title} (${role.hourlyRate}/hr)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplyBulkLaborRole}
              disabled={!bulkRoleId}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              {t('takeoffGrid.applyRoleBtn', 'Apply Role')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
            <tr>
              {!readOnly && (
                <th className="px-3 py-2 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedItemIds.size === items.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    title={t('takeoffGrid.selectAll', 'Select all line items')}
                  />
                </th>
              )}
              <Th>{t('takeoffGrid.system')}</Th>
              <Th>{t('takeoffGrid.description')}</Th>
              <Th>{t('takeoffGrid.sizeSpec')}</Th>
              <Th align="right">{t('takeoffGrid.quantity')}</Th>
              <Th>{t('takeoffGrid.unit')}</Th>
              <Th align="right">{t('takeoffGrid.avgDepth')}</Th>
              <Th>{t('takeoffGrid.laborRoleCol', 'Labor Role')}</Th>
              <Th align="right">{t('takeoffGrid.materialCostPerUnit')}</Th>
              <Th align="right">
                <div className="flex items-center justify-end gap-1.5">
                  <span>{laborInputMode === 'hours' ? t('takeoffGrid.laborHoursPerUnit') : t('takeoffGrid.laborUnitCost')}</span>
                  <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleSetLaborInputMode('hours')}
                      className={`px-1.5 py-0.2 rounded font-semibold transition-colors cursor-pointer ${
                        laborInputMode === 'hours'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                      title={t('takeoffGrid.laborHoursPerUnit')}
                    >
                      hrs
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetLaborInputMode('cost')}
                      className={`px-1.5 py-0.2 rounded font-semibold transition-colors cursor-pointer ${
                        laborInputMode === 'cost'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                      title={t('takeoffGrid.laborUnitCost')}
                    >
                      $
                    </button>
                  </div>
                </div>
              </Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {items.map((item) => {
              const itemEffectiveRate = getItemEffectiveLaborRate(item, rates);
              const itemHourlyRate = itemEffectiveRate.hourlyRate;

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    item.isEquipment
                      ? 'bg-amber-50/50 dark:bg-amber-950/25 border-l-4 border-l-amber-500'
                      : item.hasMissingScope
                      ? 'bg-amber-50/40 dark:bg-amber-950/20'
                      : ''
                  } ${selectedItemIds.has(item.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''}`}
                >
                  {!readOnly && (
                    <td className="px-3 py-2 text-center w-8">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.id)}
                        onChange={() => handleToggleSelectItem(item.id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                  )}
                  <Td>
                    <select
                      value={item.system ?? ''}
                      onChange={textField(item, 'system')}
                      disabled={readOnly}
                      className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-300 disabled:opacity-80 disabled:cursor-not-allowed font-medium text-xs"
                    >
                      {systemOptions.map((s) => (
                        <option key={s} value={s} className="dark:bg-slate-900 dark:text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.isEquipment && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          🚜 {t('takeoffGrid.equipmentBadge', 'Equipment Rental')}
                        </span>
                      )}
                      <input
                        value={item.description ?? ''}
                        onChange={textField(item, 'description')}
                        disabled={readOnly}
                        className="flex-1 bg-transparent outline-none min-w-[120px] disabled:opacity-80 disabled:cursor-not-allowed dark:text-white font-medium"
                      />
                      {item.hasMissingScope && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                          title={t('takeoffGrid.missingScopeTooltip', 'Scope requires field verification / pricing review')}
                        >
                          ⚠️ {item.missingScopeReason || t('takeoffGrid.missingScopeBadge', 'Missing Scope')}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <input
                      value={item.sizeSpec ?? ''}
                      onChange={textField(item, 'sizeSpec')}
                      disabled={readOnly}
                      className="w-full bg-transparent outline-none min-w-[120px] disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
                    />
                  </Td>
                  <Td align="right">
                    <input
                      type="number"
                      value={item.quantity ?? ''}
                      onChange={numberField(item, 'quantity')}
                      disabled={readOnly}
                      className={`w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed dark:text-white ${
                        item.quantity < 0 ? 'text-red-600 dark:text-red-400 font-bold' : ''
                      }`}
                    />
                  </Td>
                  <Td>
                    <select
                      value={item.unit ?? ''}
                      onChange={textField(item, 'unit')}
                      disabled={readOnly}
                      className="w-full bg-transparent outline-none disabled:opacity-80 disabled:cursor-not-allowed font-mono text-xs dark:text-white"
                    >
                      {unitOptions.map((u) => (
                        <option key={u} value={u} className="dark:bg-slate-900 dark:text-white">
                          {u}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td align="right">
                    <input
                      type="number"
                      value={item.avgDepthFt ?? ''}
                      onChange={numberField(item, 'avgDepthFt')}
                      className="w-16 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
                      disabled={readOnly || item.unit !== 'LF' || item.isEquipment}
                    />
                  </Td>
                  <Td>
                    {item.isEquipment ? (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                        {t('takeoffGrid.equipmentNoLabor', 'N/A (Machinery)')}
                      </span>
                    ) : (
                      <select
                        value={item.laborRoleId || ''}
                        onChange={(e) => updateItem(item.id, 'laborRoleId', e.target.value || null)}
                        disabled={readOnly}
                        className="w-full bg-transparent outline-none text-xs text-slate-700 dark:text-slate-300 font-medium disabled:opacity-80 disabled:cursor-not-allowed"
                        title={t('takeoffGrid.assignedLaborRoleTooltip', { role: itemEffectiveRate.roleTitle, rate: itemHourlyRate })}
                      >
                        <option value="" className="dark:bg-slate-900 dark:text-white">
                          {t('takeoffGrid.defaultRoleOption', `Default ($${hourlyRate}/hr)`)}
                        </option>
                        {laborRoles.map((role) => (
                          <option key={role.id} value={role.id} className="dark:bg-slate-900 dark:text-white">
                            {role.title} (${role.hourlyRate}/hr)
                          </option>
                        ))}
                      </select>
                    )}
                  </Td>
                  <Td align="right">
                    {item.isEquipment ? (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        ${(Number(item.equipmentCost) || 0).toLocaleString()}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        value={item.materialCostPerUnit ?? ''}
                        onChange={numberField(item, 'materialCostPerUnit')}
                        disabled={readOnly}
                        className="w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
                      />
                    )}
                  </Td>
                  <Td align="right">
                    {item.isEquipment ? (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                        {t('takeoffGrid.equipmentIncludedFee', 'Rental/Delivery')}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        value={
                          laborInputMode === 'hours'
                            ? (item.laborHoursPerUnit ?? '')
                            : (item.laborUnitCost ?? (item.laborHoursPerUnit !== undefined && item.laborHoursPerUnit !== '' ? Math.round((item.laborHoursPerUnit * itemHourlyRate) * 100) / 100 : ''))
                        }
                        onChange={laborInputMode === 'hours' ? numberField(item, 'laborHoursPerUnit') : laborCostField(item)}
                        disabled={readOnly}
                        className="w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
                      />
                    )}
                  </Td>
                  <Td>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                        title={t('takeoffGrid.deleteRow')}
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!readOnly && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addRow}
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
              >
                + {t('takeoffGrid.addRow')}
              </button>
              <button
                type="button"
                onClick={handleOpenAddEquipmentModal}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg transition cursor-pointer"
              >
                🚜 {t('takeoffGrid.addEquipmentRental', '+ Add Equipment Rental')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Equipment Rental Modal */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚜</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('takeoffGrid.addEquipmentTitle', 'Add Equipment / Machinery Rental')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('takeoffGrid.addEquipmentSubtitle', 'Select machinery type, rental duration, and delivery options.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEquipmentModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAddEquipment} className="py-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('takeoffGrid.equipmentType', 'Equipment / Machine Type')}
                </label>
                <select
                  value={selectedCatalogId}
                  onChange={handleCatalogSelectChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {equipmentCatalog.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.title} (${eq.weeklyRate}/wk)
                    </option>
                  ))}
                  <option value="custom">-- {t('takeoffGrid.customMachine', 'Custom Machine / Tool')} --</option>
                </select>
              </div>

              {selectedCatalogId === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('takeoffGrid.customMachineTitle', 'Equipment Description')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50-Ton Crane, Hydro-Vac Truck"
                    value={eqCustomTitle}
                    onChange={(e) => setEqCustomTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('takeoffGrid.durationQty', 'Duration Qty')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={eqDurationQty}
                    onChange={(e) => setEqDurationQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('takeoffGrid.durationUnit', 'Duration Unit')}
                  </label>
                  <select
                    value={eqDurationUnit}
                    onChange={(e) => setEqDurationUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="days">{t('takeoffGrid.daysUnit', 'Days')}</option>
                    <option value="weeks">{t('takeoffGrid.weeksUnit', 'Weeks')}</option>
                    <option value="months">{t('takeoffGrid.monthsUnit', 'Months')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                    {t('takeoffGrid.dayRate', 'Day Rate')}
                  </label>
                  <div className="flex items-center px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className="text-slate-400 text-xs mr-1">$</span>
                    <input
                      type="number"
                      step="any"
                      value={eqCustomDailyRate}
                      onChange={(e) => setEqCustomDailyRate(e.target.value)}
                      className="w-full bg-transparent outline-none text-xs text-right"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                    {t('takeoffGrid.weekRate', 'Week Rate')}
                  </label>
                  <div className="flex items-center px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className="text-slate-400 text-xs mr-1">$</span>
                    <input
                      type="number"
                      step="any"
                      value={eqCustomWeeklyRate}
                      onChange={(e) => setEqCustomWeeklyRate(e.target.value)}
                      className="w-full bg-transparent outline-none text-xs text-right"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                    {t('takeoffGrid.monthRate', 'Month Rate')}
                  </label>
                  <div className="flex items-center px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className="text-slate-400 text-xs mr-1">$</span>
                    <input
                      type="number"
                      step="any"
                      value={eqCustomMonthlyRate}
                      onChange={(e) => setEqCustomMonthlyRate(e.target.value)}
                      className="w-full bg-transparent outline-none text-xs text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={eqIncludeDelivery}
                    onChange={(e) => setEqIncludeDelivery(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500"
                  />
                  <span>{t('takeoffGrid.includeDelivery', 'Include Delivery & Mobilization')}</span>
                </label>
                <div className="flex items-center text-xs">
                  <span className="text-slate-400 mr-1">$</span>
                  <input
                    type="number"
                    step="any"
                    disabled={!eqIncludeDelivery}
                    value={eqCustomDeliveryFee}
                    onChange={(e) => setEqCustomDeliveryFee(e.target.value)}
                    className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Cost Calculation Preview Pill */}
              {(() => {
                const preview = calculateEquipmentRentalCost({
                  equipmentDurationQty: Number(eqDurationQty) || 1,
                  equipmentDurationUnit: eqDurationUnit,
                  equipmentDailyRate: Number(eqCustomDailyRate) || 0,
                  equipmentWeeklyRate: Number(eqCustomWeeklyRate) || 0,
                  equipmentMonthlyRate: Number(eqCustomMonthlyRate) || 0,
                  equipmentDeliveryFee: Number(eqCustomDeliveryFee) || 0,
                  equipmentFuelSurchargePct: Number(eqCustomFuelPct) || 0,
                  includeDelivery: eqIncludeDelivery,
                });
                return (
                  <div className="p-3 bg-amber-50/80 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                        {t('takeoffGrid.totalEquipmentCost', 'Calculated Equipment Total:')}
                      </span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400">
                        {preview.durationQty} {preview.durationUnit} @ {preview.baseRentalCost > 0 ? `$${preview.baseRentalCost.toLocaleString()}` : '$0'}
                        {preview.deliveryFee > 0 ? ` + $${preview.deliveryFee} del` : ''}
                      </span>
                    </div>
                    <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                      ${preview.totalCost.toLocaleString()}
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEquipmentModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs cursor-pointer transition"
                >
                  {t('takeoffGrid.confirmAddEquipment', 'Add Equipment Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th className={`px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }) {
  return <td className={`px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>;
}
