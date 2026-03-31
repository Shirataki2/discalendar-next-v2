/**
 * EventPopover - イベント詳細ポップオーバーコンポーネント
 *
 * タスク7.1: EventPopoverコンポーネントの作成
 * タスク7.2: ダイアログの表示位置と閉じ動作
 * タスク6.1: RsvpButtons と AttendeeList を EventPopover に組み込む
 * タスク6.2: 繰り返しイベントの RSVP に対応する
 * Task 6.2 (event-attachments): AttachmentDisplay を EventPopover に統合
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.5, 2.1, 3.1, 3.2, 6.1, 6.2, 6.3
 */
"use client";

import { format, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Calendar,
  Clock,
  Hash,
  Loader2,
  MapPin,
  Pencil,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import { useCallback } from "react";
import { getAttachmentUrlsAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAttachmentUrls } from "@/hooks/calendar/use-attachment-urls";
import { useRsvpData } from "@/hooks/calendar/use-rsvp-data";
import type { CalendarEvent } from "@/lib/calendar/types";
import { AttachmentDisplay } from "./attachment-display";
import { AttendeeList } from "./attendee-list";
import { RsvpButtons } from "./rsvp-buttons";

/**
 * EventPopoverのProps
 */
export type EventPopoverProps = {
  /** 表示対象のイベント */
  event: CalendarEvent | null;
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 閉じるハンドラー */
  onClose: () => void;
  /** アンカー要素（オプション） - 今回は使用しない */
  anchorElement?: HTMLElement | null;
  /** 編集ハンドラー（オプション） */
  onEdit?: (event: CalendarEvent) => void;
  /** 削除ハンドラー（オプション） */
  onDelete?: (event: CalendarEvent) => void;
  /** ギルドID（RSVP 機能用） */
  guildId?: string | null;
  /** 認証済みかどうか（RSVP 機能用） */
  isAuthenticated?: boolean;
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
 * イベント詳細情報をダイアログで表示する。
 * guildId が提供された場合、RSVP 機能（出欠ボタン・参加者一覧）と添付ファイルを表示する。
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: EventPopover renders multiple optional sections (recurrence, location, channel, description, attachments, RSVP, edit/delete) with inherent conditional complexity
export function EventPopover({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
  guildId,
  isAuthenticated = false,
}: EventPopoverProps) {
  const { attendeeData, showRsvp, rsvpIds, handleRsvpStatusChange } =
    useRsvpData(event, guildId, open);

  const hasAttachments =
    !!event?.attachments && event.attachments.length > 0 && !!guildId;

  const { attachmentsWithUrls, isLoading: isLoadingAttachments } =
    useAttachmentUrls({
      attachments: event?.attachments,
      guildId,
      enabled: open && hasAttachments,
      fetchUrls: getAttachmentUrlsAction,
    });

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

  // イベントがない場合は何も表示しない
  if (!event) {
    return null;
  }

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <DialogContent
        aria-describedby={undefined}
        aria-label={`${event.title}の詳細`}
        className="max-w-md [&[data-state=closed]]:animate-none [&[data-state=open]]:animate-none"
        data-testid="event-popover"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              {/* カラーインジケーター */}
              <div
                className="mt-1 h-4 w-4 shrink-0 rounded"
                data-testid="event-color-indicator"
                style={{ backgroundColor: event.color }}
              />
              <DialogTitle className="flex-1">{event.title}</DialogTitle>
            </div>
            {/* カスタム閉じるボタン */}
            <button
              aria-label="閉じる"
              className="shrink-0 rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {/* コンテンツ */}
        <div className="space-y-3">
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

          {/* 繰り返し情報 (recurring-events Req 4.3) */}
          {event.isRecurring === true && event.rruleSummary ? (
            <div
              className="flex items-center gap-2 text-muted-foreground text-sm"
              data-testid="recurrence-info"
            >
              <Repeat className="h-4 w-4 shrink-0" />
              <span>{event.rruleSummary}</span>
            </div>
          ) : null}

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

          {/* 添付ファイル (Task 6.2 event-attachments) */}
          {hasAttachments ? (
            <div className="border-t pt-3" data-testid="attachment-section">
              {isLoadingAttachments ? (
                <div
                  className="flex items-center justify-center py-2"
                  data-testid="attachment-loading"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <AttachmentDisplay attachments={attachmentsWithUrls} />
              )}
            </div>
          ) : null}

          {/* RSVP セクション (Task 6.1, 6.2) */}
          {/* biome-ignore lint/nursery/noLeakedRender: guildId and rsvpIds are string/object, checked via showRsvp boolean */}
          {showRsvp && guildId && rsvpIds ? (
            <div className="border-t pt-3" data-testid="rsvp-section">
              <RsvpButtons
                currentStatus={attendeeData?.currentUserStatus ?? null}
                eventId={rsvpIds.eventId}
                guildId={guildId}
                isAuthenticated={isAuthenticated}
                key={attendeeData?.currentUserStatus ?? "none"}
                occurrenceDate={rsvpIds.occurrenceDate}
                onStatusChange={handleRsvpStatusChange}
                seriesId={rsvpIds.seriesId}
              />
              <div className="mt-3">
                <AttendeeList
                  attendees={attendeeData?.attendees ?? []}
                  summary={
                    attendeeData?.summary ?? {
                      going: 0,
                      maybe: 0,
                      notGoing: 0,
                      total: 0,
                    }
                  }
                />
              </div>
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
      </DialogContent>
    </Dialog>
  );
}
