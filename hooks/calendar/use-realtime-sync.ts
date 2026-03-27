/**
 * Supabase Realtime同期フック
 *
 * タスク3: Supabase Realtimeチャネルの購読管理・イベントルーティング・
 * ライフサイクル管理・ミューテーション追跡による競合回避
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1-3.6, 4.1, 4.3, 5.1-5.4
 */
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
  supabase: {
    channel: (name: string) => RealtimeChannelLike;
    removeChannel: (channel: RealtimeChannelLike) => Promise<unknown>;
  };
  events: CalendarEvent[];
  actions: CalendarActions;
  onRefetchNeeded: () => void;
}

export interface UseRealtimeSyncReturn {
  status: RealtimeSyncStatus;
  trackMutationStart: (entityId: string) => void;
  trackMutationEnd: (entityId: string) => void;
}

interface RealtimeChannelLike {
  on: (
    type: string,
    opts: { event: string; schema: string; table: string; filter?: string },
    callback: (payload: Record<string, unknown>) => void,
  ) => RealtimeChannelLike;
  subscribe: (
    callback?: (status: string) => void,
  ) => RealtimeChannelLike;
  unsubscribe: () => Promise<unknown>;
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

  // 現在のチャネル参照
  const channelRef = useRef<RealtimeChannelLike | null>(null);

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
    (payload: Record<string, unknown>) => {
      const eventType = payload.eventType as string;
      const newRecord = payload.new as Record<string, unknown>;
      const oldRecord = payload.old as Record<string, unknown>;

      // DELETEの場合: ローカルstateに該当IDがなければ無視（他ギルドのDELETE）
      if (eventType === "DELETE") {
        const deletedId = (oldRecord as { id?: string }).id;
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
      const record = newRecord as unknown as EventRecord;
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
    channelRef.current = channel;

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
        },
        handleSeriesChange,
      );

    // 購読開始
    channel.subscribe((subscribeStatus: string) => {
      if (subscribeStatus === "SUBSCRIBED") {
        setStatus("connected");
      } else if (subscribeStatus === "CHANNEL_ERROR") {
        setStatus("error");
      }
    });

    // クリーンアップ
    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = null;
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [guildId, supabase, handleEventChange, handleSeriesChange]);

  // ─── visibilitychange監視 ──────────────────────

  useEffect(() => {
    if (!guildId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
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
