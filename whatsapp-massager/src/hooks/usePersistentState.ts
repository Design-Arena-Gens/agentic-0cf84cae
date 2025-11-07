'use client';

import { useEffect, useState } from "react";

type Initializer<T> = T | (() => T);

export function usePersistentState<T>(key: string, initialValue: Initializer<T>) {
  const getInitialValue = () => {
    if (typeof window === "undefined") {
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
    }
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        return typeof initialValue === "function"
          ? (initialValue as () => T)()
          : initialValue;
      }
      return JSON.parse(stored) as T;
    } catch (_err) {
      console.warn(`[usePersistentState] Failed to parse value for ${key}`);
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
    }
  };

  const [value, setValue] = useState<T>(getInitialValue);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_err) {
      console.warn(`[usePersistentState] Failed to persist value for ${key}`);
    }
  }, [key, value]);

  return [value, setValue] as const;
}
