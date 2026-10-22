/**
 * Dynamic takeoff column helpers.
 *
 * The canonical columns are bound to the calculation engine and the document templates, so they are
 * always present. Every other column of an imported sheet is carried through as a passthrough column
 * that the user can rename, retype, delete, or flag for client-facing documents. This module owns the
 * ordered schema shared by the grid, the exporters, and the project save payload.
 */
import type { ColumnDefinition, ColumnType, CustomFieldValues, TakeoffItem } from '@/types/models';

/** Cap on passthrough columns, mirroring the backend's `MAX_CUSTOM_COLUMNS`. */
export const MAX_CUSTOM_COLUMNS = 50;
/** Cap on a column header, mirroring the backend's `MAX_COLUMN_LABEL_LENGTH`. */
export const MAX_COLUMN_LABEL_LENGTH = 120;

/** Narrowest and widest a column may be sized to, in px. */
export const MIN_COLUMN_WIDTH = 64;
export const MAX_COLUMN_WIDTH = 640;

/** Width presets offered from a column's menu, so a truncated column can be read at a glance. */
export const COLUMN_WIDTH_PRESETS: Array<{
  key: 'small' | 'medium' | 'large';
  labelKey: string;
  width: number;
}> = [
  { key: 'small', labelKey: 'product.takeoffGrid.columns.widthSmall', width: 96 },
  { key: 'medium', labelKey: 'product.takeoffGrid.columns.widthMedium', width: 176 },
  { key: 'large', labelKey: 'product.takeoffGrid.columns.widthLarge', width: 320 },
];

/** Every value kind a column may declare, in menu order. */
export const COLUMN_TYPES: ColumnType[] = ['text', 'number', 'currency', 'percent', 'date', 'boolean'];

/** Label resolver, matching the shape of the i18n `t` function. */
export type ColumnLabelResolver = (labelKey: string, fallback: string) => string;

/** A canonical (engine-bound) grid column. */
export interface CanonicalColumnDef {
  /** Canonical field key, matching the parser's target fields (or a client-only helper column). */
  key: string;
  /** i18n key for the header label. */
  labelKey: string;
  /** English fallback label. */
  fallback: string;
  type: ColumnType;
}

/**
 * Canonical columns in display order: the parser's target fields plus the labor-role picker.
 * These always render and can never be deleted, because the calculation engine reads them.
 */
export const CANONICAL_COLUMNS: CanonicalColumnDef[] = [
  { key: 'system', labelKey: 'product.takeoffGrid.system', fallback: 'System', type: 'text' },
  { key: 'item_description', labelKey: 'product.takeoffGrid.description', fallback: 'Description', type: 'text' },
  { key: 'size_spec', labelKey: 'product.takeoffGrid.sizeSpec', fallback: 'Size / Spec', type: 'text' },
  { key: 'quantity', labelKey: 'product.takeoffGrid.quantity', fallback: 'Qty', type: 'number' },
  { key: 'unit', labelKey: 'product.takeoffGrid.unit', fallback: 'Unit', type: 'text' },
  { key: 'avg_depth_ft', labelKey: 'product.takeoffGrid.avgDepth', fallback: 'Avg Depth', type: 'number' },
  { key: 'labor_role', labelKey: 'product.takeoffGrid.laborRoleCol', fallback: 'Labor Role', type: 'text' },
  { key: 'material_cost_per_unit', labelKey: 'product.takeoffGrid.materialCostPerUnit', fallback: 'Material $/Unit', type: 'currency' },
  { key: 'labor', labelKey: 'product.takeoffGrid.laborHoursPerUnit', fallback: 'Labor Hrs/Unit', type: 'number' },
];

const CANONICAL_KEYS = new Set(CANONICAL_COLUMNS.map((column) => column.key));

/** Canonical column key -> the takeoff item property it edits. */
export const CANONICAL_ITEM_FIELDS: Record<string, string> = {
  system: 'system',
  item_description: 'description',
  size_spec: 'sizeSpec',
  quantity: 'quantity',
  unit: 'unit',
  avg_depth_ft: 'avgDepthFt',
  material_cost_per_unit: 'materialCostPerUnit',
  labor_role: 'laborRoleId',
  labor: 'laborHoursPerUnit',
};

/** True when a value is one of the supported column types. */
export function isColumnType(value: unknown): value is ColumnType {
  return COLUMN_TYPES.includes(value as ColumnType);
}

/** True when a column key belongs to the always-present canonical set. */
export function isCanonicalColumn(key: string): boolean {
  return CANONICAL_KEYS.has(key);
}

/**
 * Columns the calculation engine reads, and so the only ones that can never be deleted.
 *
 * `quantity x rate` is the whole estimate, `unit` drives the trench-volume math (`LF` only),
 * `avg_depth_ft` supplies the depth for it, `labor_role` picks the hourly rate, and `system` groups
 * the by-system subtotals. Everything else — including the display-only canonical columns
 * (`item_description`, `size_spec`) and every passthrough column — may be removed.
 */
