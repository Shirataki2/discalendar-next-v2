"use client";

/**
 * EventDialog - 予定作成・編集ダイアログコンポーネント
 *
 * タスク5.2: 予定作成・編集ダイアログコンポーネントを作成する
 * - 新規作成モードと編集モードを切り替えられるダイアログを実装する
 * - 初期値（期間選択時の開始・終了日時、編集時の既存データ）を受け取る
 * - EventFormコンポーネントを内包し、フォーム送信を処理する
 * - 保存成功時にダイアログを閉じて親に通知する
 * - キャンセル時やダイアログ外クリック時に入力内容を破棄して閉じる
 *
 * タスク7.4: 編集・削除スコープ操作のフック統合
 * - スコープ付き編集時にupdateOccurrenceActionを呼び出す
 * - スコープに応じて適切なServer Actionを呼び出す
 * - SERIES_NOT_FOUND / RRULE_PARSE_ERRORエラーに対応する
 *
 * Requirements: 1.3, 1.5, 1.7, 3.1, 3.2, 3.4, 3.6, 5.2, 6.1, 6.2, 7.1
 */

import { useCallback, useState } from "react";
import {
  createRecurringEventAction,
  updateOccurrenceAction,
} from "@/app/dashboard/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EventFormData } from "@/hooks/calendar/use-event-form";
import { useEventMutation } from "@/hooks/calendar/use-event-mutation";
import type { RecurrenceFormData } from "@/hooks/calendar/use-recurrence-form";
import { getChangedEventFields, trackEvent } from "@/lib/analytics/events";
import type {
  CreateEventInput,
  CreateSeriesInput,
  UpdateEventInput,
  UpdateSeriesInput,
} from "@/lib/calendar/event-service";
import { buildRruleString } from "@/lib/calendar/rrule-utils";
import type { EditScope } from "@/lib/calendar/types";
import { EventForm } from "./event-form";

/**
 * EventFormDataをCreateEventInputに変換する
 */
function toCreateEventInput(
  guildId: string,
  data: EventFormData
): CreateEventInput {
  return {
    guildId,
    title: data.title,
    startAt: data.startAt,
    endAt: data.endAt,
    description: data.description || undefined,
    isAllDay: data.isAllDay,
    color: data.color,
    location: data.location || undefined,
    notifications: data.notifications,
  };
}

/**
 * EventFormDataをUpdateEventInputに変換する
 */
function toUpdateEventInput(data: EventFormData): UpdateEventInput {
  return {
    title: data.title,
    startAt: data.startAt,
    endAt: data.endAt,
    description: data.description || undefined,
    isAllDay: data.isAllDay,
    color: data.color,
    location: data.location || undefined,
    notifications: data.notifications,
  };
}

/**
 * EventFormDataと繰り返し設定からUpdateSeriesInputに変換する
 */
function toUpdateSeriesInput(
  data: EventFormData,
  recurrence: RecurrenceFormData,
  resetExceptions: boolean
): UpdateSeriesInput {
  const input: UpdateSeriesInput = {
    title: data.title,
    startAt: data.startAt,
    endAt: data.endAt,
    description: data.description || undefined,
    isAllDay: data.isAllDay,
    color: data.color,
    location: data.location || undefined,
    notifications: data.notifications,
    resetExceptions,
  };

  // 繰り返し設定が有効な場合、RRULEを再生成
  if (recurrence.isRecurring) {
    input.rrule = buildRruleString({
      frequency: recurrence.frequency,
      interval: recurrence.interval,
      byDay: recurrence.byDay.length > 0 ? recurrence.byDay : undefined,
      monthlyMode:
        recurrence.frequency === "monthly" ? recurrence.monthlyMode : undefined,
      endCondition: recurrence.endCondition,
      dtstart: data.startAt,
    });
  }

  return input;
}

/**
 * EventFormDataと繰り返し設定からCreateSeriesInputに変換する
 */
function toCreateSeriesInput(
  guildId: string,
  data: EventFormData,
  recurrence: RecurrenceFormData
): CreateSeriesInput {
  return {
    guildId,
    title: data.title,
    startAt: data.startAt,
    endAt: data.endAt,
    description: data.description || undefined,
    isAllDay: data.isAllDay,
    color: data.color,
    location: data.location || undefined,
    notifications: data.notifications,
    rrule: buildRruleString({
      frequency: recurrence.frequency,
      interval: recurrence.interval,
      byDay: recurrence.byDay.length > 0 ? recurrence.byDay : undefined,
      monthlyMode:
        recurrence.frequency === "monthly" ? recurrence.monthlyMode : undefined,
      endCondition: recurrence.endCondition,
      dtstart: data.startAt,
    }),
  };
}

/**
 * EventDialogコンポーネントのProps
 */
export type EventDialogProps = {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログモード（create: 新規作成, edit: 編集） */
  mode: "create" | "edit";
  /** ギルドID */
  guildId: string;
  /** 初期値（期間選択時の開始・終了日時、編集時の既存データ） */
  initialData?: Partial<EventFormData>;
  /** 繰り返し設定の初期値 */
  recurrenceDefaultValues?: Partial<RecurrenceFormData>;
  /** 編集時のイベントID */
  eventId?: string;
  /** ダイアログを閉じるときのコールバック */
  onClose: () => void;
  /** 保存成功時のコールバック */
  onSuccess: () => void;
  /** 繰り返しイベントの編集スコープ（Task 7.4） */
  editScope?: EditScope;
  /** 繰り返しイベントのシリーズID（Task 7.4） */
  seriesId?: string;
  /** 編集対象オカレンスの日付（Task 7.4） */
  occurrenceDate?: Date;
  /** 例外リセットフラグ（Task 7.4、scope="all"時のみ有効） */
  resetExceptions?: boolean;
};

