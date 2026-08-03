import { useCallback, useState } from 'react';

type Setter<T> = (value: T | ((prev: T) => T)) => void;

/** Persists state to `localStorage`, tolerating serialization failures gracefully. */
export function useLocalStorage<T>(key: string, initialValue: T): [T, Setter<T>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue: Setter<T> = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage unavailable (private mode, quota) — state still updates in memory.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, setStoredValue];
}
