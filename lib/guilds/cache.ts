/**
 * ギルド取得のメモリキャッシュ
 *
 * 同じユーザーからの連続リクエストを防ぎ、タイムアウトを回避するためのキャッシュ実装
 */

import type { Guild } from "./types";

/**
 * キャッシュエントリ
 */
interface CacheEntry {
  /** キャッシュされたギルド一覧 */
  guilds: Guild[];
  /** キャッシュの有効期限（Unixタイムスタンプ、ミリ秒） */
  expiresAt: number;
}

/**
 * 進行中のリクエストを追跡（同じリクエストの重複実行を防ぐ）
 */
interface PendingRequest {
  /** Promise */
  promise: Promise<{ guilds: Guild[] }>;
  /** リクエスト開始時刻 */
  startedAt: number;
}

/**
 * キャッシュの保存先（ユーザーID -> キャッシュエントリ）
 */
const cache = new Map<string, CacheEntry>();

/**
 * 進行中のリクエスト（ユーザーID -> リクエスト）
 */
const pendingRequests = new Map<string, PendingRequest>();

/**
 * キャッシュの有効期限（デフォルト: 5分）
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 進行中リクエストのタイムアウト（デフォルト: 30秒）
 */
const PENDING_REQUEST_TIMEOUT_MS = 30 * 1000;

/**
 * キャッシュを取得
 *
 * @param userId ユーザーID
 * @returns キャッシュされたギルド一覧、またはnull（キャッシュがない/期限切れの場合）
 */
export function getCachedGuilds(userId: string): Guild[] | null {
  const entry = cache.get(userId);

  if (!entry) {
    return null;
  }

  // 期限切れチェック
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }

  return entry.guilds;
}

/**
 * キャッシュに保存
 *
 * @param userId ユーザーID
 * @param guilds ギルド一覧
 */
export function setCachedGuilds(userId: string, guilds: Guild[]): void {
  const expiresAt = Date.now() + CACHE_TTL_MS;
  cache.set(userId, { guilds, expiresAt });
}

/**
 * キャッシュをクリア
 *
 * @param userId ユーザーID（指定しない場合は全てクリア）
 */
export function clearCache(userId?: string): void {
  if (userId) {
    cache.delete(userId);
    pendingRequests.delete(userId);
  } else {
    cache.clear();
    pendingRequests.clear();
  }
}

/**
 * 進行中のリクエストを取得
 *
 * @param userId ユーザーID
 * @returns 進行中のリクエスト、またはnull
 */
export function getPendingRequest(
  userId: string
): Promise<{ guilds: Guild[] }> | null {
  const request = pendingRequests.get(userId);

  if (!request) {
    return null;
  }

  // タイムアウトチェック
  if (Date.now() - request.startedAt > PENDING_REQUEST_TIMEOUT_MS) {
    pendingRequests.delete(userId);
    return null;
  }

  return request.promise;
}

/**
 * 進行中のリクエストを設定
 *
 * @param userId ユーザーID
 * @param promise リクエストのPromise
 */
export function setPendingRequest(
  userId: string,
  promise: Promise<{ guilds: Guild[] }>
): void {
  pendingRequests.set(userId, {
    promise,
    startedAt: Date.now(),
  });

  // リクエスト完了後にpendingRequestsから削除
  promise
    .then(() => {
      pendingRequests.delete(userId);
    })
    .catch(() => {
      pendingRequests.delete(userId);
    });
}

/**
 * 期限切れのキャッシュエントリを削除（メモリリーク防止のためのクリーンアップ）
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [userId, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(userId);
    }
  }

  // タイムアウトした進行中のリクエストも削除
  for (const [userId, request] of pendingRequests.entries()) {
    if (now - request.startedAt > PENDING_REQUEST_TIMEOUT_MS) {
      pendingRequests.delete(userId);
    }
  }
}

/**
 * 定期的にキャッシュをクリーンアップ（5分ごと）
 * サーバーサイドでのみ実行される（クライアントサイドでは実行されない）
 */
if (typeof setInterval !== "undefined" && typeof window === "undefined") {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}
