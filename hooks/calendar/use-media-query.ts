/**
 * useMediaQuery - メディアクエリフック
 *
 * タスク8.1: デスクトップとタブレット向けレイアウト
 * タスク8.2: モバイル向けレイアウトとデフォルトビュー
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
import { useEffect, useState } from "react";

/**
 * ブレークポイント定義
 * - mobile: 0px - 767px
 * - tablet: 768px - 1023px
 * - desktop: 1024px以上
 */
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * useMediaQuery - メディアクエリの一致状態を監視するフック
 *
 * @param query - メディアクエリ文字列（例: "(min-width: 768px)"）
 * @returns メディアクエリが一致する場合はtrue、そうでない場合はfalse
 *
 * @example
 * ```tsx
 * const isTablet = useMediaQuery("(min-width: 768px)");
 * const isDesktop = useMediaQuery("(min-width: 1024px)");
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    // SSR対応: windowが存在しない場合はfalseを返す
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    // SSR対応
    if (typeof window === "undefined") {
      return;
    }

    const mediaQueryList = window.matchMedia(query);

    // 初期値を設定
    setMatches(mediaQueryList.matches);

    // メディアクエリの変更を監視
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // イベントリスナーを追加
    mediaQueryList.addEventListener("change", handleChange);

    // クリーンアップ
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * ブレークポイント状態の型定義
 */
export interface BreakpointState {
  /** デスクトップ画面（1024px以上） */
  isDesktop: boolean;
  /** タブレット画面（768px以上） */
  isTablet: boolean;
  /** モバイル画面（768px未満） */
  isMobile: boolean;
}

/**
 * useBreakpoint - 画面サイズに応じたブレークポイント状態を提供するフック
 *
 * @returns ブレークポイントの状態オブジェクト
 *
 * @example
 * ```tsx
 * const { isDesktop, isTablet, isMobile } = useBreakpoint();
 *
 * if (isMobile) {
 *   // モバイル向けレイアウト
 * } else if (isTablet && !isDesktop) {
 *   // タブレット向けレイアウト
 * } else {
 *   // デスクトップ向けレイアウト
 * }
 * ```
 */
export function useBreakpoint(): BreakpointState {
  const isTablet = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);

  return {
    isDesktop,
    isTablet,
    // モバイルはタブレット未満
    isMobile: !isTablet,
  };
}
