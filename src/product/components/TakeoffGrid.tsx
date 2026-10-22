import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ChangeEvent, FormEvent, MouseEvent, PointerEvent, ReactNode } from 'react';
import { Truck, AlertTriangle, X, Plus, Trash2, ChevronDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { createBlankItem } from '@/product/lib/csv';
import {
  COLUMN_TYPES,
  COLUMN_WIDTH_PRESETS,
  MAX_CUSTOM_COLUMNS,
  addColumn,
  clampColumnWidth,
  clearCustomColumnValues,
  coerceCustomFieldValue,
  customColumnsOf,
  getCustomFieldValue,
  hiddenColumns,
  isCalculationColumn,
  isCanonicalColumn,
  isNumericColumnType,
  mergeColumns,
  moveColumn,
  removeColumn,
  renameColumn,
  restoreColumn,
  setColumnIncludeInDocuments,
  setColumnType,
  setColumnWidth,
  setCustomFieldValue,
  visibleColumns,
} from '@/product/lib/takeoffColumns';
import { newId } from '@/core/lib/shared/ids';
import { toNumberOr } from '@/core/lib/shared/coerce';
import { useTranslation } from '@/core/components/context/I18nContext';
import { calculationsApi, formatCurrency } from '@/product/lib/calculations';
import {
  DEFAULT_EQUIPMENT_CATALOG,
  DEFAULT_LABOR_ROLES,
} from '@/product/constants/calculations.constants';
import type {
  ColumnDefinition,
  ColumnType,
  EquipmentCatalogItem,
  LaborRole,
  Rates,
  TakeoffItem,
} from '@/types/models';

const DEFAULT_SYSTEMS = ['Sanitary', 'Storm', 'Domestic Water', 'Equipment & Mobilization'];
const DEFAULT_UNITS = ['LF', 'EA', 'SF', 'CY', 'SY', 'TON', 'LS', 'HR'];
/** Width a drag-resize starts from when the column has no width and the header cannot be measured. */
const FALLBACK_COLUMN_WIDTH = 160;

/** Viewport box of the header button an open column menu hangs off. */
interface ColumnMenuAnchor {
  key: string;
  top: number;
  bottom: number;
  left: number;
}

/** Width budget of the column menu, and how tall it may grow before it scrolls. */
const COLUMN_MENU_WIDTH = 224;
const COLUMN_MENU_MAX_HEIGHT = 360;

/**
 * Fixed-position style for the column menu.
 *
 * The grid scrolls horizontally, so a menu positioned inside a header cell is clipped by that scroll
 * container. The menu is portalled to the body instead, then flipped up (and pulled left) as needed
 * so it always lands inside the viewport.
 */
function columnMenuStyle(anchor: ColumnMenuAnchor) {
  const gap = 6;
  const viewportWidth = window.innerWidth || COLUMN_MENU_WIDTH + gap * 2;
  const viewportHeight = window.innerHeight || COLUMN_MENU_MAX_HEIGHT + gap * 2;
  const spaceBelow = viewportHeight - anchor.bottom - gap;
  const openUpwards = spaceBelow < COLUMN_MENU_MAX_HEIGHT && anchor.top > spaceBelow;

  return {
    left: Math.max(gap, Math.min(anchor.left, viewportWidth - COLUMN_MENU_WIDTH - gap)),
    width: COLUMN_MENU_WIDTH,
    maxHeight: Math.max(120, Math.min(COLUMN_MENU_MAX_HEIGHT, openUpwards ? anchor.top - gap : spaceBelow)),
    ...(openUpwards ? { bottom: viewportHeight - anchor.top + gap } : { top: anchor.bottom + gap }),
  };
}

/** Equipment is filed under the scope it belongs to, or the shared mobilization bucket. */
function equipmentSystem(associatedScope: string): string {
  return associatedScope && associatedScope !== 'General / Project-Wide' ? associatedScope : 'Equipment & Mobilization';
}

/** The billing unit for an equipment rental duration. */
function equipmentUnit(durationUnit: string): string {
  if (durationUnit === 'days') return 'DAY';
  if (durationUnit === 'months') return 'MO';
  return 'WK';
}

/** Identifier of a takeoff row (optional on imported items). */
type ItemId = string | number | undefined;

/** Row tint: equipment rows, missing-scope rows, and selected rows each get their own highlight. */
function takeoffRowClass(item: TakeoffItem, isSelected: boolean): string {
  let tint = '';
  if (item.isEquipment) tint = 'bg-amber-50/50 dark:bg-amber-950/25 border-l-4 border-l-amber-500';
  else if (item.hasMissingScope) tint = 'bg-amber-50/40 dark:bg-amber-950/20';
  const selected = isSelected ? 'bg-blue-50/40 dark:bg-blue-950/30' : '';
  return `hover:bg-slate-50 dark:hover:bg-slate-800/50 ${tint} ${selected}`;
}

/** Negative quantities are called out in red. */
function quantityInputClass(item: TakeoffItem): string {
  const invalid = Number(item.quantity) < 0 ? 'text-red-600 dark:text-red-400 font-bold' : '';
  return `w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed dark:text-white ${invalid}`;
}

/**
 * The labour cell value: raw hours in `hours` mode, otherwise the derived cost (the stored unit
 * cost when the row already has one, else hours × rate).
 */
function laborCellValue(item: TakeoffItem, laborInputMode: string, hourlyRate: string | number): string | number {
  if (laborInputMode === 'hours') return item.laborHoursPerUnit ?? '';
  if (item.laborUnitCost !== undefined) return item.laborUnitCost;
  const hours = item.laborHoursPerUnit;
  if (hours === undefined || hours === '') return '';
  return Math.round(Number(hours) * Number(hourlyRate) * 100) / 100;
}

/** The onChange handler for the labour cell, matching the active input mode. */
function laborCellHandler(
  item: TakeoffItem,
  laborInputMode: string,
  numberField: (item: TakeoffItem, field: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void,
  laborCostField: (item: TakeoffItem) => (e: ChangeEvent<HTMLInputElement>) => void,
): (e: ChangeEvent<HTMLInputElement>) => void {
  return laborInputMode === 'hours' ? numberField(item, 'laborHoursPerUnit') : laborCostField(item);
}

export default function TakeoffGrid({
  items,
  onChange,
  readOnly = false,
  rates = {},
  onRatesChange,
  columns = [],
  onColumnsChange,
}: Readonly<{
  items: TakeoffItem[];
  onChange: (items: TakeoffItem[]) => void;
  readOnly?: boolean;
  rates?: Rates;
  onRatesChange?: (rates: Rates) => void;
  /** Ordered column schema (canonical + passthrough columns). */
  columns?: ColumnDefinition[];
  /** Applies a column schema change (add/rename/retype/delete/flag) from the header menus. */
  onColumnsChange?: (columns: ColumnDefinition[]) => void;
}>) {
  const { t } = useTranslation();
  const laborInputMode = rates?.laborMode === 'cost' ? 'cost' : 'hours';
  const hourlyRate = Number(rates?.laborHourlyRate) || 65.0;
  const laborRoles: LaborRole[] =
    Array.isArray(rates?.laborRoles) && rates.laborRoles.length > 0 ? rates.laborRoles : DEFAULT_LABOR_ROLES;

  /** Canonical labels come from the dictionary, so they are resolved here rather than persisted. */
  const resolveColumnLabel = useCallback(
    (labelKey: string, fallback: string) => t(labelKey, fallback),
    [t],
  );
  // The schema owns the column order, widths and visibility; the canonical columns themselves are
  // rebuilt locally so their labels follow the active language and their types stay engine-bound.
  const orderedColumns = useMemo(() => mergeColumns(columns, resolveColumnLabel), [columns, resolveColumnLabel]);
  const shownColumns = useMemo(() => visibleColumns(orderedColumns), [orderedColumns]);
  const hiddenColumnList = useMemo(() => hiddenColumns(orderedColumns), [orderedColumns]);
  const customColumns = useMemo(() => customColumnsOf(orderedColumns), [orderedColumns]);
  /** In-flight drag-resize: the width previews live and is committed on release. */
  const [resizingColumn, setResizingColumn] = useState<{
    key: string;
    startX: number;
    startWidth: number;
    preview: number;
  } | null>(null);
  /** The open column menu, together with the header button it is anchored to. */
  const [openColumnMenu, setOpenColumnMenu] = useState<ColumnMenuAnchor | null>(null);

  // The menu is portalled onto the body, so it has to close itself when the page moves out from
  // under it (a scroll, a resize, a click elsewhere, or Escape).
  useEffect(() => {
    if (!openColumnMenu) return;

    const closeOnOutsidePointerDown = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-column-menu]')) return;
      setOpenColumnMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenColumnMenu(null);
    };
    const closeOnViewportMove = () => setOpenColumnMenu(null);

    document.addEventListener('pointerdown', closeOnOutsidePointerDown);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnViewportMove, true);
    window.addEventListener('resize', closeOnViewportMove);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnViewportMove, true);
      window.removeEventListener('resize', closeOnViewportMove);
    };
  }, [openColumnMenu]);
  // Column add/rename runs through a small inline editor so the grid stays usable without the
  // global modal host (which is not mounted in unit tests).
  const [columnEditor, setColumnEditor] = useState<{ key: string | null; label: string } | null>(null);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<ItemId>>(new Set());
  const [bulkRoleId, setBulkRoleId] = useState('');

  const handleToggleSelectAll = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map((it) => it.id)));
    }
  };

  const handleToggleSelectItem = (id: ItemId) => {
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

  const handleSetLaborInputMode = (mode: string) => {
    if (onRatesChange) {
      onRatesChange({ ...rates, laborMode: mode });
    }
  };

  // Dynamically compute system and unit options from items plus defaults so imported custom trades are always selectable
  const systemOptions = useMemo(() => {
    const set = new Set(DEFAULT_SYSTEMS);
    items.forEach((it) => {
      if (it.system?.trim()) set.add(it.system.trim());
    });
    return Array.from(set);
  }, [items]);

  const unitOptions = useMemo(() => {
    const set = new Set(DEFAULT_UNITS);
    items.forEach((it) => {
      if (it.unit?.trim()) set.add(it.unit.trim());
    });
    return Array.from(set);
  }, [items]);

  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const equipmentCatalog: EquipmentCatalogItem[] =
    Array.isArray(rates?.equipmentCatalog) && rates.equipmentCatalog.length > 0
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
  const [eqAssociatedScope, setEqAssociatedScope] = useState('General / Project-Wide');
  const [eqOwnership, setEqOwnership] = useState('rented');
  const [eqOperatorIncluded, setEqOperatorIncluded] = useState(false);
  const [eqDamageWaiverPct, setEqDamageWaiverPct] = useState(10);
  const [eqMinimumRentalDays, setEqMinimumRentalDays] = useState(1);
  const [eqStandbyDays, setEqStandbyDays] = useState(0);
  const [eqStandbyRatePct, setEqStandbyRatePct] = useState(50);
  const [eqProductionRate, setEqProductionRate] = useState('');
  const [eqContingencyDays, setEqContingencyDays] = useState(0);

  // The equipment form is priced by the SAME backend engine step 3 uses, so the preview shown here
  // can never disagree with the results page (damage waiver, standby, operator, and minimum rental
  // days are all included — unlike the naive duration x rate + delivery + fuel shortcut).
  const equipmentPreviewItem = useMemo(
    () => ({
      isEquipment: true,
      equipmentDurationQty: Number(eqDurationQty) || 1,
      equipmentDurationUnit: eqDurationUnit,
      equipmentDailyRate: Number(eqCustomDailyRate) || 0,
      equipmentWeeklyRate: Number(eqCustomWeeklyRate) || 0,
      equipmentMonthlyRate: Number(eqCustomMonthlyRate) || 0,
      equipmentDeliveryFee: Number(eqCustomDeliveryFee) || 0,
      equipmentFuelSurchargePct: Number(eqCustomFuelPct) || 0,
      equipmentDamageWaiverPct: Number(eqDamageWaiverPct) || 0,
      equipmentMinimumRentalDays: Number(eqMinimumRentalDays) || 1,
      equipmentStandbyDays: Number(eqStandbyDays) || 0,
      equipmentStandbyRatePct: Number(eqStandbyRatePct) || 50,
      equipmentOwnership: eqOwnership,
      equipmentOperatorIncluded: eqOperatorIncluded,
      equipmentOperatorRoleId: 'operator',
      includeDelivery: eqIncludeDelivery,
      associatedScope: eqAssociatedScope,
    }),
    [
      eqDurationQty, eqDurationUnit, eqCustomDailyRate, eqCustomWeeklyRate, eqCustomMonthlyRate,
      eqCustomDeliveryFee, eqCustomFuelPct, eqDamageWaiverPct, eqMinimumRentalDays, eqStandbyDays,
      eqStandbyRatePct, eqOwnership, eqOperatorIncluded, eqIncludeDelivery, eqAssociatedScope,
    ],
  );
  const [equipmentPreviewCost, setEquipmentPreviewCost] = useState<number | null>(null);

  useEffect(() => {
    if (!showAddEquipmentModal) {
      setEquipmentPreviewCost(null);
      return undefined;
    }
    let active = true;
    setEquipmentPreviewCost(null);
    calculationsApi
      .computeItemCost(equipmentPreviewItem, rates)
      .then((res: { directCost?: number } | null) => {
        if (active) setEquipmentPreviewCost(Number(res?.directCost) || 0);
      })
      .catch(() => {
        if (active) setEquipmentPreviewCost(null);
      });
    return () => {
      active = false;
    };
  }, [showAddEquipmentModal, equipmentPreviewItem, rates]);

  const handleOpenAddEquipmentModal = () => {
    const firstEq = equipmentCatalog[0] || {};
    setSelectedCatalogId(firstEq.id || 'custom');
    setEqCustomTitle(firstEq.title || 'Heavy Machinery Rental');
    setEqCustomDailyRate(Number(firstEq.dailyRate || 350));
    setEqCustomWeeklyRate(Number(firstEq.weeklyRate || 1200));
    setEqCustomMonthlyRate(Number(firstEq.monthlyRate || 3600));
    setEqCustomDeliveryFee(Number(firstEq.deliveryFee || 250));
    setEqCustomFuelPct(Number(firstEq.fuelSurchargePct ?? 5));
    setEqAssociatedScope('General / Project-Wide');
    setEqOwnership(firstEq.equipmentOwnership || 'rented');
    setEqOperatorIncluded(Boolean(firstEq.defaultOperatorIncluded));
    setEqDamageWaiverPct(Number(firstEq.damageWaiverPct ?? 10));
    setEqMinimumRentalDays(Number(firstEq.minimumRentalDays ?? 1));
    setEqStandbyDays(0);
    setEqStandbyRatePct(Number(firstEq.standbyRatePct ?? 50));
    setEqProductionRate('');
    setEqContingencyDays(0);
    setEqDurationQty(1);
    setEqDurationUnit('weeks');
    setEqIncludeDelivery(true);
    setShowAddEquipmentModal(true);
  };

  const handleCatalogSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCatalogId(val);
    if (val === 'custom') {
      setEqCustomTitle('');
    } else {
      const match = equipmentCatalog.find((eq) => eq.id === val);
      if (match) {
        setEqCustomTitle(match.title || '');
        setEqCustomDailyRate(Number(match.dailyRate));
        setEqCustomWeeklyRate(Number(match.weeklyRate));
        setEqCustomMonthlyRate(Number(match.monthlyRate));
        setEqCustomDeliveryFee(Number(match.deliveryFee));
        setEqCustomFuelPct(Number(match.fuelSurchargePct ?? 0));
        setEqOwnership(match.equipmentOwnership || 'rented');
        setEqOperatorIncluded(Boolean(match.defaultOperatorIncluded));
        setEqDamageWaiverPct(Number(match.damageWaiverPct ?? 10));
        setEqMinimumRentalDays(Number(match.minimumRentalDays ?? 1));
        setEqStandbyRatePct(Number(match.standbyRatePct ?? 50));
      }
    }
  };

  const handleConfirmAddEquipment = async (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    // Reuse the engine-derived preview; only fall back to a fresh engine call (never local math).
    let totalEquipmentCost = equipmentPreviewCost;
    if (totalEquipmentCost === null) {
      try {
        const res = await calculationsApi.computeItemCost(equipmentPreviewItem, rates);
        totalEquipmentCost = Number(res?.directCost) || 0;
      } catch {
        // Engine unreachable. Step 3 recomputes the equipment cost from the rental fields, so an
        // unset cache is safer than persisting a guess.
        totalEquipmentCost = 0;
      }
    }

    const newEquipmentItem = {
      id: newId('eq-item-'),
      system: equipmentSystem(eqAssociatedScope),
      description: eqCustomTitle || t('product.takeoffGrid.equipmentItemFallback', 'Machinery Rental'),
      sizeSpec: `${eqDurationQty} ${eqDurationUnit} rental${eqIncludeDelivery ? ' + Delivery' : ''}`,
      quantity: toNumberOr(eqDurationQty, 1),
      unit: equipmentUnit(eqDurationUnit),
      avgDepthFt: '',
      materialCostPerUnit: 0,
      laborHoursPerUnit: 0,
      laborUnitCost: 0,
      laborRoleId: null,
      isEquipment: true,
      equipmentDurationQty: toNumberOr(eqDurationQty, 1),
      equipmentDurationUnit: eqDurationUnit,
      equipmentDailyRate: toNumberOr(eqCustomDailyRate, 0),
      equipmentWeeklyRate: toNumberOr(eqCustomWeeklyRate, 0),
      equipmentMonthlyRate: toNumberOr(eqCustomMonthlyRate, 0),
      equipmentDeliveryFee: toNumberOr(eqCustomDeliveryFee, 0),
      equipmentFuelSurchargePct: toNumberOr(eqCustomFuelPct, 0),
      equipmentDamageWaiverPct: toNumberOr(eqDamageWaiverPct, 0),
      equipmentMinimumRentalDays: toNumberOr(eqMinimumRentalDays, 1),
      equipmentStandbyDays: toNumberOr(eqStandbyDays, 0),
      equipmentStandbyRatePct: toNumberOr(eqStandbyRatePct, 50),
      equipmentOwnership: eqOwnership,
      equipmentOperatorIncluded: eqOperatorIncluded,
      equipmentOperatorRoleId: 'operator',
      includeDelivery: eqIncludeDelivery,
      associatedScope: eqAssociatedScope,
      equipmentCost: totalEquipmentCost,
    };

    onChange([...items, newEquipmentItem]);
    setShowAddEquipmentModal(false);
  };

  const updateItem = (id: string | number | undefined, field: string, value: unknown) => {
    if (readOnly) return;
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const removeItem = (id: string | number | undefined) => {
    if (readOnly) return;
    onChange(items.filter((it) => it.id !== id));
  };

  const addRow = () => {
    if (readOnly) return;
    onChange([...items, createBlankItem()]);
  };

  const numberField = (item: TakeoffItem, field: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (readOnly) return;
    const v = e.target.value;
    updateItem(item.id, field, v === '' ? '' : Number(v));
  };

  const laborCostField = (item: TakeoffItem) => (e: ChangeEvent<HTMLInputElement>) => {
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

  const textField = (item: TakeoffItem, field: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (readOnly) return;
    updateItem(item.id, field, e.target.value);
  };

  /** Writes one passthrough cell, coercing the raw input to the column's declared value kind. */
  const customFieldHandler =
    (item: TakeoffItem, column: ColumnDefinition) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (readOnly) return;
      const value = coerceCustomFieldValue(e.target.value, column.type);
      onChange(setCustomFieldValue(items, item.id, column.key, value));
    };

  const applyColumns = (next: ColumnDefinition[], { keepMenuOpen = false }: { keepMenuOpen?: boolean } = {}) => {
    if (!onColumnsChange) return;
    onColumnsChange(next);
    if (!keepMenuOpen) setOpenColumnMenu(null);
    setPendingDeleteKey(null);
  };

  /** Opens the inline editor for a new column, or for renaming an existing one. */
  const openColumnEditor = (column: ColumnDefinition | null) => {
    if (readOnly || !onColumnsChange) return;
    if (!column && customColumns.length >= MAX_CUSTOM_COLUMNS) return;
    setOpenColumnMenu(null);
    setPendingDeleteKey(null);
    setColumnEditor({ key: column ? column.key : null, label: column ? column.label : '' });
  };

  /** Applies the pending column name from the inline editor. */
  const commitColumnEditor = () => {
    if (!columnEditor || !onColumnsChange) return;
    const label = columnEditor.label.trim();
    if (!label) {
      setColumnEditor(null);
      return;
    }
    applyColumns(columnEditor.key ? renameColumn(columns, columnEditor.key, label) : addColumn(columns, { label }));
    setColumnEditor(null);
  };

  const handleSetColumnType = (column: ColumnDefinition, type: ColumnType) => {
    if (readOnly || !onColumnsChange) return;
    applyColumns(setColumnType(columns, column.key, type));
  };

  const handleToggleIncludeInDocuments = (column: ColumnDefinition) => {
    if (readOnly || !onColumnsChange) return;
    applyColumns(setColumnIncludeInDocuments(columns, column.key, !column.includeInDocuments));
  };

  /** Moves a column one step; the menu closes so the result is visible immediately. */
  const handleMoveColumn = (column: ColumnDefinition, direction: -1 | 1) => {
    if (readOnly || !onColumnsChange) return;
    applyColumns(moveColumn(columns, column.key, direction));
  };

  /** Applies a width preset, keeping the menu open so the sizes can be compared. */
  const handleSetColumnWidth = (column: ColumnDefinition, width: number | null) => {
    if (readOnly || !onColumnsChange) return;
    applyColumns(setColumnWidth(columns, column.key, width), { keepMenuOpen: true });
  };

  const handleRestoreColumn = (column: ColumnDefinition) => {
    if (readOnly || !onColumnsChange) return;
    applyColumns(restoreColumn(columns, column.key));
  };

  /** Opens a column's menu under its header button, or closes it when that column's menu is open. */
  const toggleColumnMenu = (event: MouseEvent<HTMLButtonElement>, column: ColumnDefinition) => {
    if (openColumnMenu?.key === column.key) {
      setOpenColumnMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setOpenColumnMenu({ key: column.key, top: rect.top, bottom: rect.bottom, left: rect.left });
  };

  /** Starts a drag-resize from the column's right edge. */
  const startColumnResize = (event: PointerEvent<HTMLElement>, column: ColumnDefinition) => {
    if (readOnly || !onColumnsChange) return;
    const measured = Math.round(event.currentTarget.closest('th')?.getBoundingClientRect().width ?? 0);
    const startWidth = column.width ?? (measured > 0 ? measured : FALLBACK_COLUMN_WIDTH);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setResizingColumn({ key: column.key, startX: event.clientX, startWidth, preview: startWidth });
  };

  const updateColumnResize = (event: PointerEvent<HTMLElement>) => {
    if (!resizingColumn) return;
    setResizingColumn({
      ...resizingColumn,
      preview: clampColumnWidth(resizingColumn.startWidth + (event.clientX - resizingColumn.startX)),
    });
  };

  const commitColumnResize = () => {
    if (!resizingColumn) return;
    const { key, preview } = resizingColumn;
    setResizingColumn(null);
    applyColumns(setColumnWidth(columns, key, preview));
  };

  /**
   * Deletes a column on the second click, so a destructive action is never a single mis-click.
   *
   * Columns the calculation engine reads are never deleted. An optional canonical column is only
   * hidden (its values stay on the rows); a passthrough column is removed along with its values.
   */
  const handleDeleteColumn = (column: ColumnDefinition) => {
    if (readOnly || !onColumnsChange) return;
    if (isCalculationColumn(column.key)) return;
    if (pendingDeleteKey !== column.key) {
      setPendingDeleteKey(column.key);
      return;
    }
    // Strip the stored values too, so no orphaned data is saved with the project.
    if (!isCanonicalColumn(column.key)) onChange(clearCustomColumnValues(items, column.key));
    applyColumns(removeColumn(columns, column.key));
  };

  /**
   * Screen-reader name for an inline cell editor. The grid renders editors in `<td>`s with no
   * visible label of their own, so the column name plus the row it belongs to is announced.
   */
  const cellAriaLabel = (label: string, item: TakeoffItem) =>
    `${label}: ${item.description || item.system || t('product.takeoffGrid.lineItem', 'line item')}`;

  return (
    <div className="space-y-3">
      {/* Bulk Labor Role Action Toolbar */}
      {!readOnly && items.length > 0 && selectedItemIds.size > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
              {t('product.takeoffGrid.selectedItemsCount', { count: selectedItemIds.size })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkRoleId}
              onChange={(e) => setBulkRoleId(e.target.value)}
              aria-label={t('product.takeoffGrid.bulkLaborRoleLabel', 'Labor role for the selected line items')}
              className="text-xs px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">{t('product.takeoffGrid.chooseLaborRole', 'Choose Labor Role...')}</option>
              <option value="base">{t('product.takeoffGrid.projectBaseRate', 'Project Base Rate')}</option>
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
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              {t('product.takeoffGrid.applyRoleBtn', 'Apply Role')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              {t('core.common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {columnEditor && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commitColumnEditor();
          }}
          className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl"
        >
          <label className="text-xs font-semibold text-blue-900 dark:text-blue-200" htmlFor="takeoff-column-name">
            {columnEditor.key
              ? t('product.takeoffGrid.columns.renameTitle', 'Rename column')
              : t('product.takeoffGrid.columns.addTitle', 'Add column')}
          </label>
          <input
            id="takeoff-column-name"
            autoFocus
            value={columnEditor.label}
            onChange={(e) => setColumnEditor({ ...columnEditor, label: e.target.value })}
            placeholder={t('product.takeoffGrid.columns.namePlaceholder', 'e.g. PO Number')}
            maxLength={120}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
          >
            {columnEditor.key
              ? t('product.takeoffGrid.columns.renameConfirm', 'Rename')
              : t('product.takeoffGrid.columns.addConfirm', 'Add')}
          </button>
          <button
            type="button"
            onClick={() => setColumnEditor(null)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            {t('core.common.cancel')}
          </button>
        </form>
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
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    title={t('product.takeoffGrid.selectAll', 'Select all line items')}
                    aria-label={t('product.takeoffGrid.selectAll', 'Select all line items')}
                  />
                </th>
              )}
              {shownColumns.map((column) => {
                const numeric = isNumericColumnType(column.type);
                // A drag in progress previews live; the committed width is what the schema holds.
                const width =
                  (resizingColumn?.key === column.key ? resizingColumn.preview : null) ?? column.width ?? null;
                const removable = !isCalculationColumn(column.key);
                return (
                  <Th key={column.key} align={numeric ? 'right' : 'left'} width={width}>
                    <div className="relative inline-flex items-center gap-1">
                      {column.key === 'labor' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{laborInputMode === 'hours' ? t('product.takeoffGrid.laborHoursPerUnit') : t('product.takeoffGrid.laborUnitCost')}</span>
                          <div className="inline-flex rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => handleSetLaborInputMode('hours')}
                              className={`px-1.5 py-0.2 rounded font-semibold transition-colors cursor-pointer ${
                                laborInputMode === 'hours'
                                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                              }`}
                              title={t('product.takeoffGrid.laborHoursPerUnit')}
                            >
                              hrs
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetLaborInputMode('cost')}
                              className={`px-1.5 py-0.2 rounded font-semibold transition-colors cursor-pointer ${
                                laborInputMode === 'cost'
                                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                              }`}
                              title={t('product.takeoffGrid.laborUnitCost')}
                            >
                              $
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span
                          className="truncate"
                          style={{ maxWidth: width ? Math.max(56, width - 36) : 140 }}
                          title={column.label}
                        >
                          {column.label}
                          {column.includeInDocuments && (
                            <Eye
                              className="w-3 h-3 inline ml-1 -mt-0.5 text-emerald-600 dark:text-emerald-400"
                              aria-label={t('product.takeoffGrid.columns.inDocumentsBadge', 'Shown in client documents')}
                            />
                          )}
                        </span>
                      )}
                      {!readOnly && onColumnsChange && (
                        <button
                          type="button"
                          data-column-menu=""
                          onClick={(event) => toggleColumnMenu(event, column)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          title={t('product.takeoffGrid.columns.menuTitle', 'Column options')}
                          aria-label={`${t('product.takeoffGrid.columns.menuTitle', 'Column options')}: ${column.label}`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {openColumnMenu?.key === column.key &&
                        createPortal(
                          <div
                            data-column-menu=""
                            style={columnMenuStyle(openColumnMenu)}
                            className="fixed z-50 overflow-y-auto p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl text-left normal-case tracking-normal font-normal"
                          >
                            {!isCanonicalColumn(column.key) && (
                              <button
                                type="button"
                                onClick={() => openColumnEditor(column)}
                                className="w-full px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer"
                              >
                                {t('product.takeoffGrid.columns.rename', 'Rename...')}
                              </button>
                            )}
                            {!isCanonicalColumn(column.key) && (
                              <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                {t('product.takeoffGrid.columns.typeHeading', 'Type')}
                              </div>
                            )}
                            {!isCanonicalColumn(column.key) &&
                              COLUMN_TYPES.map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => handleSetColumnType(column, type)}
                                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg text-left cursor-pointer ${
                                    column.type === type
                                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {t(`product.takeoffGrid.columns.types.${type}`, type)}
                                </button>
                              ))}
                            {!isCanonicalColumn(column.key) && (
                              <button
                                type="button"
                                onClick={() => handleToggleIncludeInDocuments(column)}
                                className="w-full mt-1 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer border-t border-slate-100 dark:border-slate-800"
                              >
                                {column.includeInDocuments
                                  ? `✓ ${t('product.takeoffGrid.columns.showInDocuments', 'Show in client documents')}`
                                  : t('product.takeoffGrid.columns.showInDocuments', 'Show in client documents')}
                              </button>
                            )}
                            <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800">
                              {t('product.takeoffGrid.columns.widthHeading', 'Width')}
                            </div>
                            <div className="flex items-center gap-1 px-2.5 pb-1.5">
                              {COLUMN_WIDTH_PRESETS.map((preset) => (
                                <button
                                  key={preset.key}
                                  type="button"
                                  onClick={() => handleSetColumnWidth(column, preset.width)}
                                  aria-label={t(preset.labelKey, preset.key)}
                                  className="px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  {t(preset.labelKey, preset.key)}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => handleSetColumnWidth(column, null)}
                                aria-label={t('product.takeoffGrid.columns.widthAuto', 'Auto')}
                                className="px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                {t('product.takeoffGrid.columns.widthAuto', 'Auto')}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 px-2.5 py-1.5 border-t border-slate-100 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleMoveColumn(column, -1)}
                                aria-label={`${t('product.takeoffGrid.columns.moveLeft', 'Move left')}: ${column.label}`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                {t('product.takeoffGrid.columns.moveLeft', 'Move left')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveColumn(column, 1)}
                                aria-label={`${t('product.takeoffGrid.columns.moveRight', 'Move right')}: ${column.label}`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                {t('product.takeoffGrid.columns.moveRight', 'Move right')}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {removable ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteColumn(column)}
                                className={`w-full px-2.5 py-1.5 text-xs rounded-lg text-left cursor-pointer inline-flex items-center gap-1.5 ${
                                  pendingDeleteKey === column.key
                                    ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-semibold'
                                    : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {pendingDeleteKey === column.key
                                  ? t('product.takeoffGrid.columns.deleteConfirm', 'Confirm delete?')
                                  : t('product.takeoffGrid.columns.delete', 'Delete column')}
                              </button>
                            ) : (
                              <p className="px-2.5 py-1.5 text-[11px] text-slate-400 dark:text-slate-500 inline-flex items-center gap-1.5">
                                <Trash2 className="w-3.5 h-3.5" />
                                {t('product.takeoffGrid.columns.deleteMandatoryHint', 'Required by the calculation engine')}
                              </p>
                            )}
                          </div>,
                          document.body,
                        )}
                  </div>
                  {!readOnly && onColumnsChange && (
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`${t('product.takeoffGrid.columns.resize', 'Resize column')}: ${column.label}`}
                      onPointerDown={(event) => startColumnResize(event, column)}
                      onPointerMove={updateColumnResize}
                      onPointerUp={commitColumnResize}
                      onPointerCancel={commitColumnResize}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none select-none hover:bg-blue-400/50"
                    />
                  )}
                </Th>
                );
              })}
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {items.map((item) => {
              const matchedRole = item.laborRoleId ? laborRoles.find((r) => r.id === item.laborRoleId) : null;
              const itemHourlyRate = matchedRole ? (matchedRole.hourlyRate ?? hourlyRate) : hourlyRate;
              const itemRoleTitle = matchedRole ? matchedRole.title : 'Project Base Rate';

              /**
               * The cell for one visible column.
               *
               * Canonical keys keep their dedicated editors; every other key is a passthrough cell.
               * Rendering the body from the schema is what lets a column be moved, resized or hidden
               * without touching the data behind it.
               */
              const cellFor = (column: ColumnDefinition): ReactNode => {
                switch (column.key) {
                  case 'system':
                    return (
                      <select
                        value={item.system ?? ''}
                        onChange={textField(item, 'system')}
                        disabled={readOnly}
                        aria-label={cellAriaLabel(t('product.takeoffGrid.system'), item)}
                        className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-300 disabled:opacity-80 disabled:cursor-not-allowed font-medium text-xs"
                      >
                        {systemOptions.map((s) => (
                          <option key={s} value={s} className="dark:bg-slate-900 dark:text-white">
                            {s}
                          </option>
                        ))}
                      </select>
                    );
                  case 'item_description':
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.isEquipment && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <Truck className="w-2.5 h-2.5" /> {t('product.takeoffGrid.equipmentBadge', 'Equipment Rental')}
                          </span>
                        )}
                        <input
                          value={item.description ?? ''}
                          onChange={textField(item, 'description')}
                          disabled={readOnly}
                          aria-label={cellAriaLabel(t('product.takeoffGrid.description'), item)}
                          className="flex-1 bg-transparent outline-none min-w-[120px] disabled:opacity-80 disabled:cursor-not-allowed dark:text-white font-medium"
                        />
                        {item.hasMissingScope && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                            title={t('product.takeoffGrid.missingScopeTooltip', 'Scope requires field verification / pricing review')}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />{item.missingScopeReason || t('product.takeoffGrid.missingScopeBadge', 'Missing Scope')}
                          </span>
                        )}
                      </div>
                    );
                  case 'size_spec':
                    return (
                      <input
                        value={item.sizeSpec ?? ''}
                        onChange={textField(item, 'sizeSpec')}
                        disabled={readOnly}
                        aria-label={cellAriaLabel(t('product.takeoffGrid.sizeSpec'), item)}
                        className="w-full bg-transparent outline-none min-w-[120px] disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
                      />
                    );
                  case 'quantity':
                    return (
                      <input
                        type="number"
                        value={item.quantity ?? ''}
                        onChange={numberField(item, 'quantity')}
                        disabled={readOnly}
                        aria-label={cellAriaLabel(t('product.takeoffGrid.quantity'), item)}
                        className={quantityInputClass(item)}
                      />
                    );
                  case 'unit':
                    return (
                      <select
                        value={item.unit ?? ''}
                        onChange={textField(item, 'unit')}
                        disabled={readOnly}
                        aria-label={cellAriaLabel(t('product.takeoffGrid.unit'), item)}
                        className="w-full bg-transparent outline-none disabled:opacity-80 disabled:cursor-not-allowed font-mono text-xs dark:text-white"
                      >
                        {unitOptions.map((u) => (
                          <option key={u} value={u} className="dark:bg-slate-900 dark:text-white">
                            {u}
                          </option>
                        ))}
                      </select>
                    );
                  case 'avg_depth_ft':
                    return (
                      <input
                        type="number"
                        value={item.avgDepthFt ?? ''}
                        onChange={numberField(item, 'avgDepthFt')}
                        aria-label={cellAriaLabel(t('product.takeoffGrid.avgDepth'), item)}
                        className="w-16 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
                        disabled={readOnly || item.unit !== 'LF' || item.isEquipment}
                      />
                    );
                  case 'labor_role':
                    return item.isEquipment ? (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                        {t('product.takeoffGrid.equipmentNoLabor', 'N/A (Machinery)')}
                      </span>
                    ) : (
                      <select
                        value={item.laborRoleId || ''}
                        onChange={(e) => updateItem(item.id, 'laborRoleId', e.target.value || null)}
                        disabled={readOnly}
                        aria-label={cellAriaLabel(t('product.takeoffGrid.laborRoleCol', 'Labor Role'), item)}
                        className="w-full bg-transparent outline-none text-xs text-slate-700 dark:text-slate-300 font-medium disabled:opacity-80 disabled:cursor-not-allowed"
                        title={t('product.takeoffGrid.assignedLaborRoleTooltip', { role: itemRoleTitle, rate: itemHourlyRate })}
                      >
                        <option value="" className="dark:bg-slate-900 dark:text-white">
                          {t('product.takeoffGrid.defaultRoleOption', { rate: hourlyRate, defaultValue: `Default ($${hourlyRate}/hr)` })}
                        </option>
                        {laborRoles.map((role) => (
                          <option key={role.id} value={role.id} className="dark:bg-slate-900 dark:text-white">
                            {role.title} (${role.hourlyRate}/hr)
                          </option>
                        ))}
                      </select>
                    );
                  case 'material_cost_per_unit':
                    return item.isEquipment ? (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        ${toNumberOr(item.equipmentCost, 0).toLocaleString()}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        value={item.materialCostPerUnit ?? ''}
                        onChange={numberField(item, 'materialCostPerUnit')}
                        disabled={readOnly}
                        aria-label={cellAriaLabel(t('product.takeoffGrid.materialCostPerUnit'), item)}
                        className="w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
                      />
                    );
                  case 'labor':
                    return item.isEquipment ? (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                        {t('product.takeoffGrid.equipmentIncludedFee', 'Rental/Delivery')}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        value={laborCellValue(item, laborInputMode, itemHourlyRate)}
                        onChange={laborCellHandler(item, laborInputMode, numberField, laborCostField)}
                        disabled={readOnly}
                        aria-label={cellAriaLabel(
                          laborInputMode === 'hours'
                            ? t('product.takeoffGrid.laborHoursPerUnit')
                            : t('product.takeoffGrid.laborUnitCost'),
                          item,
                        )}
                        className="w-20 bg-transparent outline-none text-right disabled:opacity-80 disabled:cursor-not-allowed dark:text-white"
                      />
                    );
                  default: {
                    const value = getCustomFieldValue(item, column.key);
                    const numeric = isNumericColumnType(column.type);
                    return column.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={value === true || /^(y|yes|true|t|1)$/i.test(String(value ?? ''))}
                        onChange={customFieldHandler(item, column)}
                        disabled={readOnly}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                        aria-label={column.label}
                      />
                    ) : (
                      <input
                        type={numeric ? 'number' : 'text'}
                        step="any"
                        value={value === null || value === undefined ? '' : String(value)}
                        onChange={customFieldHandler(item, column)}
                        disabled={readOnly}
                        aria-label={column.label}
                        className={`bg-transparent outline-none disabled:opacity-80 disabled:cursor-not-allowed dark:text-white ${
                          numeric ? 'w-24 text-right font-mono text-xs' : 'w-full min-w-[100px] text-xs'
                        }`}
                      />
                    );
                  }
                }
              };

              return (
                <tr
                  key={item.id}
                  className={takeoffRowClass(item, selectedItemIds.has(item.id))}
                >
                  {!readOnly && (
                    <td className="px-3 py-2 text-center w-8">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.id)}
                        onChange={() => handleToggleSelectItem(item.id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                        aria-label={cellAriaLabel(t('product.takeoffGrid.selectRow', 'Select line item'), item)}
                      />
                    </td>
                  )}
                  {shownColumns.map((column) => (
                    <Td
                      key={column.key}
                      align={isNumericColumnType(column.type) ? 'right' : 'left'}
                      width={column.width ?? null}
                    >
                      {cellFor(column)}
                    </Td>
                  ))}
                  <Td>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                        title={t('product.takeoffGrid.deleteRow')}
                        aria-label={t('product.takeoffGrid.deleteRow')}
                      >
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
              >
                + {t('product.takeoffGrid.addRow')}
              </button>
              {onColumnsChange && customColumns.length < MAX_CUSTOM_COLUMNS && (
                <button
                  type="button"
                  onClick={() => openColumnEditor(null)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
                  title={t('product.takeoffGrid.columns.addHint', 'Add a column for data the parser did not map')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('product.takeoffGrid.columns.addButton', 'Add column')}
                </button>
              )}
              {onColumnsChange &&
                hiddenColumnList.map((column) => (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() => handleRestoreColumn(column)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
                    title={t('product.takeoffGrid.columns.showColumn', 'Show column')}
                    aria-label={`${t('product.takeoffGrid.columns.showColumn', 'Show column')}: ${column.label}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {t('product.takeoffGrid.columns.hiddenHeading', 'Hidden column')}: {column.label}
                  </button>
                ))}
              <button
                type="button"
                onClick={handleOpenAddEquipmentModal}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-lg transition cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />{t('product.takeoffGrid.addEquipmentRental', '+ Add Equipment Rental')}
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
                <span className="text-xl"><Truck className="w-5 h-5" /></span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('product.takeoffGrid.addEquipmentTitle', 'Add Equipment / Machinery Rental')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('product.takeoffGrid.addEquipmentSubtitle', 'Select machinery type, rental duration, and delivery options.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEquipmentModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                aria-label={t('core.common.close', 'Close')}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddEquipment} className="py-4 space-y-3.5">
              <div>
                <label
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  htmlFor="equipment-type"
                >
                  {t('product.takeoffGrid.equipmentType', 'Equipment / Machine Type')}
                </label>
                <select
                  id="equipment-type"
                  value={selectedCatalogId}
                  onChange={handleCatalogSelectChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {equipmentCatalog.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.title} (${eq.weeklyRate}/wk)
                    </option>
                  ))}
                  <option value="custom">-- {t('product.takeoffGrid.customMachine', 'Custom Machine / Tool')} --</option>
                </select>
              </div>

              {selectedCatalogId === 'custom' && (
                <div>
                  <label
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    htmlFor="equipment-custom-title"
                  >
                    {t('product.takeoffGrid.customMachineTitle', 'Equipment Description')}
                  </label>
                  <input
                    id="equipment-custom-title"
                    type="text"
                    required
                    placeholder="e.g. 50-Ton Crane, Hydro-Vac Truck"
                    value={eqCustomTitle}
                    onChange={(e) => setEqCustomTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  htmlFor="equipment-associated-scope"
                >
                  {t('product.takeoffGrid.associatedScope', 'Associated Scope')}
                </label>
                <select
                  id="equipment-associated-scope"
                  value={eqAssociatedScope}
                  onChange={(e) => setEqAssociatedScope(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="General / Project-Wide">{t('product.takeoffGrid.generalScope', 'General / Project-Wide')}</option>
                  {systemOptions.map((system) => (
                    <option key={system} value={system}>{system}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    htmlFor="equipment-duration-qty"
                  >
                    {t('product.takeoffGrid.durationQty', 'Duration Qty')}
                  </label>
                  <input
                    id="equipment-duration-qty"
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={eqDurationQty}
                    onChange={(e) => setEqDurationQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    htmlFor="equipment-duration-unit"
                  >
                    {t('product.takeoffGrid.durationUnit', 'Duration Unit')}
                  </label>
                  <select
                    id="equipment-duration-unit"
                    value={eqDurationUnit}
                    onChange={(e) => setEqDurationUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="days">{t('product.takeoffGrid.daysUnit', 'Days')}</option>
                    <option value="weeks">{t('product.takeoffGrid.weeksUnit', 'Weeks')}</option>
                    <option value="months">{t('product.takeoffGrid.monthsUnit', 'Months')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('product.takeoffGrid.ownership', 'Ownership')}
                  </label>
                  <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEqOwnership('rented')}
                      className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${eqOwnership === 'rented' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      {t('product.takeoffGrid.rented', 'Rented')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEqOwnership('company-owned')}
                      className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${eqOwnership === 'company-owned' ? 'bg-slate-700 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      {t('product.takeoffGrid.companyOwned', 'Company-Owned')}
                    </button>
                  </div>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={eqOperatorIncluded}
                      onChange={(e) => setEqOperatorIncluded(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500"
                    />
                    <span>{t('product.takeoffGrid.operatorIncluded', 'Operator Included')}</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5"
                    htmlFor="equipment-day-rate"
                  >
                    {t('product.takeoffGrid.dayRate', 'Day Rate')}
                  </label>
                  <div className="flex items-center px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className="text-slate-400 text-xs mr-1">$</span>
                    <input
                      id="equipment-day-rate"
                      type="number"
                      step="any"
                      value={eqCustomDailyRate}
                      onChange={(e) => setEqCustomDailyRate(Number(e.target.value))}
                      className="w-full bg-transparent outline-none text-xs text-right"
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5"
                    htmlFor="equipment-week-rate"
                  >
                    {t('product.takeoffGrid.weekRate', 'Week Rate')}
                  </label>
                  <div className="flex items-center px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className="text-slate-400 text-xs mr-1">$</span>
                    <input
                      id="equipment-week-rate"
                      type="number"
                      step="any"
                      value={eqCustomWeeklyRate}
                      onChange={(e) => setEqCustomWeeklyRate(Number(e.target.value))}
                      className="w-full bg-transparent outline-none text-xs text-right"
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5"
                    htmlFor="equipment-month-rate"
                  >
                    {t('product.takeoffGrid.monthRate', 'Month Rate')}
                  </label>
                  <div className="flex items-center px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className="text-slate-400 text-xs mr-1">$</span>
                    <input
                      id="equipment-month-rate"
                      type="number"
                      step="any"
                      value={eqCustomMonthlyRate}
                      onChange={(e) => setEqCustomMonthlyRate(Number(e.target.value))}
                      className="w-full bg-transparent outline-none text-xs text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5"
                    htmlFor="equipment-damage-waiver"
                  >
                    {t('product.takeoffGrid.damageWaiverPct', 'Damage Waiver %')}
                  </label>
                  <input
                    id="equipment-damage-waiver"
                    type="number"
                    min="0"
                    step="any"
                    value={eqDamageWaiverPct}
                    onChange={(e) => setEqDamageWaiverPct(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5"
                    htmlFor="equipment-min-rental-days"
                  >
                    {t('product.takeoffGrid.minimumRentalDays', 'Min Rental Days')}
                  </label>
                  <input
                    id="equipment-min-rental-days"
                    type="number"
                    min="1"
                    step="1"
                    value={eqMinimumRentalDays}
                    onChange={(e) => setEqMinimumRentalDays(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5"
                    htmlFor="equipment-standby-days"
                  >
                    {t('product.takeoffGrid.standbyDays', 'Standby Days')}
                  </label>
                  <input
                    id="equipment-standby-days"
                    type="number"
                    min="0"
                    step="1"
                    value={eqStandbyDays}
                    onChange={(e) => setEqStandbyDays(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right outline-none"
                  />
                </div>
                <div>
                  <label
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5"
                    htmlFor="equipment-standby-rate"
                  >
                    {t('product.takeoffGrid.standbyRatePct', 'Standby %')}
                  </label>
                  <input
                    id="equipment-standby-rate"
                    type="number"
                    min="0"
                    step="any"
                    value={eqStandbyRatePct}
                    onChange={(e) => setEqStandbyRatePct(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right outline-none"
                  />
                </div>
              </div>

              {eqOperatorIncluded && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5"
                      htmlFor="equipment-production-rate"
                    >
                      {t('product.takeoffGrid.productionRate', 'Production Rate (qty/day)')}
                    </label>
                    <input
                      id="equipment-production-rate"
                      type="number"
                      min="0"
                      step="any"
                      value={eqProductionRate}
                      onChange={(e) => setEqProductionRate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right outline-none"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5"
                      htmlFor="equipment-contingency-days"
                    >
                      {t('product.takeoffGrid.contingencyDays', 'Contingency Days')}
                    </label>
                    <input
                      id="equipment-contingency-days"
                      type="number"
                      min="0"
                      step="1"
                      value={eqContingencyDays}
                      onChange={(e) => setEqContingencyDays(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={eqIncludeDelivery}
                    onChange={(e) => setEqIncludeDelivery(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500"
                  />
                  <span>{t('product.takeoffGrid.includeDelivery', 'Include Delivery & Mobilization')}</span>
                </label>
                <div className="flex items-center text-xs">
                  <span className="text-slate-400 mr-1">$</span>
                  <input
                    type="number"
                    step="any"
                    disabled={!eqIncludeDelivery}
                    value={eqCustomDeliveryFee}
                    onChange={(e) => setEqCustomDeliveryFee(Number(e.target.value))}
                    aria-label={t('product.takeoffGrid.deliveryFeeLabel', 'Delivery and mobilization fee')}
                    className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Cost Calculation Preview Pill — the value comes from the pricing engine, so it
                  always matches the results page (step 3). */}
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                    {t('product.takeoffGrid.totalEquipmentCost', 'Calculated Equipment Total:')}
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400">
                    {eqDurationQty} {eqDurationUnit}
                    {eqIncludeDelivery && (Number(eqCustomDeliveryFee) || 0) > 0
                      ? ` + ${formatCurrency(Number(eqCustomDeliveryFee) || 0)} delivery`
                      : ''}
                  </span>
                </div>
                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                  {equipmentPreviewCost === null ? '—' : formatCurrency(equipmentPreviewCost)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEquipmentModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  {t('core.common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs cursor-pointer transition"
                >
                  {t('product.takeoffGrid.confirmAddEquipment', 'Add Equipment Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** A header cell, sized to the column's stored width when it has one. `relative` hosts the resize handle. */
function Th({
  children,
  align = 'left',
  width = null,
}: Readonly<{ children?: ReactNode; align?: string; width?: number | null }>) {
  return (
    <th
      className={`relative px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={width ? { width, minWidth: width } : undefined}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  width = null,
}: Readonly<{ children?: ReactNode; align?: string; width?: number | null }>) {
  return (
    <td
      className={`px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={width ? { width, minWidth: width } : undefined}
    >
      {children}
    </td>
  );
}
