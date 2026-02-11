"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
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

  const getServerSnapshot = useCallback((): string | null => {
    return null;
  }, []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [localState, setLocalState] = useState<T>(() => {
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  const currentValue: T =
    raw === null
      ? localState
      : (() => {
          try {
            return JSON.parse(raw) as T;
          } catch {
            return defaultValue;
          }
        })();

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const nextValue =
          typeof value === "function"
            ? (value as (prev: T) => T)(currentValue)
            : value;
        window.localStorage.setItem(key, JSON.stringify(nextValue));
        setLocalState(nextValue);
        window.dispatchEvent(new StorageEvent("storage", { key }));
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
