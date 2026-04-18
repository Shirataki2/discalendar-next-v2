"use client";

import {
  REALTIME_LISTEN_TYPES,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import type { PollSnapshot } from "@/lib/polls/types";

const REALTIME_DEBOUNCE_MS = 300;
const POLLING_FALLBACK_MS = 30_000;

export type UsePollRealtimeOptions = {
  client: SupabaseClient;
  guildId: string;
  pollId: string;
  initialSnapshot: PollSnapshot;
  fetchSnapshot: () => Promise<PollSnapshot | null>;
};

export type UsePollRealtimeState = {
  snapshot: PollSnapshot;
  isLive: boolean;
};

/**
 * event_polls / options / votes の Realtime 変更を購読し、
 * 300ms デバウンスで fetchSnapshot を再実行する。
 * 接続断やタブ非表示では 30 秒ポーリングにフォールバックする。
 */
export function usePollRealtime(
  options: UsePollRealtimeOptions
): UsePollRealtimeState {
  const { client, guildId, pollId, initialSnapshot, fetchSnapshot } = options;

  const [snapshot, setSnapshot] = useState<PollSnapshot>(initialSnapshot);
  const [isLive, setIsLive] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(true);
  // effect クロージャで常に最新の isLive を参照するための ref
  const isLiveRef = useRef(false);
  const fetchSnapshotRef = useRef(fetchSnapshot);

  // effect 再実行を避けつつ最新参照を保つ
  isLiveRef.current = isLive;
  fetchSnapshotRef.current = fetchSnapshot;

  useEffect(() => {
    activeRef.current = true;

    const refresh = async () => {
      if (!activeRef.current) {
        return;
      }
      try {
        const next = await fetchSnapshotRef.current();
        if (next && activeRef.current) {
          setSnapshot(next);
        }
      } catch {
        // fetchSnapshot が失敗した場合は次のイベントまで待つ
      }
    };

    const scheduleRefresh = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void refresh();
      }, REALTIME_DEBOUNCE_MS);
    };

    const startPolling = () => {
      if (pollingTimerRef.current) {
        return;
      }
      pollingTimerRef.current = setInterval(() => {
        void refresh();
      }, POLLING_FALLBACK_MS);
    };

    const stopPolling = () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };

    const channel = client.channel(`polls:${guildId}:${pollId}`);

    const handleChange = () => {
      scheduleRefresh();
    };

    channel
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: "*",
          schema: "public",
          table: "event_polls",
          filter: `id=eq.${pollId}`,
        },
        handleChange
      )
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: "*",
          schema: "public",
          table: "event_poll_options",
          filter: `poll_id=eq.${pollId}`,
        },
        handleChange
      )
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: "*",
          schema: "public",
          table: "event_poll_votes",
          filter: `poll_id=eq.${pollId}`,
        },
        handleChange
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setIsLive(true);
          stopPolling();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setIsLive(false);
          startPolling();
        }
      });

    const onVisibilityChange = () => {
      if (typeof document === "undefined") {
        return;
      }
      if (document.visibilityState === "hidden") {
        stopPolling();
      } else {
        void refresh();
        // ref 経由で最新値を参照（stale closure を避ける）
        if (!isLiveRef.current) {
          startPolling();
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      activeRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      stopPolling();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      void client.removeChannel(channel);
    };
  }, [client, guildId, pollId]);

  return { snapshot, isLive };
}
