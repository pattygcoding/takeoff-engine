import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * A useState-like hook that persists its value to localStorage.
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage errors (e.g., private browsing quota)
    }
  }, [key, value]);

  return [value, setValue];
}
