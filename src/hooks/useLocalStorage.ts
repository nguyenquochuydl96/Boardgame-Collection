import { useState, useEffect, useCallback } from 'react';
import { loadFromStorage, saveToStorage } from '../lib/storage';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() =>
    loadFromStorage<T>(key, initialValue)
  );

  useEffect(() => {
    saveToStorage<T>(key, storedValue);
  }, [key, storedValue]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        saveToStorage<T>(key, nextValue);
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue] as const;
}

export default useLocalStorage;
