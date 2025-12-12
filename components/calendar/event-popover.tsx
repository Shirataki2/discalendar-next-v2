/**
 * EventPopover - イベント詳細ポップオーバーコンポーネント
 *
 * タスク7.1: EventPopoverコンポーネントの作成
 * - shadcn/ui Popoverをベースにイベント詳細表示を実装する
 * - イベント名、開始/終了日時、説明文を表示する
 * - 終日イベントの場合は時刻ではなく「終日」と表示する
 * - 場所情報とDiscordチャンネル情報を条件付きで表示する
 *
 * タスク7.2: ポップオーバーの表示位置と閉じ動作
 * - クリックしたイベント要素の近くにポップオーバーを表示する
 * - 画面端での表示位置を自動調整し、はみ出しを防止する
 * - ポップオーバー外クリックで閉じる動作を実装する
 * - Escキー押下で閉じる動作を実装する
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.5
 */
"use client";

import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, Clock, Hash, MapPin, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import type { CalendarEvent } from "@/lib/calendar/types";

/**
 * EventPopoverのProps
 */
export type EventPopoverProps = {
  /** 表示対象のイベント */
  event: CalendarEvent | null;
  /** ポップオーバーの開閉状態 */
  open: boolean;
  /** 閉じるハンドラー */
  onClose: () => void;
  /** アンカー要素（オプション） */
  anchorElement?: HTMLElement | null;
  /** 編集ハンドラー（オプション） */
  onEdit?: (event: CalendarEvent) => void;
  /** 削除ハンドラー（オプション） */
  onDelete?: (event: CalendarEvent) => void;
};

/**
 * 日付をフォーマットする
 * @param date - 日付オブジェクト
 * @returns フォーマットされた日付文字列（例: "2025年12月5日"）
 */
function formatDate(date: Date): string {
  return format(date, "yyyy年M月d日", { locale: ja });
}

/**
 * 時刻をフォーマットする
 * @param date - 日付オブジェクト
 * @returns フォーマットされた時刻文字列（例: "14:00"）
 */
function formatTime(date: Date): string {
  return format(date, "HH:mm", { locale: ja });
}

/**
 * イベントの日時表示を生成
 * @param event - カレンダーイベント
 * @returns 日時表示用のReact要素
 */
function formatEventDateTime(event: CalendarEvent): React.ReactNode {
  const { start, end, allDay } = event;
  const sameDay = isSameDay(start, end);

  if (allDay) {
    // 終日イベントの場合
    if (sameDay) {
      return (
        <>
          <span>{formatDate(start)}</span>
          <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">
            終日
          </span>
        </>
      );
    }
    return (
      <>
        <span>{formatDate(start)}</span>
        <span className="mx-1">-</span>
        <span>{formatDate(end)}</span>
        <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">終日</span>
      </>
    );
  }

  // 時間指定イベントの場合
  if (sameDay) {
    return (
      <>
        <span>{formatDate(start)}</span>
        <span className="ml-2">
          {formatTime(start)} - {formatTime(end)}
        </span>
      </>
    );
  }

  return (
    <>
      <span>
        {formatDate(start)} {formatTime(start)}
      </span>
      <span className="mx-1">-</span>
      <span>
        {formatDate(end)} {formatTime(end)}
      </span>
    </>
  );
}

/**
 * EventPopover コンポーネント
 *
 * イベント詳細情報をポップオーバーで表示する。
 *
 * @param props - コンポーネントのProps
 *
 * @example
 * ```tsx
 * <EventPopover
 *   event={selectedEvent}
 *   open={isPopoverOpen}
 *   onClose={() => setIsPopoverOpen(false)}
 * />
 * ```
 */
export function EventPopover({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
}: EventPopoverProps) {
  /**
   * Escキー押下時のハンドラー
   * 注: hooksはコンポーネントのトップレベルで呼び出す必要がある
   */
  const handleEscapeKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    },
    [onClose, open]
  );

  /**
   * 編集ボタンクリック時のハンドラー
   */
  const handleEdit = useCallback(() => {
    if (event && onEdit) {
      onEdit(event);
    }
  }, [event, onEdit]);

  /**
   * 削除ボタンクリック時のハンドラー
   */
  const handleDelete = useCallback(() => {
    if (event && onDelete) {
      onDelete(event);
    }
  }, [event, onDelete]);

  // Escキーイベントのリスナーを設定
  useEffect(() => {
    if (!open) {
      return;
    }

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [handleEscapeKey, open]);

  // イベントがない場合、またはopenがfalseの場合は何も表示しない
  if (!(event && open)) {
    return null;
  }

  return (
    <Popover onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <PopoverContent
        aria-label={`${event.title}の詳細`}
        className="w-80"
        data-testid="event-popover"
        onInteractOutside={onClose}
        role="dialog"
      >
        {/* ヘッダー: イベント名と閉じるボタン */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            {/* カラーインジケーター */}
            <div
              className="mt-1 h-4 w-4 shrink-0 rounded"
              data-testid="event-color-indicator"
              style={{ backgroundColor: event.color }}
            />
            <h3 className="font-semibold leading-tight">{event.title}</h3>
          </div>
          <button
            aria-label="閉じる"
            className="shrink-0 rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="mt-3 space-y-3">
          {/* 日時 */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {event.allDay ? (
              <Calendar className="h-4 w-4 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 shrink-0" />
            )}
            <div className="flex flex-wrap items-center">
              {formatEventDateTime(event)}
            </div>
          </div>

          {/* 場所 (Req 4.3) */}
          {event.location ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>場所: {event.location}</span>
            </div>
          ) : null}

          {/* Discordチャンネル (Req 4.4) */}
          {event.channel ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Hash className="h-4 w-4 shrink-0" />
              <span>チャンネル: #{event.channel.name}</span>
            </div>
          ) : null}

          {/* 説明文 (Req 4.2) */}
          {event.description ? (
            <div className="border-t pt-3">
              <p className="text-muted-foreground text-sm">説明:</p>
              <p className="mt-1 text-sm">{event.description}</p>
            </div>
          ) : null}

          {/* 編集・削除ボタン (Task 6.1) */}
          {onEdit || onDelete ? (
            <div className="flex gap-2 border-t pt-3">
              {onEdit ? (
                <Button
                  className="flex-1"
                  data-testid="event-edit-button"
                  onClick={handleEdit}
                  size="sm"
                  variant="outline"
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  編集
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  className="flex-1"
                  data-testid="event-delete-button"
                  onClick={handleDelete}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  削除
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
