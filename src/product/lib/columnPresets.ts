/**
 * Saved takeoff column layout presets.
 *
 * A preset is the grid's ordered column schema (labels, value kinds, widths, visibility and
 * client-document flags) stored per user in `public.column_presets`, so a house layout can be applied
 * to any project from any device. This module owns the API client and the pure merge used when a
 * preset is loaded, keeping the grid component free of storage/transport concerns.
 */
import { getTranslation } from '@/core/lib/shared/i18n';
import { ApiError } from '@/types/api';
import {
  customColumnsOf,
  mergeColumns,
  normalizeCustomColumn,
} from '@/product/lib/takeoffColumns';
import type { ColumnLabelResolver } from '@/product/lib/takeoffColumns';
import type { ColumnDefinition, ColumnPreset } from '@/types/models';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

/** Reads the ordered schema off a preset row, tolerating a malformed payload. */
export function presetColumns(preset: ColumnPreset | null | undefined): ColumnDefinition[] {
  const columns = preset?.columns_json;
  return Array.isArray(columns) ? columns : [];
}

/**
 * Applies a saved preset to the current schema.
 *
 * The preset owns the column order and each column's view state (width, visibility) plus the
 * passthrough columns it defines. Passthrough columns the project already has are appended after the
 * preset's own columns, so importing a new sheet and then loading a preset never orphans the values
 * already typed into those columns. Canonical columns are always rebuilt locally, so their labels
 * follow the active language and their types stay engine-bound.
 */
export function applyColumnPreset(
  currentColumns: ColumnDefinition[],
  preset: ColumnDefinition[],
  resolveLabel: ColumnLabelResolver,
): ColumnDefinition[] {
  const presetPassthroughKeys = new Set(
    customColumnsOf(preset)
      .map((column) => normalizeCustomColumn(column)?.key)
      .filter((key): key is string => Boolean(key)),
  );

  const extraCurrentColumns = customColumnsOf(currentColumns).filter(
    (column) => !presetPassthroughKeys.has(column.key),
  );

  return mergeColumns([...preset, ...extraCurrentColumns], resolveLabel);
}

export const columnPresetsApi = {
  /** The signed-in user's saved column presets, newest first. */
  async list(): Promise<ColumnPreset[]> {
    const res = await fetch(`${API_BASE_URL}/column-presets`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.fetchColumnPresetsFailed'));
    }
    return Array.isArray(data.presets) ? (data.presets as ColumnPreset[]) : [];
  },

  /** Saves the current layout; a name the user already uses replaces that preset. */
  async create({ name, columns }: { name: string; columns: ColumnDefinition[] }): Promise<ColumnPreset> {
    const res = await fetch(`${API_BASE_URL}/column-presets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, columns }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(data.error || getTranslation('core.apiErrors.saveColumnPresetFailed'), {
        code: data.code,
      });
    }
    return data.preset as ColumnPreset;
  },

  /** Deletes one of the user's presets. */
  async delete(id: string) {
    const res = await fetch(`${API_BASE_URL}/column-presets/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || getTranslation('core.apiErrors.deleteColumnPresetFailed'));
    }
    return true;
  },
};
