/**
 * イベントミューテーション操作を管理するカスタムフック
 *
 * タスク4.1: Server Actionsを使用したミューテーション操作を管理するカスタムフックを作成する
 * - 作成・更新・削除の各操作のローディング状態を管理する
 * - Server Actions経由でCRUD操作を実行する（権限チェック含む）
 * - 操作成功時と失敗時のコールバックをサポートする
 * - エラー状態の保持とクリア機能を提供する
 *
 * Requirements: 1.4, 3.3, 4.2
 */
import { useCallback, useState } from "react";
import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/app/dashboard/actions";
import type {
  CalendarError,
  CreateEventInput,
  MutationResult,
  UpdateEventInput,
} from "@/lib/calendar/event-service";
import type { CalendarEvent } from "@/lib/calendar/types";

/**
 * ミューテーション状態の型定義
 */
export interface MutationState {
  /** 作成中フラグ */
  isCreating: boolean;
  /** 更新中フラグ */
  isUpdating: boolean;
  /** 削除中フラグ */
  isDeleting: boolean;
  /** エラー状態 */
  error: CalendarError | null;
}

/**
 * useEventMutationフックのオプション
 */
export interface UseEventMutationOptions {
  /** 操作成功時のコールバック */
  onSuccess?: () => void;
  /** 操作失敗時のコールバック */
  onError?: (error: CalendarError) => void;
}

/**
 * useEventMutationフックの戻り値の型
 */
export interface UseEventMutationReturn {
  /** ミューテーション状態 */
  state: MutationState;
  /** イベント作成 */
  createEvent: (data: CreateEventInput) => Promise<MutationResult<CalendarEvent>>;
  /** イベント更新 */
  updateEvent: (id: string, data: UpdateEventInput) => Promise<MutationResult<CalendarEvent>>;
  /** イベント削除 */
  deleteEvent: (id: string) => Promise<MutationResult<void>>;
  /** エラー状態をクリア */
  clearError: () => void;
}

/**
 * イベントミューテーション操作を管理するカスタムフック
 *
 * Server Actions経由でイベントの作成・更新・削除を実行する。
 * Server Actions内で権限チェック（authorizeEventOperation）が行われるため、
 * クライアントサイドでの権限バイパスを防止する。
 *
 * @param guildId - ギルドID
 * @param options - オプション（成功・失敗コールバック）
 * @returns ミューテーション状態と操作メソッド
 *
 * @example
 * ```tsx
 * const { state, createEvent, updateEvent, deleteEvent, clearError } = useEventMutation(
 *   "guild-123",
 *   {
 *     onSuccess: () => {
 *       fetchEvents(); // イベント一覧を再取得
 *     },
 *     onError: (error) => {
 *       console.error("Operation failed:", error);
 *     },
 *   }
 * );
 *
 * // イベント作成
 * const result = await createEvent({
 *   guildId: "guild-123",
 *   title: "新しいイベント",
 *   startAt: new Date(),
 *   endAt: new Date(),
 * });
 *
 * if (result.success) {
 *   console.log("Created:", result.data);
 * }
 * ```
 */
export function useEventMutation(
  guildId: string,
  options?: UseEventMutationOptions
): UseEventMutationReturn {
  // ローディング状態
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // エラー状態
  const [error, setError] = useState<CalendarError | null>(null);

  /**
   * イベント作成
   */
  const createEvent = useCallback(
    async (data: CreateEventInput): Promise<MutationResult<CalendarEvent>> => {
      setIsCreating(true);
      setError(null);

      try {
        const result = await createEventAction({ guildId, eventData: data });

        if (result.success) {
          options?.onSuccess?.();
        } else {
          setError(result.error);
          options?.onError?.(result.error);
        }

        return result;
      } finally {
        setIsCreating(false);
      }
    },
    [guildId, options]
  );

  /**
   * イベント更新
   */
  const updateEvent = useCallback(
    async (
      id: string,
      data: UpdateEventInput
    ): Promise<MutationResult<CalendarEvent>> => {
      setIsUpdating(true);
      setError(null);

      try {
        const result = await updateEventAction({ guildId, eventId: id, eventData: data });

        if (result.success) {
          options?.onSuccess?.();
        } else {
          setError(result.error);
          options?.onError?.(result.error);
        }

        return result;
      } finally {
        setIsUpdating(false);
      }
    },
    [guildId, options]
  );

  /**
   * イベント削除
   */
  const deleteEvent = useCallback(
    async (id: string): Promise<MutationResult<void>> => {
      setIsDeleting(true);
      setError(null);

      try {
        const result = await deleteEventAction({ guildId, eventId: id });

        if (result.success) {
          options?.onSuccess?.();
        } else {
          setError(result.error);
          options?.onError?.(result.error);
        }

        return result;
      } finally {
        setIsDeleting(false);
      }
    },
    [guildId, options]
  );

  /**
   * エラー状態をクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    state: {
      isCreating,
      isUpdating,
      isDeleting,
      error,
    },
    createEvent,
    updateEvent,
    deleteEvent,
    clearError,
  };
}
