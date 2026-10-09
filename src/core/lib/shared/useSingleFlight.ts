import { useCallback, useRef } from 'react';

/**
 * Returns `guard(key, handler)`, which wraps an async event handler so a repeat trigger
 * (double-click, Enter + click) is ignored while the previous call for the same key is running.
 * `disabled={loading}` alone is not enough: React state updates are async, so two clicks in the
 * same tick both see `loading === false`. The ref here updates synchronously.
 *
 * `key` may be a string or a function of the handler arguments (e.g. per-row actions).
 */
type FlightKey<Args extends unknown[]> = string | ((...args: Args) => unknown);
type FlightHandler<Args extends unknown[], Result> = (...args: Args) => Result | Promise<Result>;

export function useSingleFlight() {
  const inFlightRef = useRef(new Set<unknown>());

  return useCallback(
    <Args extends unknown[], Result>(key: FlightKey<Args>, handler: FlightHandler<Args, Result>) =>
      async (...args: Args): Promise<Result | undefined> => {
        const resolvedKey = typeof key === 'function' ? key(...args) : key;
        if (inFlightRef.current.has(resolvedKey)) {
          // Ignored form submits must still not fall through to a native page-reloading submit.
          (args[0] as { preventDefault?: () => void } | undefined)?.preventDefault?.();
          return undefined;
        }
        inFlightRef.current.add(resolvedKey);
        try {
          return await handler(...args);
        } finally {
          inFlightRef.current.delete(resolvedKey);
        }
      },
    [],
  );
}
