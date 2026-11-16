import { useEffect, useRef, useState } from 'react';
import { calculationsApi } from '@/product/lib/calculations';
import type { EstimateTotals, Rates, TakeoffItem } from '@/types/models';

/** Totals shown before the first response, and whenever the grid has no rows. */
const EMPTY_TOTALS: EstimateTotals = {};

export interface LiveEstimate {
  /** The last successful totals; `{}` until the first response. */
  totals: EstimateTotals;
  /** A refresh is in flight (the previous totals stay on screen). */
  loading: boolean;
  /** At least one answer has settled, so the UI can stop showing a first-load state. */
  ready: boolean;
  /** The last refresh failed; the totals are the previous successful ones. */
  stale: boolean;
}

/**
 * Real-time estimate totals for Step 2.
 *
 * The numbers must match Step 3 exactly, so this calls the same backend endpoint ResultsStep uses
 * rather than re-deriving the math in the browser. Edits arrive per keystroke, so requests are
 * debounced, the previous response is aborted, and a monotonic id keeps a slow response from
 * overwriting a newer one. A failed refresh keeps the last good totals instead of flashing zeros.
 */
export function useLiveEstimate(
  items: TakeoffItem[],
  rates: Rates,
  { debounceMs = 350 }: { debounceMs?: number } = {},
): LiveEstimate {
  const [totals, setTotals] = useState<EstimateTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [stale, setStale] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    // Nothing to price: skip the round-trip and clear any previous numbers.
    if (items.length === 0) {
      requestId.current += 1;
      setTotals(EMPTY_TOTALS);
      setLoading(false);
      setStale(false);
      setReady(true);
      return;
    }

    const id = ++requestId.current;
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await calculationsApi.computeEstimate(items, rates, controller.signal);
          if (cancelled || id !== requestId.current) return;
          setTotals(res?.totals ?? EMPTY_TOTALS);
          setStale(false);
        } catch {
          // An aborted request is not a failure: a newer edit is already on its way.
          if (cancelled || id !== requestId.current) return;
          setStale(true);
        } finally {
          if (!cancelled && id === requestId.current) {
            setLoading(false);
            setReady(true);
          }
        }
      })();
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [items, rates, debounceMs]);

  return { totals, loading, ready, stale };
}
