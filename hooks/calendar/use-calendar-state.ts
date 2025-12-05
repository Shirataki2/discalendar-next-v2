/**
 * カレンダー状態管理フック
 *
 * タスク3.1: カレンダー状態管理フックの作成
 * - ビューモード（day/week/month）の状態管理
 * - 選択日付の状態管理
 * - ローディング状態とエラー状態の管理
 * - デフォルトで月ビューを表示する初期状態
 *
 * Requirements: 1.4, 5.3
 */
import { useCallback, useMemo, useState } from "react";
import type { CalendarError, CalendarEvent } from "@/lib/calendar";

/**
 * ビューモードの型定義
 * react-big-calendarのView型と互換
 */
export type ViewMode = "day" | "week" | "month";

/**
 * カレンダー状態の型定義
 */
export interface CalendarState {
  /** 現在のビューモード */
  viewMode: ViewMode;
  /** 選択中の日付 */
  selectedDate: Date;
  /** 表示中のイベント一覧 */
  events: CalendarEvent[];
  /** ローディング状態 (Req 5.3) */
  isLoading: boolean;
  /** エラー状態 (Req 5.3) */
  error: CalendarError | null;
}

/**
 * カレンダー状態操作アクション
 */
export interface CalendarActions {
  /** ビューモードを変更 */
  setViewMode: (mode: ViewMode) => void;
  /** 選択日付を変更 */
  setSelectedDate: (date: Date) => void;
  /** 今日に移動 */
  navigateToToday: () => void;
  /** ローディング状態を設定 */
  setLoading: (loading: boolean) => void;
  /** エラーを設定 */
  setError: (error: CalendarError) => void;
  /** エラーをクリア */
  clearError: () => void;
  /** イベントを設定 */
  setEvents: (events: CalendarEvent[]) => void;
  /** イベントをクリア */
  clearEvents: () => void;
  /** データ取得開始（ローディング開始、エラークリア） */
  startFetching: () => void;
  /** データ取得成功（イベント設定、ローディング終了） */
  completeFetchingSuccess: (events: CalendarEvent[]) => void;
  /** データ取得失敗（エラー設定、ローディング終了） */
  completeFetchingError: (error: CalendarError) => void;
}

/**
 * フック初期化オプション
 */
export interface UseCalendarStateOptions {
  /** 初期ビューモード（デフォルト: month、Req 1.4） */
  initialViewMode?: ViewMode;
  /** 初期選択日付（デフォルト: 今日） */
  initialDate?: Date;
}

/**
 * フック戻り値の型
 */
export interface UseCalendarStateReturn {
  /** カレンダー状態 */
  state: CalendarState;
  /** 状態操作アクション */
  actions: CalendarActions;
}

/**
 * カレンダー状態管理フック
 *
 * カレンダーコンポーネントの状態（ビューモード、日付、イベント、
 * ローディング、エラー）を管理する。
 *
 * @param options - 初期化オプション
 * @returns 状態とアクション
 *
 * @example
 * ```tsx
 * const { state, actions } = useCalendarState();
 *
 * // ビューモードを変更
 * actions.setViewMode('week');
 *
 * // データ取得フロー
 * actions.startFetching();
 * const result = await fetchEvents(...);
 * if (result.success) {
 *   actions.completeFetchingSuccess(result.data);
 * } else {
 *   actions.completeFetchingError(result.error);
 * }
 * ```
 */
export function useCalendarState(
  options: UseCalendarStateOptions = {}
): UseCalendarStateReturn {
  const { initialViewMode = "month", initialDate = new Date() } = options;

  // 状態管理
  const [viewMode, setViewModeState] = useState<ViewMode>(initialViewMode);
  const [selectedDate, setSelectedDateState] = useState<Date>(initialDate);
  const [events, setEventsState] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoadingState] = useState(false);
  const [error, setErrorState] = useState<CalendarError | null>(null);

  // アクション定義
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateState(date);
  }, []);

  const navigateToToday = useCallback(() => {
    setSelectedDateState(new Date());
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoadingState(loading);
  }, []);

  const setError = useCallback((err: CalendarError) => {
    setErrorState(err);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const setEvents = useCallback((newEvents: CalendarEvent[]) => {
    setEventsState(newEvents);
  }, []);

  const clearEvents = useCallback(() => {
    setEventsState([]);
  }, []);

  // 複合アクション
  const startFetching = useCallback(() => {
    setIsLoadingState(true);
    setErrorState(null);
  }, []);

  const completeFetchingSuccess = useCallback((newEvents: CalendarEvent[]) => {
    setEventsState(newEvents);
    setIsLoadingState(false);
    setErrorState(null);
  }, []);

  const completeFetchingError = useCallback((err: CalendarError) => {
    setErrorState(err);
    setIsLoadingState(false);
  }, []);

  // actions オブジェクトをメモ化して、不要な再レンダリングを防ぐ
  const actions = useMemo(
    () => ({
      setViewMode,
      setSelectedDate,
      navigateToToday,
      setLoading,
      setError,
      clearError,
      setEvents,
      clearEvents,
      startFetching,
      completeFetchingSuccess,
      completeFetchingError,
    }),
    [
      setViewMode,
      setSelectedDate,
      navigateToToday,
      setLoading,
      setError,
      clearError,
      setEvents,
      clearEvents,
      startFetching,
      completeFetchingSuccess,
      completeFetchingError,
    ]
  );

  return {
    state: {
      viewMode,
      selectedDate,
      events,
      isLoading,
      error,
    },
    actions,
  };
}
