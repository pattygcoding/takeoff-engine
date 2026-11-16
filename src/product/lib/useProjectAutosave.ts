import { useCallback, useEffect, useRef, useState } from 'react';
import { projectsApi } from '@/product/lib/projects';
import type { ColumnDefinition, Project, Rates, TakeoffItem } from '@/types/models';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ProjectAutosave {
  status: AutosaveStatus;
  /** When the last successful save landed, for the "Saved 12:04" chip. */
  savedAt: number | null;
  error: string | null;
  /** Saves immediately (awaited before submit / proposal email). */
  flush: () => Promise<void>;
  /** Records a save performed elsewhere (e.g. the Step 3 save modal) so it isn't repeated. */
  markSaved: () => void;
}

const DRAFT_KEY_PREFIX = 'takeoff-engine.draft.';

/** Deterministic JSON so key order can never make an unchanged estimate look dirty. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Everything that makes a draft different from the saved copy. */
export function estimateFingerprint(
  items: TakeoffItem[],
  rates: Rates,
  columns: ColumnDefinition[],
): string {
  return stableStringify({ items, rates, columns });
}

/** The fingerprint this browser last pushed for a project, or null when it never saved one. */
export function readSavedFingerprint(projectId: string | number | null | undefined): string | null {
  if (!projectId) return null;
  try {
    return window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${projectId}`);
  } catch {
    return null;
  }
}

/** Remembers what the cloud copy holds, so later edits can be detected as unsaved. */
export function recordSavedFingerprint(
  projectId: string | number | null | undefined,
  items: TakeoffItem[],
  rates: Rates,
  columns: ColumnDefinition[],
): void {
  if (!projectId) return;
  try {
    window.localStorage.setItem(
      `${DRAFT_KEY_PREFIX}${projectId}`,
      estimateFingerprint(items, rates, columns),
    );
  } catch {
    // Storage can be unavailable (private browsing); the guard degrades to "not dirty".
  }
}

/**
 * True when this browser holds edits the cloud copy does not have yet.
 *
 * A project with no recorded fingerprint was never saved from here, so there is nothing to protect
 * and the cloud copy may load normally.
 */
export function isLocalDraftDirty(
  projectId: string | number | null | undefined,
  items: TakeoffItem[],
  rates: Rates,
  columns: ColumnDefinition[],
): boolean {
  const saved = readSavedFingerprint(projectId);
  if (!saved) return false;
  return saved !== estimateFingerprint(items, rates, columns);
}

interface UseProjectAutosaveOptions {
  /** The project being edited; null while a brand-new takeoff has no cloud row yet. */
  project: Project | null;
  items: TakeoffItem[];
  rates: Rates;
  columns: ColumnDefinition[];
  /** Rolled-up totals for `summary_json`; omitted until the live estimate has landed. */
  summary?: Record<string, unknown>;
  /** Name used when the first edit has to create the draft project. */
  draftName: string;
  /** False for locked projects (the backend rejects estimate edits with 403 anyway). */
  enabled?: boolean;
  /** Lets the workspace adopt a newly created project and rewrite the URL. */
  onSaved?: (project: Project) => void;
  debounceMs?: number;
}

/**
 * Autosaves the Step 2 / Step 3 estimate as a cloud draft.
 *
 * Before this existed, Step 2 persisted nothing: edits lived in localStorage until the user opened
 * the Step 3 save modal, and opening the project again replaced them with the stale cloud copy.
 *
 * - The first edit of a brand-new takeoff **creates** the draft project (derived name), then every
 *   later edit updates it, so a draft appears on the dashboard immediately and never duplicates.
 * - Saves are debounced and serialized, so an older request can never land after a newer one.
 * - An unchanged estimate is skipped entirely (fingerprint), and a failed save keeps the last good
 *   state with `status: 'error'` so the next edit retries.
 */
export function useProjectAutosave({
  project,
  items,
  rates,
  columns,
  summary,
  draftName,
  enabled = true,
  onSaved,
  debounceMs = 1500,
}: UseProjectAutosaveOptions): ProjectAutosave {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fingerprint = estimateFingerprint(items, rates, columns);
  // The save loop reads the newest values from a ref, so a debounced call can never save stale state.
  const latest = useRef({ project, items, rates, columns, summary, draftName, onSaved });
  latest.current = { project, items, rates, columns, summary, draftName, onSaved };

  const lastSaved = useRef<string | null>(readSavedFingerprint(project?.id));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef<Promise<void> | null>(null);
  const pending = useRef(false);
  const lastSaveOk = useRef(true);

  // A different project has a different saved fingerprint.
  useEffect(() => {
    lastSaved.current = readSavedFingerprint(project?.id);
  }, [project?.id]);

  const performSave = useCallback(async (): Promise<boolean> => {
    const snapshot = latest.current;
    if (!enabled) return true;
    if (snapshot.items.length === 0) return true;

    const nextFingerprint = estimateFingerprint(snapshot.items, snapshot.rates, snapshot.columns);
    if (nextFingerprint === lastSaved.current) return true;

    setStatus('saving');
    setError(null);

    const payload = {
      items: snapshot.items,
      rates: snapshot.rates,
      columns: snapshot.columns,
      ...(snapshot.summary ? { summary: snapshot.summary } : {}),
    };

    try {
      const saved = snapshot.project?.id
        ? await projectsApi.update(String(snapshot.project.id), payload)
        : await projectsApi.create({ name: snapshot.draftName, status: 'draft', ...payload });

      lastSaved.current = nextFingerprint;
      recordSavedFingerprint(saved?.id, snapshot.items, snapshot.rates, snapshot.columns);
      setStatus('saved');
      setSavedAt(Date.now());
      if (saved) snapshot.onSaved?.(saved);
      return true;
    } catch (err) {
      setError((err as Error)?.message || 'Could not save the draft.');
      setStatus('error');
      return false;
    }
  }, [enabled]);

  /** Serializes saves: a request that arrives mid-flight queues one more pass with fresh state. */
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (running.current) {
      pending.current = true;
      await running.current;
      return lastSaveOk.current;
    }

    const run = (async () => {
      do {
        pending.current = false;
        lastSaveOk.current = await performSave();
      } while (pending.current && lastSaveOk.current);
    })();

    running.current = run;
    try {
      await run;
    } finally {
      running.current = null;
    }
    return lastSaveOk.current;
  }, [performSave]);

  // Debounced autosave whenever the estimate actually changes.
  useEffect(() => {
    if (!enabled) return;
    if (items.length === 0) return;
    if (fingerprint === lastSaved.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void saveNow();
    }, debounceMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fingerprint, enabled, items.length, debounceMs, saveNow]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    // Retry while an edit keeps landing during the save (bounded, so a broken backend can't loop).
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const ok = await saveNow();
      // A failed save is surfaced to the user (and retried on the next edit), not hammered here.
      if (!ok) return;
      const snapshot = latest.current;
      if (!enabled || snapshot.items.length === 0) return;
      const current = estimateFingerprint(snapshot.items, snapshot.rates, snapshot.columns);
      if (current === lastSaved.current) return;
    }
  }, [enabled, saveNow]);

  const markSaved = useCallback(() => {
    const snapshot = latest.current;
    lastSaved.current = estimateFingerprint(snapshot.items, snapshot.rates, snapshot.columns);
    recordSavedFingerprint(snapshot.project?.id, snapshot.items, snapshot.rates, snapshot.columns);
    setStatus('saved');
    setSavedAt(Date.now());
    setError(null);
  }, []);

  return { status, savedAt, error, flush, markSaved };
}