export const CALCULATION_COLUMNS = [
  'system',
  'quantity',
  'unit',
  'avg_depth_ft',
  'material_cost_per_unit',
  'labor_role',
  'labor',
] as const;

const CALCULATION_KEYS = new Set<string>(CALCULATION_COLUMNS);

/** True when a column is required by the calculation engine. */
export function isCalculationColumn(key: string): boolean {
  return CALCULATION_KEYS.has(key);
}

/** Clamps a px width into the resizeable range. */
export function clampColumnWidth(width: number): number {
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
}

/** A usable px width, or null when the column should keep sizing itself to its content. */
export function normalizeColumnWidth(value: unknown): number | null {
  const width = Number(value);
  if (!Number.isFinite(width) || width <= 0) return null;
  return clampColumnWidth(width);
}

/** True when a value kind holds a numeric figure (so cells render right-aligned and format as numbers). */
export function isNumericColumnType(type: ColumnType): boolean {
  return type === 'number' || type === 'currency' || type === 'percent';
}

/** The canonical columns with their labels resolved for the active language. */
export function canonicalColumnDefinitions(resolveLabel: ColumnLabelResolver): ColumnDefinition[] {
  return CANONICAL_COLUMNS.map((column) => ({
    key: column.key,
    label: resolveLabel(column.labelKey, column.fallback),
    type: column.type,
    field: CANONICAL_ITEM_FIELDS[column.key] ?? null,
    source: 'canonical' as const,
    includeInDocuments: false,
  }));
}

/** Normalises one persisted/incoming passthrough column into a well-formed definition, or null. */
export function normalizeCustomColumn(column: ColumnDefinition | null | undefined): ColumnDefinition | null {
  if (!column || typeof column.key !== 'string' || column.key.trim() === '') return null;
  const key = column.key.trim().slice(0, MAX_COLUMN_LABEL_LENGTH);
  if (isCanonicalColumn(key)) return null;
  const label = String(column.label ?? key).trim().slice(0, MAX_COLUMN_LABEL_LENGTH) || key;
  const width = normalizeColumnWidth(column.width);
  return {
    key,
    label,
    type: isColumnType(column.type) ? column.type : 'text',
    field: null,
    source: column.source === 'imported' ? 'imported' : 'user',
    includeInDocuments: column.includeInDocuments === true,
    // Only a real width is stored, so a column that sizes itself keeps a lean schema entry.
    ...(width === null ? {} : { width }),
  };
}

/**
 * Merges the always-present canonical columns with the passthrough columns of a parse/persisted
 * schema.
 *
 * The incoming schema is authoritative for *order* and for the per-column view state (width and
 * visibility), so a user who moved, resized or hid a column gets that layout back. Canonical entries
 * are rebuilt locally — their labels follow the active language and their types stay engine-bound —
 * while their width/hidden choices travel with the schema. Any canonical column the schema does not
 * mention (a project saved before that column existed) is appended in canonical order, so the
 * engine-bound set is always complete. Duplicate keys are dropped and the passthrough count capped.
 */
export function mergeColumns(
  incoming: ColumnDefinition[] | null | undefined,
  resolveLabel: ColumnLabelResolver,
): ColumnDefinition[] {
  const canonicalByKey = new Map(
    canonicalColumnDefinitions(resolveLabel).map((column) => [column.key, column]),
  );
  const seen = new Set<string>();
  const ordered: ColumnDefinition[] = [];
  let customCount = 0;

  for (const candidate of incoming ?? []) {
    const key = String(candidate?.key ?? '').trim();
    if (!key || seen.has(key)) continue;

    const canonical = canonicalByKey.get(key);
    if (canonical) {
      const width = normalizeColumnWidth(candidate.width);
      seen.add(key);
      ordered.push({
        ...canonical,
        ...(width === null ? {} : { width }),
        ...(candidate.hidden === true ? { hidden: true } : {}),
      });
      continue;
    }

    // A canonical entry the client does not model is already represented and must not become a
    // passthrough column: the backend binds `labor_hours_per_unit` and `labor_unit_cost` separately,
    // while the grid edits both through its single labor column.
    if (candidate.source === 'canonical') continue;

    if (customCount >= MAX_CUSTOM_COLUMNS) continue;
    const column = normalizeCustomColumn(candidate);
    if (!column) continue;
    seen.add(column.key);
    ordered.push(column);
    customCount += 1;
  }

  for (const canonical of canonicalByKey.values()) {
    if (!seen.has(canonical.key)) ordered.push(canonical);
  }

  return ordered;
}

/**
 * A stable `col_<slug>` key for a new/renamed column, guaranteed unique against `existingKeys`.
 * Falls back to a timestamped key when the label has no usable slug.
 */
