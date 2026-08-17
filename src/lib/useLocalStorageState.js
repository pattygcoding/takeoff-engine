import { useEffect, useState } from 'react';

/**
 * A useState-like hook that persists its value to localStorage.
 */
export function useLocalStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
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
