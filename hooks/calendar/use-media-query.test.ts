/**
 * useMediaQuery テストスイート
 *
 * タスク8.1: デスクトップとタブレット向けレイアウト
 * タスク8.2: モバイル向けレイアウトとデフォルトビュー
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BREAKPOINTS,
  useBreakpoint,
  useMediaQuery,
} from "./use-media-query";

describe("useMediaQuery", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;
  let listeners: Map<string, (event: { matches: boolean }) => void>;

  beforeEach(() => {
    listeners = new Map();

    matchMediaMock = vi.fn((query: string) => {
      const mediaQueryList = {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn((_, listener) => {
          listeners.set(query, listener);
        }),
        removeEventListener: vi.fn((_, listener) => {
          if (listeners.get(query) === listener) {
            listeners.delete(query);
          }
        }),
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };
      return mediaQueryList;
    });

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("基本機能", () => {
    it("メディアクエリが一致する場合trueを返す", () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        media: "(min-width: 768px)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(true);
    });

    it("メディアクエリが一致しない場合falseを返す", () => {
      matchMediaMock.mockReturnValue({
        matches: false,
        media: "(min-width: 1024px)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery("(min-width: 1024px)")
      );

      expect(result.current).toBe(false);
    });

    it("画面サイズ変更時に値が更新される", () => {
      let currentListener: ((event: { matches: boolean }) => void) | null =
        null;

      matchMediaMock.mockReturnValue({
        matches: false,
        media: "(min-width: 768px)",
        addEventListener: vi.fn((_, listener) => {
          currentListener = listener;
        }),
        removeEventListener: vi.fn(),
      });

      const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      expect(result.current).toBe(false);

      // 画面サイズ変更をシミュレート
      act(() => {
        currentListener?.({ matches: true });
      });

      expect(result.current).toBe(true);
    });

    it("アンマウント時にリスナーが削除される", () => {
      const removeEventListener = vi.fn();
      matchMediaMock.mockReturnValue({
        matches: false,
        media: "(min-width: 768px)",
        addEventListener: vi.fn(),
        removeEventListener,
      });

      const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));

      unmount();

      expect(removeEventListener).toHaveBeenCalled();
    });
  });
});

describe("useBreakpoint", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matchMediaMock = vi.fn();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Task 8.1: デスクトップとタブレット向けレイアウト", () => {
    it("デスクトップ画面（1024px以上）でisDesktopがtrueを返す (Req 6.1)", () => {
      // デスクトップ: 1024px以上
      matchMediaMock.mockImplementation((query: string) => ({
        matches:
          query === `(min-width: ${BREAKPOINTS.desktop}px)` ||
          query === `(min-width: ${BREAKPOINTS.tablet}px)`,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isMobile).toBe(false);
    });

    it("タブレット画面（768px-1024px未満）でisTabletがtrue, isDesktopがfalseを返す (Req 6.2)", () => {
      // タブレット: 768px以上、1024px未満
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query === `(min-width: ${BREAKPOINTS.tablet}px)`,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isMobile).toBe(false);
    });
  });

  describe("Task 8.2: モバイル向けレイアウト", () => {
    it("モバイル画面（768px未満）でisMobileがtrueを返す (Req 6.3)", () => {
      // モバイル: 768px未満
      matchMediaMock.mockImplementation((_query: string) => ({
        matches: false,
        media: _query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useBreakpoint());

      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isMobile).toBe(true);
    });
  });

  describe("ブレークポイント定数", () => {
    it("正しいブレークポイント値が定義されている", () => {
      expect(BREAKPOINTS.mobile).toBe(0);
      expect(BREAKPOINTS.tablet).toBe(768);
      expect(BREAKPOINTS.desktop).toBe(1024);
    });
  });
});
