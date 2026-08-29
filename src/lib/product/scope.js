/**
 * Scope Inclusions, Exclusions & Counter-Offer Data Utilities (US-044)
 * Provides standard trade categories (Fixtures, Site, Admin), status definitions,
 * and scope calculation/normalization functions.
 */

import defaultScopeItemsJson from '@/data/inclusions/defaultScopeItems.json';

export const SCOPE_STATUS = {
  INCLUDED: 'included',
  EXCLUDED: 'excluded',
  OPTIONAL_ADDON: 'optional_addon',
  NOT_APPLICABLE: 'not_applicable',
};

export const SCOPE_PRESETS_STORAGE_KEY = 'takeoff_engine_scope_presets';

/**
 * Pre-defined standard scope templates across common civil, plumbing, mechanical, and commercial trades.
 */
export const DEFAULT_SCOPE_ITEMS = defaultScopeItemsJson;

/**
 * Returns a cloned initial scope list
 */
export function getInitialScopeItems() {
  return JSON.parse(JSON.stringify(DEFAULT_SCOPE_ITEMS));
}

/**
 * Categorizes a scope array into included, excluded, optional add-ons, and not applicable
 */
export function categorizeScope(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  return {
    included: safeItems.filter((it) => it.status === SCOPE_STATUS.INCLUDED),
    excluded: safeItems.filter((it) => it.status === SCOPE_STATUS.EXCLUDED),
    optionalAddons: safeItems.filter((it) => it.status === SCOPE_STATUS.OPTIONAL_ADDON),
    notApplicable: safeItems.filter((it) => it.status === SCOPE_STATUS.NOT_APPLICABLE),
  };
}

/**
 * Returns summary count and status highlights
 */
export function summarizeScope(items = []) {
  const { included, excluded, optionalAddons, notApplicable } = categorizeScope(items);
  return {
    totalCount: items.length,
    includedCount: included.length,
    excludedCount: excluded.length,
    addonsCount: optionalAddons.length,
    naCount: notApplicable.length,
    fixturesExcluded: excluded.some((it) => it.category === 'fixtures'),
  };
}

/**
 * Loads user saved scope presets from localStorage
 */
export function getSavedScopePresets() {
  try {
    const raw = localStorage.getItem(SCOPE_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load scope presets:', e);
    return [];
  }
}

/**
 * Saves a new scope preset to localStorage
 */
export function saveScopePreset(presetName, scopeItems) {
  if (!presetName || !presetName.trim()) return null;
  const currentPresets = getSavedScopePresets();
  const newPreset = {
    id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: presetName.trim(),
    createdAt: new Date().toISOString(),
    items: JSON.parse(JSON.stringify(scopeItems)),
  };

  const updated = [newPreset, ...currentPresets.filter((p) => p.name.toLowerCase() !== presetName.trim().toLowerCase())];
  try {
    localStorage.setItem(SCOPE_PRESETS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save scope preset:', e);
  }
  return newPreset;
}

/**
 * Deletes a saved scope preset by ID
 */
export function deleteScopePreset(presetId) {
  const currentPresets = getSavedScopePresets();
  const filtered = currentPresets.filter((p) => p.id !== presetId);
  try {
    localStorage.setItem(SCOPE_PRESETS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete scope preset:', e);
  }
  return filtered;
}

/**
 * Formats an optional add-on's price impact as a short "+$500.00" or "+5%" label.
 * Returns null when there is no priced impact to show.
 */
export function formatScopeAddonImpact(item) {
  const raw = Number(item?.costImpact) || 0;
  if (!raw) return null;
  if (item?.costImpactType === 'percent') {
    return `+${raw}%`;
  }
  return `+$${raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
