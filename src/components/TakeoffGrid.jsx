import { useMemo } from 'react';
import { createBlankItem } from '@/lib/csv';
import { useTranslation } from '@/context/I18nContext';

const DEFAULT_SYSTEMS = ['Sanitary', 'Storm', 'Domestic Water'];
const DEFAULT_UNITS = ['LF', 'EA', 'SF', 'CY', 'SY', 'TON', 'LS', 'HR'];

export default function TakeoffGrid({ items, onChange, readOnly = false }) {
  const { t } = useTranslation();

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

  const textField = (item, field) => (e) => {
    if (readOnly) return;
    updateItem(item.id, field, e.target.value);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <Th>{t('takeoffGrid.system')}</Th>
            <Th>{t('takeoffGrid.description')}</Th>
            <Th>{t('takeoffGrid.sizeSpec')}</Th>
            <Th align="right">{t('takeoffGrid.quantity')}</Th>
            <Th>{t('takeoffGrid.unit')}</Th>
            <Th align="right">{t('takeoffGrid.avgDepth')}</Th>
            <Th align="right">{t('takeoffGrid.materialCostPerUnit')}</Th>
            <Th align="right">{t('takeoffGrid.laborHoursPerUnit')}</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className={`hover:bg-slate-50 ${item.hasMissingScope ? 'bg-amber-50/40' : ''}`}>
              <Td>
                <select
                  value={item.system ?? ''}
                  onChange={textField(item, 'system')}
                  disabled={readOnly}
                  className="w-full bg-transparent outline-none text-slate-700 disabled:opacity-80 disabled:cursor-not-allowed font-medium text-xs"
                >
                  {systemOptions.map((s) => (
                    <option key={s} value={s}>
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
                    className="flex-1 bg-transparent outline-none min-w-[120px] disabled:opacity-80 disabled:cursor-not-allowed"
                  />
                  {item.hasMissingScope && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
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
                  className="w-full bg-transparent outline-none min-w-[120px] disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </Td>
              <Td align="right">
                <input
                  type="number"
                  value={item.quantity ?? ''}
                  onChange={numberField(item, 'quantity')}
                  disabled={readOnly}
                  className={`w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed ${
                    item.quantity < 0 ? 'text-red-600 font-bold' : ''
                  }`}
                />
              </Td>
              <Td>
                <select
                  value={item.unit ?? ''}
                  onChange={textField(item, 'unit')}
                  disabled={readOnly}
                  className="w-full bg-transparent outline-none disabled:opacity-80 disabled:cursor-not-allowed font-mono text-xs"
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
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
                  className="w-16 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed"
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
                  className="w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </Td>
              <Td align="right">
                <input
                  type="number"
                  step="any"
                  value={item.laborHoursPerUnit ?? ''}
                  onChange={numberField(item, 'laborHoursPerUnit')}
                  disabled={readOnly}
                  className="w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </Td>
              <Td>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-slate-400 hover:text-red-600"
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
        <div className="p-3 border-t border-slate-200">
          <button
            type="button"
            onClick={addRow}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
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
    <th className={`px-3 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wide ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }) {
  return <td className={`px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>;
}
