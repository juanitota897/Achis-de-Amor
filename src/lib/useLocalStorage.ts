/**
 * useLocalStorage hook — persists state to localStorage.
 *
 * Safe against SSR / disabled storage. Falls back to in-memory state if
 * localStorage isn't available (e.g., private mode).
 */

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // ignore
    }
    return initialValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / disabled
    }
  }, [key, value]);

  const update = useCallback((next: T) => setValue(next), []);
  return [value, update];
}
