import { useMemo, useState } from 'react';
import { createBlankItem } from '@/lib/product/csv';
import { useTranslation } from '@/context/I18nContext';
import { getNormalizedLaborRates } from '@/lib/product/calculations';

const DEFAULT_SYSTEMS = ['Sanitary', 'Storm', 'Domestic Water'];
const DEFAULT_UNITS = ['LF', 'EA', 'SF', 'CY', 'SY', 'TON', 'LS', 'HR'];

export default function TakeoffGrid({ items, onChange, readOnly = false, rates = {}, onRatesChange }) {
  const { t } = useTranslation();
  const laborInputMode = rates?.laborMode === 'cost' ? 'cost' : 'hours';
  const normalizedLabor = getNormalizedLaborRates(rates);
  const hourlyRate = normalizedLabor.laborHourlyRate;

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
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <Th>{t('takeoffGrid.system')}</Th>
            <Th>{t('takeoffGrid.description')}</Th>
            <Th>{t('takeoffGrid.sizeSpec')}</Th>
            <Th align="right">{t('takeoffGrid.quantity')}</Th>
            <Th>{t('takeoffGrid.unit')}</Th>
            <Th align="right">{t('takeoffGrid.avgDepth')}</Th>
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
          {items.map((item) => (
            <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${item.hasMissingScope ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}>
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
                  <input
                    value={item.description ?? ''}
                    onChange={textField(item, 'description')}
                    disabled={readOnly}
                    className="flex-1 bg-transparent outline-none min-w-[120px] disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
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
                  disabled={readOnly || item.unit !== 'LF'}
                />
              </Td>
              <Td align="right">
                <input
                  type="number"
                  step="any"
                  value={item.materialCostPerUnit ?? ''}
                  onChange={numberField(item, 'materialCostPerUnit')}
                  disabled={readOnly}
                  className="w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
                />
              </Td>
              <Td align="right">
                <input
                  type="number"
                  step="any"
                  value={
                    laborInputMode === 'hours'
                      ? (item.laborHoursPerUnit ?? '')
                      : (item.laborUnitCost ?? (item.laborHoursPerUnit !== undefined && item.laborHoursPerUnit !== '' ? Math.round((item.laborHoursPerUnit * hourlyRate) * 100) / 100 : ''))
                  }
                  onChange={laborInputMode === 'hours' ? numberField(item, 'laborHoursPerUnit') : laborCostField(item)}
                  disabled={readOnly}
                  className="w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
                />
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
          ))}
        </tbody>
      </table>

      {!readOnly && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={addRow}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
          >
            + {t('takeoffGrid.addRow')}
          </button>
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
