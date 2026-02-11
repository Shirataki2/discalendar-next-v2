import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalStorage } from "@/hooks/use-local-storage";

// localStorage のモック
const store = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => {
    store.clear();
  }),
  get length() {
    return store.size;
  },
  key: vi.fn((_index: number) => null),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("useLocalStorage", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    store.clear();
  });

  it("should return the default value when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", false));
    expect(result.current[0]).toBe(false);
  });

  it("should return stored value from localStorage", () => {
    store.set("test-key", JSON.stringify(true));
    const { result } = renderHook(() => useLocalStorage("test-key", false));
    expect(result.current[0]).toBe(true);
  });

  it("should persist value to localStorage when set", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", false));

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "test-key",
      JSON.stringify(true)
    );
  });

  it("should support functional updates", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it("should return default value for invalid JSON in localStorage", () => {
    store.set("test-key", "not-valid-json");
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("should work with object values", () => {
    const defaultObj = { collapsed: false, theme: "light" };
    const { result } = renderHook(() =>
      useLocalStorage("test-obj", defaultObj)
    );

    act(() => {
      result.current[1]({ collapsed: true, theme: "dark" });
    });

    expect(result.current[0]).toEqual({ collapsed: true, theme: "dark" });
  });
});
