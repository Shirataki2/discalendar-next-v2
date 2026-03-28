/**
 * Supabase Realtime同期フック
 *
 * タスク3: Supabase Realtimeチャネルの購読管理・イベントルーティング・
 * ライフサイクル管理・ミューテーション追跡による競合回避
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1-3.6, 4.1, 4.3, 5.1-5.4
 */
import type {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  handleRealtimeDelete,
  handleRealtimeInsert,
  handleRealtimeUpdate,
} from "@/lib/calendar/realtime-handler";
import type { CalendarEvent, EventRecord } from "@/lib/calendar/types";
import type { CalendarActions } from "./use-calendar-state";

// ─── 型定義 ──────────────────────────────────────────

type RealtimeSyncStatus = "disconnected" | "connecting" | "connected" | "error";

export interface UseRealtimeSyncParams {
  guildId: string | null;
  supabase: Pick<SupabaseClient, "channel" | "removeChannel">;
  events: CalendarEvent[];
  actions: CalendarActions;
  onRefetchNeeded: () => void;
}

export interface UseRealtimeSyncReturn {
  status: RealtimeSyncStatus;
  trackMutationStart: (entityId: string) => void;
  trackMutationEnd: (entityId: string) => void;
}

// ─── 定数 ──────────────────────────────────────────

const REFETCH_DEBOUNCE_MS = 200;

// ─── フック ──────────────────────────────────────────

export function useRealtimeSync({
  guildId,
  supabase,
  events,
  actions,
  onRefetchNeeded,
}: UseRealtimeSyncParams): UseRealtimeSyncReturn {
  const [status, setStatus] = useState<RealtimeSyncStatus>("disconnected");

  // 最新のeventsをrefで保持（コールバック内でstale closureを回避）
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // 最新のactionsをrefで保持
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // 最新のonRefetchNeededをrefで保持
  const onRefetchNeededRef = useRef(onRefetchNeeded);
  onRefetchNeededRef.current = onRefetchNeeded;

  // 進行中ミューテーションのエンティティID
  const pendingMutationIdsRef = useRef(new Set<string>());

  // リフェッチのデバウンスタイマー
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // デバウンスされたリフェッチトリガー
  const triggerRefetch = useCallback(() => {
    if (refetchTimerRef.current) {
      clearTimeout(refetchTimerRef.current);
    }
    refetchTimerRef.current = setTimeout(() => {
      onRefetchNeededRef.current();
      refetchTimerRef.current = null;
    }, REFETCH_DEBOUNCE_MS);
  }, []);

  // ─── eventsテーブル変更ハンドラー ──────────────

  const handleEventChange = useCallback(
    (payload: RealtimePostgresChangesPayload<EventRecord>) => {
      const { eventType } = payload;

      // DELETEの場合: ローカルstateに該当IDがなければ無視（他ギルドのDELETE）
      if (eventType === "DELETE") {
        const deletedId = (payload.old as Partial<EventRecord>).id;
        if (!deletedId) return;

        // 進行中ミューテーションのIDは保留
        if (pendingMutationIdsRef.current.has(deletedId)) return;

        const currentEvents = eventsRef.current;
        const exists = currentEvents.some((e) => e.id === deletedId);
        if (!exists) return;

        const updated = handleRealtimeDelete(currentEvents, {
          id: deletedId,
        });
        actionsRef.current.setEvents(updated);
        return;
      }

      // INSERT/UPDATE: series_id非nullの場合はリフェッチ
      const record = payload.new as EventRecord;
      if (record.series_id) {
        triggerRefetch();
        return;
      }

      // 進行中ミューテーションのIDは保留
      if (pendingMutationIdsRef.current.has(record.id)) return;

      const currentEvents = eventsRef.current;

      if (eventType === "INSERT") {
        const updated = handleRealtimeInsert(currentEvents, record);
        actionsRef.current.setEvents(updated);
      } else if (eventType === "UPDATE") {
        const updated = handleRealtimeUpdate(currentEvents, record);
        actionsRef.current.setEvents(updated);
      }
    },
    [triggerRefetch],
  );

  // ─── event_seriesテーブル変更ハンドラー ────────

  const handleSeriesChange = useCallback(() => {
    triggerRefetch();
  }, [triggerRefetch]);

  // ─── チャネル購読管理 ──────────────────────────

  useEffect(() => {
    if (!guildId) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");

    const channel = supabase.channel(`realtime-sync:${guildId}`);

    // events テーブル購読
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `guild_id=eq.${guildId}`,
        },
        handleEventChange,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `guild_id=eq.${guildId}`,
        },
        handleEventChange,
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "events",
          filter: `guild_id=eq.${guildId}`,
        },
        handleEventChange,
      );

    // event_series テーブル購読
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_series",
          filter: `guild_id=eq.${guildId}`,
        },
        handleSeriesChange,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "event_series",
          filter: `guild_id=eq.${guildId}`,
        },
        handleSeriesChange,
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "event_series",
          filter: `guild_id=eq.${guildId}`,
        },
        handleSeriesChange,
      );

    // 購読開始
    let wasConnected = false;
    channel.subscribe((subscribeStatus: string) => {
      if (subscribeStatus === "SUBSCRIBED") {
        if (wasConnected) {
          // 再接続時: 切断中に失われたイベントを取得
          triggerRefetch();
        }
        wasConnected = true;
        setStatus("connected");
      } else if (subscribeStatus === "CHANNEL_ERROR") {
        setStatus("error");
      } else if (
        subscribeStatus === "TIMED_OUT" ||
        subscribeStatus === "CLOSED"
      ) {
        setStatus("disconnected");
      }
    });

    // クリーンアップ
    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [guildId, supabase, handleEventChange, handleSeriesChange]);

  // ─── visibilitychange監視 ──────────────────────

  useEffect(() => {
    if (!guildId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // タブ復帰時は即時リフェッチ（デバウンスなし）。
        // Realtime由来のtriggerRefetchは200msデバウンスだが、
        // タブ復帰はユーザーの明示的操作であり即座にデータを最新化する。
        onRefetchNeededRef.current();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [guildId]);

  // ─── ミューテーション追跡 ─────────────────────

  const trackMutationStart = useCallback((entityId: string) => {
    pendingMutationIdsRef.current.add(entityId);
  }, []);

  const trackMutationEnd = useCallback(
    (entityId: string) => {
      pendingMutationIdsRef.current.delete(entityId);
      triggerRefetch();
    },
    [triggerRefetch],
  );

  return {
    status,
    trackMutationStart,
    trackMutationEnd,
  };
}
