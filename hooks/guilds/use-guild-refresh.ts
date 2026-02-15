/**
 * タブ復帰時のギルド一覧自動再取得フック
 *
 * Page Visibility API の visibilitychange イベントでタブ復帰を検知し、
 * refreshGuilds Server Action を呼び出して最新データを取得する。
 *
 * Requirements: bot-invite-flow 5.1, 5.2
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  refreshGuilds,
  type RefreshGuildsResult,
} from "@/app/dashboard/actions";

/** 連続再取得防止のための最低インターバル（30秒） */
const MIN_REFRESH_INTERVAL_MS = 30_000;

export interface UseGuildRefreshOptions {
  /** 再取得完了時のコールバック（エラーなしの場合のみ呼ばれる） */
  onRefresh: (result: Omit<RefreshGuildsResult, "error">) => void;
  /** 再取得が有効か（招待可能ギルドが存在する場合のみ有効にする） */
  enabled: boolean;
}

export interface UseGuildRefreshReturn {
  /** 再取得中フラグ */
  isRefreshing: boolean;
}

/**
 * タブ復帰時にギルド一覧を自動再取得するフック
 *
 * - `visibilitychange` イベントでタブが `visible` に戻った時に再取得
 * - 連続再取得防止のため最低 30 秒のインターバルを設定
 * - `enabled: false` の場合はリスナーを登録しない
 */
export function useGuildRefresh({
  onRefresh,
  enabled,
}: UseGuildRefreshOptions): UseGuildRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshRef = useRef<number>(0);
  const onRefreshRef = useRef(onRefresh);

  // コールバックの最新の参照を保持（useEffect の deps から除外するため）
  onRefreshRef.current = onRefresh;

  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    // インターバルチェック
    const now = Date.now();
    if (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL_MS) {
      return;
    }

    lastRefreshRef.current = now;
    setIsRefreshing(true);

    try {
      const result = await refreshGuilds();

      if (!result.error) {
        onRefreshRef.current({
          guilds: result.guilds,
          invitableGuilds: result.invitableGuilds,
          guildPermissions: result.guildPermissions,
        });
      }
    } catch {
      // ネットワークエラー等で reject した場合は無視し、現在の表示を維持
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, handleVisibilityChange]);

  return { isRefreshing };
}
