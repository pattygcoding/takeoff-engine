import { createBlankItem } from '@/lib/csv';

const SYSTEMS = ['Sanitary', 'Storm', 'Domestic Water'];
const UNITS = ['LF', 'EA'];

export default function TakeoffGrid({ items, onChange, readOnly = false }) {
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
            <Th>System</Th>
            <Th>Description</Th>
            <Th>Size / Spec</Th>
            <Th align="right">Qty</Th>
            <Th>Unit</Th>
            <Th align="right">Avg Depth (ft)</Th>
            <Th align="right">Material $/Unit</Th>
            <Th align="right">Labor Hrs/Unit</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <Td>
                <select
                  value={item.system}
                  onChange={textField(item, 'system')}
                  disabled={readOnly}
                  className="w-full bg-transparent outline-none text-slate-700 disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  {SYSTEMS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Td>
              <Td>
                <input
                  value={item.description}
                  onChange={textField(item, 'description')}
                  disabled={readOnly}
                  className="w-full bg-transparent outline-none min-w-[120px] disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </Td>
              <Td>
                <input
                  value={item.sizeSpec}
                  onChange={textField(item, 'sizeSpec')}
                  disabled={readOnly}
                  className="w-full bg-transparent outline-none min-w-[120px] disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </Td>
              <Td align="right">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={numberField(item, 'quantity')}
                  disabled={readOnly}
                  className="w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </Td>
              <Td>
                <select
                  value={item.unit}
                  onChange={textField(item, 'unit')}
                  disabled={readOnly}
                  className="w-full bg-transparent outline-none disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Td>
              <Td align="right">
                <input
                  type="number"
                  value={item.avgDepthFt}
                  onChange={numberField(item, 'avgDepthFt')}
                  className="w-16 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed"
                  disabled={readOnly || item.unit !== 'LF'}
                />
              </Td>
              <Td align="right">
                <input
                  type="number"
                  step="any"
                  value={item.materialCostPerUnit}
                  onChange={numberField(item, 'materialCostPerUnit')}
                  disabled={readOnly}
                  className="w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </Td>
              <Td align="right">
                <input
                  type="number"
                  step="any"
                  value={item.laborHoursPerUnit}
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
                    title="Delete row"
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
            + Add Row
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
