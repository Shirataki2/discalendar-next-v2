"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * SSRセーフな汎用 useLocalStorage フック
 *
 * localStorage の値を React state として管理し、永続化する。
 * SSR 時は defaultValue を返し、ハイドレーション後に localStorage の値を反映する。
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const getSnapshot = useCallback((): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [localState, setLocalState] = useState<T>(() => {
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  const currentValue = useMemo<T>(() => {
    if (raw === null) return localState;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }, [raw, localState, defaultValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const nextValue =
          typeof value === "function"
            ? (value as (prev: T) => T)(currentValue)
            : value;
        window.localStorage.setItem(key, JSON.stringify(nextValue));
        setLocalState(nextValue);
        window.dispatchEvent(
          new StorageEvent("storage", {
            key,
            newValue: JSON.stringify(nextValue),
          })
        );
      } catch {
        // localStorage が使えない場合はローカル state のみ更新
        const nextValue =
          typeof value === "function"
            ? (value as (prev: T) => T)(currentValue)
            : value;
        setLocalState(nextValue);
      }
    },
    [key, currentValue]
  );

  return [currentValue, setValue];
}