export function columnKeyFromLabel(label: string, existingKeys: Iterable<string> = []): string {
  const used = new Set(existingKeys);
  const slug = String(label ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const base = slug ? `col_${slug}` : `col_${Date.now().toString(36)}`;
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

/** Passthrough (non-canonical) columns of a schema, in order. */
export function customColumnsOf(columns: ColumnDefinition[] = []): ColumnDefinition[] {
  return columns.filter((column) => column.source !== 'canonical');
}

/** Appends a new user column; returns the same schema when the cap is reached. */
export function addColumn(
  columns: ColumnDefinition[],
  { label, type = 'text', includeInDocuments = false }: { label: string; type?: ColumnType; includeInDocuments?: boolean },
): ColumnDefinition[] {
  if (customColumnsOf(columns).length >= MAX_CUSTOM_COLUMNS) return columns;
  const cleanLabel = String(label ?? '').trim().slice(0, MAX_COLUMN_LABEL_LENGTH);
  if (!cleanLabel) return columns;
  const key = columnKeyFromLabel(cleanLabel, columns.map((column) => column.key));
  return [
    ...columns,
    { key, label: cleanLabel, type, field: null, source: 'user', includeInDocuments },
  ];
}

/**
 * Removes a column from the grid.
 *
 * A calculation-mandatory column is never removable: dropping it would silently change every total.
 * An optional canonical column is *hidden* rather than dropped, because the engine-bound set has to
 * stay complete when the schema is reloaded; its values stay on the rows. A passthrough column is
 * dropped outright (the caller strips its values from the rows at the same time).
 */
export function removeColumn(columns: ColumnDefinition[], key: string): ColumnDefinition[] {
  if (isCalculationColumn(key)) return columns;
  if (isCanonicalColumn(key)) {
    return columns.map((column) => (column.key === key ? { ...column, hidden: true } : column));
  }
  return columns.filter((column) => column.key !== key);
}

/** Brings a hidden column back into the grid view. */
export function restoreColumn(columns: ColumnDefinition[], key: string): ColumnDefinition[] {
  return columns.map((column) => (column.key === key ? { ...column, hidden: false } : column));
}

/**
 * Moves a column one step left or right, stepping over hidden columns so a single click always has a
 * visible effect. Returns the schema unchanged at either end of the grid.
 */
export function moveColumn(columns: ColumnDefinition[], key: string, direction: -1 | 1): ColumnDefinition[] {
  const index = columns.findIndex((column) => column.key === key);
  if (index < 0) return columns;

  let target = index + direction;
  while (target >= 0 && target < columns.length && columns[target].hidden === true) target += direction;
  if (target < 0 || target >= columns.length) return columns;

  const next = [...columns];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

/** Sizes a column in px (clamped). A null width hands the column back to content sizing. */
export function setColumnWidth(
  columns: ColumnDefinition[],
  key: string,
  width: number | null,
): ColumnDefinition[] {
  return columns.map((column) =>
    column.key === key ? { ...column, width: width === null ? null : clampColumnWidth(width) } : column,
  );
}

/** The columns the grid renders, in schema order. */
export function visibleColumns(columns: ColumnDefinition[] = []): ColumnDefinition[] {
  return columns.filter((column) => column.hidden !== true);
}

/** The columns the user removed from the view, which can be brought back. */
export function hiddenColumns(columns: ColumnDefinition[] = []): ColumnDefinition[] {
  return columns.filter((column) => column.hidden === true);
}

/** Renames a column. Canonical labels come from the dictionary, so they are left alone. */
export function renameColumn(columns: ColumnDefinition[], key: string, label: string): ColumnDefinition[] {
  if (isCanonicalColumn(key)) return columns;
  const cleanLabel = String(label ?? '').trim().slice(0, MAX_COLUMN_LABEL_LENGTH);
  if (!cleanLabel) return columns;
  return columns.map((column) => (column.key === key ? { ...column, label: cleanLabel } : column));
}

/** Changes a column's value kind. */
export function setColumnType(columns: ColumnDefinition[], key: string, type: ColumnType): ColumnDefinition[] {
  if (!isColumnType(type) || isCanonicalColumn(key)) return columns;
  return columns.map((column) => (column.key === key ? { ...column, type } : column));
}

/** Flags whether a column also renders in client-facing PDF/Word documents. */
export function setColumnIncludeInDocuments(
  columns: ColumnDefinition[],
  key: string,
  includeInDocuments: boolean,
): ColumnDefinition[] {
  if (isCanonicalColumn(key)) return columns;
  return columns.map((column) => (column.key === key ? { ...column, includeInDocuments } : column));
}

/** Passthrough columns the user asked to surface in client-facing documents. */
export function documentColumns(columns: ColumnDefinition[] = []): ColumnDefinition[] {
  return customColumnsOf(columns).filter((column) => column.includeInDocuments === true);
}

/** Cell shape tests used by {@link inferTypeFromValues}, mirroring the backend's inference. */
const BOOLEAN_CELL_PATTERN = /^(y|yes|n|no|true|false|t|f)$/i;
const PERCENT_CELL_PATTERN = /^-?\d+(?:\.\d+)?\s*%$/;
const NUMERIC_CELL_PATTERN = /^-?[$€£¥]?\s*\d[\d,\s]*(?:\.\d+)?$/;
const CURRENCY_MARKER_PATTERN = /[$€£¥]|\/\s*(?:hr|hrs|hour|hours|lf|ft|ea|each|unit|cy|sf|sy|ton|m|km)\b/i;
const MONEY_CELL_PATTERN =
  /^[$€£¥]\s*-?[\d,]+(?:\.\d+)?|^-?\d[\d,]*\.\d{2}$|\/\s*(hr|hrs|hour|hours|lf|ft|ea|each|unit)\b/i;
const DATE_CELL_PATTERN =
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$|^\d{1,2}-[a-z]{3,}-\d{2,4}$|^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s*\d{2,4}$/i;

/**
 * Infers a column's value kind from sample values, so a newly added column can default to something
 * sensible. Anything ambiguous falls back to `text`.
 */
export function inferTypeFromValues(values: Array<unknown> = []): ColumnType {
  const texts = (values || [])
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
    .map((value) => String(value).trim());
  if (texts.length === 0) return 'text';

  if (texts.every((text) => BOOLEAN_CELL_PATTERN.test(text))) return 'boolean';
  if (texts.every((text) => PERCENT_CELL_PATTERN.test(text))) return 'percent';
  if (texts.every((text) => DATE_CELL_PATTERN.test(text))) return 'date';
  if (texts.every((text) => MONEY_CELL_PATTERN.test(text)) && texts.some((text) => CURRENCY_MARKER_PATTERN.test(text))) {
    return 'currency';
  }
  if (texts.every((text) => NUMERIC_CELL_PATTERN.test(text))) return 'number';
  return 'text';
}

/** Coerces a raw cell string into the storage shape for a column's value kind. */
export function coerceCustomFieldValue(raw: string, type: ColumnType): string | number | boolean | null {
  const text = String(raw ?? '').trim();
  if (text === '') return null;
  if (type === 'boolean') {
    if (/^(y|yes|true|t|1)$/i.test(text)) return true;
    if (/^(n|no|false|f|0)$/i.test(text)) return false;
    return text;
  }
  if (isNumericColumnType(type)) {
    const numeric = Number(text.replace(/[$€£¥,%\s]/g, ''));
    return Number.isNaN(numeric) ? text : numeric;
  }
  return text;
}

/** Reads one passthrough cell of a row. */
export function getCustomFieldValue(item: TakeoffItem, key: string): string | number | boolean | null {
  const fields = item.customFields as CustomFieldValues | undefined;
  const value = fields?.[key];
  return value === undefined ? null : value;
}

/** Writes one passthrough cell of a row, returning a new items array. */
export function setCustomFieldValue(
  items: TakeoffItem[],
  id: string | number | undefined,
  key: string,
  value: string | number | boolean | null,
): TakeoffItem[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    const fields: CustomFieldValues = { ...(item.customFields ?? {}) };
    if (value === null || value === '') {
      delete fields[key];
    } else {
      fields[key] = value;
    }
    return { ...item, customFields: fields };
  });
}

/** Strips a deleted column's values from every row, so no orphaned data is saved. */
export function clearCustomColumnValues(items: TakeoffItem[], key: string): TakeoffItem[] {
  return items.map((item) => {
    const fields = item.customFields as CustomFieldValues | undefined;
    if (!fields || fields[key] === undefined) return item;
    const next: CustomFieldValues = { ...fields };
    delete next[key];
    return { ...item, customFields: next };
  });
}

/** Formats a passthrough value for exports/CSV, null-safe. */
export function formatColumnValue(type: ColumnType, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (type === 'boolean') return value === true || /^(y|yes|true|t|1)$/i.test(String(value)) ? 'Yes' : 'No';
  if (type === 'currency') {
    const numeric = Number(String(value).replace(/[$€£¥,%\s]/g, ''));
    return Number.isNaN(numeric) ? String(value) : numeric.toFixed(2);
  }
  if (type === 'percent') {
    const numeric = Number(String(value).replace(/[%,\s]/g, ''));
    return Number.isNaN(numeric) ? String(value) : `${numeric}%`;
  }
  if (type === 'number') {
    const numeric = Number(String(value).replace(/[,\s]/g, ''));
    return Number.isNaN(numeric) ? String(value) : String(numeric);
  }
  return String(value);
}