/**
 * 予定作成・編集ダイアログコンポーネント
 *
 * 新規作成モードと編集モードを切り替えて使用できます。
 * EventFormコンポーネントを内包し、フォーム送信時に
 * Server Actions経由でCRUD操作を実行します。
 *
 * スコープ付き編集（editScope指定時）は、updateOccurrenceAction
 * を呼び出して繰り返しイベントの部分・全体・以降編集を行います。
 */
export function EventDialog({
  open,
  mode,
  guildId,
  initialData,
  recurrenceDefaultValues,
  eventId,
  onClose,
  onSuccess,
  editScope,
  seriesId,
  occurrenceDate,
  resetExceptions = false,
}: EventDialogProps) {
  // エラー状態
  const [error, setError] = useState<string | null>(null);
  // シリーズ作成中のローディング状態
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);
  // スコープ付き更新中のローディング状態
  const [isScopedUpdating, setIsScopedUpdating] = useState(false);

  // useEventMutation hook for CRUD operations (Server Actions経由)
  const { state, createEvent, updateEvent } = useEventMutation(guildId);

  // ダイアログタイトル
  const dialogTitle = mode === "create" ? "新規予定作成" : "予定を編集";
  const dialogDescription =
    mode === "create"
      ? "新しい予定の詳細を入力してください"
      : "予定の詳細を編集してください";

  // 送信中かどうか
  const isSubmitting =
    state.isCreating ||
    state.isUpdating ||
    isCreatingSeries ||
    isScopedUpdating;

  // スコープ付き編集かどうか
  const isScopedEdit = mode === "edit" && editScope && seriesId;

  /**
   * 操作結果を処理する共通ハンドラー
   */
  const handleResult = useCallback(
    (
      opResult: { success: boolean; error?: { message: string } },
      onSuccessAction: () => void
    ) => {
      if (opResult.success) {
        onSuccessAction();
        onSuccess();
        onClose();
      } else {
        setError(opResult.error?.message ?? "不明なエラーが発生しました。");
      }
    },
    [onSuccess, onClose]
  );

  /**
   * Task 7.4: スコープ付き編集を実行する
   */
  const handleScopedEdit = useCallback(
    async (data: EventFormData, recurrence: RecurrenceFormData) => {
      if (!(editScope && seriesId)) {
        return false;
      }
      setIsScopedUpdating(true);
      try {
        const eventData =
          editScope === "this"
            ? toUpdateEventInput(data)
            : toUpdateSeriesInput(data, recurrence, resetExceptions);

        const result = await updateOccurrenceAction({
          guildId,
          seriesId,
          scope: editScope,
          occurrenceDate: occurrenceDate ?? data.startAt,
          eventData,
        });
        handleResult(result, () => {
          trackEvent("event_updated", {
            scope: editScope,
            changed_fields: getChangedEventFields(initialData ?? {}, data),
          });
        });
      } finally {
        setIsScopedUpdating(false);
      }
      return true;
    },
    [
      editScope,
      seriesId,
      guildId,
      occurrenceDate,
      resetExceptions,
      initialData,
      handleResult,
    ]
  );

  /**
   * フォーム送信ハンドラー
   */
  const handleSubmit = useCallback(
    async (data: EventFormData, recurrence: RecurrenceFormData) => {
      setError(null);

      if (mode === "edit") {
        if (await handleScopedEdit(data, recurrence)) {
          return;
        }

        // 通常の単発イベント編集
        if (!eventId) {
          setError("イベントIDが指定されていません。");
          return;
        }
        const result = await updateEvent(eventId, toUpdateEventInput(data));
        handleResult(result, () => {
          trackEvent("event_updated", {
            changed_fields: getChangedEventFields(initialData ?? {}, data),
          });
        });
        return;
      }

      // 繰り返し設定が有効な場合、シリーズとして作成（Server Action経由）
      if (recurrence.isRecurring) {
        setIsCreatingSeries(true);
        try {
          const input = toCreateSeriesInput(guildId, data, recurrence);
          const result = await createRecurringEventAction({
            guildId,
            eventData: input,
          });
          handleResult(result, () => {
            trackEvent("event_created", {
              is_all_day: data.isAllDay,
              color: data.color,
              has_notifications: data.notifications.length > 0,
              is_recurring: true,
              frequency: recurrence.frequency,
            });
          });
        } finally {
          setIsCreatingSeries(false);
        }
        return;
      }

      const result = await createEvent(toCreateEventInput(guildId, data));
      handleResult(result, () => {
        trackEvent("event_created", {
          is_all_day: data.isAllDay,
          color: data.color,
          has_notifications: data.notifications.length > 0,
        });
      });
    },
    [
      mode,
      guildId,
      eventId,
      initialData,
      handleScopedEdit,
      handleResult,
      createEvent,
      updateEvent,
    ]
  );

  /**
   * キャンセルハンドラー
   */
  const handleCancel = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  /**
   * ダイアログの開閉変更ハンドラー
   * ダイアログ外クリック時やEscキー押下時に呼ばれる
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setError(null);
        onClose();
      }
    },
    [onClose]
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent aria-describedby="event-dialog-description">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription id="event-dialog-description">
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {/* エラーメッセージ */}
        {error ? (
          <div
            className="rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {/* イベントフォーム */}
        <EventForm
          defaultValues={initialData}
          hideRecurrence={Boolean(isScopedEdit) && editScope === "this"}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          recurrenceDefaultValues={recurrenceDefaultValues}
        />
      </DialogContent>
    </Dialog>
  );
}
