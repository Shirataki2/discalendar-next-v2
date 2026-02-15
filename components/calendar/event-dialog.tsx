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
 * Requirements: 1.3, 1.5, 1.7, 3.1, 3.2, 3.4, 3.6
 */

import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EventFormData } from "@/hooks/calendar/use-event-form";
import { useEventMutation } from "@/hooks/calendar/use-event-mutation";
import type {
  CreateEventInput,
  EventServiceInterface,
  UpdateEventInput,
} from "@/lib/calendar/event-service";
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
 * EventDialogコンポーネントのProps
 */
export type EventDialogProps = {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログモード（create: 新規作成, edit: 編集） */
  mode: "create" | "edit";
  /** ギルドID */
  guildId: string;
  /** EventServiceインスタンス */
  eventService: EventServiceInterface;
  /** 初期値（期間選択時の開始・終了日時、編集時の既存データ） */
  initialData?: Partial<EventFormData>;
  /** 編集時のイベントID */
  eventId?: string;
  /** ダイアログを閉じるときのコールバック */
  onClose: () => void;
  /** 保存成功時のコールバック */
  onSuccess: () => void;
};

/**
 * 予定作成・編集ダイアログコンポーネント
 *
 * 新規作成モードと編集モードを切り替えて使用できます。
 * EventFormコンポーネントを内包し、フォーム送信時に
 * EventServiceを使用してCRUD操作を実行します。
 *
 * @example
 * ```tsx
 * // 新規作成モード
 * <EventDialog
 *   open={isOpen}
 *   mode="create"
 *   guildId="guild-123"
 *   eventService={eventService}
 *   initialData={{ startAt: new Date(), endAt: new Date() }}
 *   onClose={() => setIsOpen(false)}
 *   onSuccess={() => refetchEvents()}
 * />
 *
 * // 編集モード
 * <EventDialog
 *   open={isOpen}
 *   mode="edit"
 *   guildId="guild-123"
 *   eventService={eventService}
 *   eventId="event-123"
 *   initialData={existingEvent}
 *   onClose={() => setIsOpen(false)}
 *   onSuccess={() => refetchEvents()}
 * />
 * ```
 */
export function EventDialog({
  open,
  mode,
  guildId,
  eventService,
  initialData,
  eventId,
  onClose,
  onSuccess,
}: EventDialogProps) {
  // エラー状態
  const [error, setError] = useState<string | null>(null);

  // useEventMutation hook for CRUD operations
  const { state, createEvent, updateEvent } = useEventMutation(eventService);

  // ダイアログタイトル
  const dialogTitle = mode === "create" ? "新規予定作成" : "予定を編集";
  const dialogDescription =
    mode === "create"
      ? "新しい予定の詳細を入力してください"
      : "予定の詳細を編集してください";

  // 送信中かどうか
  const isSubmitting = state.isCreating || state.isUpdating;

  /**
   * フォーム送信ハンドラー
   */
  const handleSubmit = useCallback(
    async (data: EventFormData) => {
      setError(null);

      // 編集モードでeventIdがない場合はエラー
      if (mode === "edit" && !eventId) {
        setError("イベントIDが指定されていません。");
        return;
      }

      const result =
        mode === "create"
          ? await createEvent(toCreateEventInput(guildId, data))
          : await updateEvent(eventId as string, toUpdateEventInput(data));

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error.message);
      }
    },
    [mode, guildId, eventId, createEvent, updateEvent, onSuccess, onClose]
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
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
