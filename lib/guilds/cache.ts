/**
 * ギルド取得のメモリキャッシュ
 *
 * 同じユーザーからの連続リクエストを防ぎ、タイムアウトを回避するためのキャッシュ実装
 *
 * ⚠️ 制限事項:
 * - この実装はグローバルメモリキャッシュ（Map）を使用しています
 * - 本番環境では複数のサーバーインスタンスが動作し、各インスタンスが独自のメモリ空間を持つため、
 *   キャッシュが共有されません
 * - 開発環境でも、Next.jsの高速リフレッシュによりモジュールが再読み込みされ、キャッシュが消失する可能性があります
 * - 将来的には、Next.jsの`unstable_cache`やReact Cacheへの移行を検討してください
 *
 * ⚠️ セキュリティ考慮事項:
 * - キャッシュサイズは最大1000エントリに制限されています（DoS対策）
 * - キャッシュキーは認証済みユーザーIDであり、外部入力ではありません
 * - キャッシュデータはメモリ上にのみ存在し、永続化されません
 *
 * 📊 監視推奨項目:
 * - キャッシュヒット率
 * - 平均キャッシュサイズ
 * - pending requestの平均期間
 */

import { randomUUID } from "node:crypto";

import type { GuildWithPermissions } from "./types";

/**
 * キャッシュエントリ
 */
interface CacheEntry {
  /** キャッシュされたギルド一覧 */
  guilds: GuildWithPermissions[];
  /** キャッシュの有効期限（Unixタイムスタンプ、ミリ秒） */
  expiresAt: number;
}

/**
 * 進行中のリクエストを追跡（同じリクエストの重複実行を防ぐ）
 */
interface PendingRequest {
  /** Promise */
  promise: Promise<{ guilds: GuildWithPermissions[] }>;
  /** リクエスト開始時刻 */
  startedAt: number;
  /** リクエストID（一意の識別子） */
  requestId: string;
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
export const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 進行中リクエストのタイムアウト（デフォルト: 30秒）
 */
export const PENDING_REQUEST_TIMEOUT_MS = 30 * 1000;

/**
 * キャッシュの最大エントリ数（メモリリーク防止）
 */
export const MAX_CACHE_ENTRIES = 1000;

/**
 * クリーンアップの実行間隔（デフォルト: 5分）
 */
const CLEANUP_INTERVAL_MS = CACHE_TTL_MS;

/**
 * キャッシュを取得
 *
 * @param userId ユーザーID
 * @returns キャッシュされたギルド一覧、またはnull（キャッシュがない/期限切れの場合）
 */
export function getCachedGuilds(userId: string): GuildWithPermissions[] | null {
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
 * @param requestId リクエストID（指定した場合、現在のpending requestのIDと一致する場合のみキャッシュ）
 */
export function setCachedGuilds(
  userId: string,
  guilds: GuildWithPermissions[],
  requestId?: string
): void {
  // リクエストIDが指定されている場合、現在のpending requestのIDと照合
  if (requestId !== undefined) {
    const currentRequest = pendingRequests.get(userId);
    // 現在のpending requestが存在しない場合はキャッシュしない（タイムアウト後に新しいリクエストが開始された可能性）
    if (!currentRequest) {
      return;
    }
    // 現在のpending requestが存在し、IDが一致しない場合はキャッシュしない（古いリクエストの結果）
    if (currentRequest.requestId !== requestId) {
      return;
    }
    // タイムアウトチェック: リクエスト開始時刻から30秒以上経過している場合は、古いリクエストの可能性があるためキャッシュしない
    const requestAge = Date.now() - currentRequest.startedAt;
    if (requestAge > PENDING_REQUEST_TIMEOUT_MS) {
      return;
    }
  }

  // キャッシュサイズ制限: 最大エントリ数に達している場合は最も古いエントリを削除
  if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(userId)) {
    // 最も古いエントリを削除（Mapは挿入順を保持するため、最初のエントリが最も古い）
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

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
): Promise<{ guilds: GuildWithPermissions[] }> | null {
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
 * @param requestId リクエストID（指定しない場合は自動生成）
 * @returns リクエストID
 */
export function setPendingRequest(
  userId: string,
  promise: Promise<{ guilds: GuildWithPermissions[] }>,
  requestId?: string
): string {
  const finalRequestId =
    requestId ?? `${userId}-${Date.now()}-${randomUUID()}`;
  pendingRequests.set(userId, {
    promise,
    startedAt: Date.now(),
    requestId: finalRequestId,
  });

  // リクエスト完了後にpendingRequestsから削除
  promise
    .then(() => {
      pendingRequests.delete(userId);
    })
    .catch(() => {
      pendingRequests.delete(userId);
    });

  return finalRequestId;
}

/**
 * 進行中のリクエストを取得、または新しいリクエストを設定（Atomic操作）
 *
 * 競合状態を防ぐため、チェックとセットを原子操作として実行します。
 * 既存のpending requestがある場合はそれを返し、ない場合は新しいリクエストを設定して返します。
 *
 * @param userId ユーザーID
 * @param factory 新しいリクエストを作成するファクトリ関数（requestIdを受け取る）
 * @returns 進行中のリクエストのPromise
 */
export function getOrSetPendingRequest(
  userId: string,
  factory: (requestId: string) => Promise<{ guilds: GuildWithPermissions[] }>
): Promise<{ guilds: GuildWithPermissions[] }> {
  // 既存のpending requestをチェック
  const existing = getPendingRequest(userId);
  if (existing) {
    return existing;
  }

  // リクエストIDを事前に生成
  const requestId = `${userId}-${Date.now()}-${randomUUID()}`;

  // 新しいリクエストを作成して設定
  const promise = factory(requestId);
  setPendingRequest(userId, promise, requestId);
  return promise;
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
 * クリーンアップ用のinterval IDを管理するグローバルシンボル
 * HMR（Hot Module Replacement）時も既存のインターバルをクリアできるようにする
 */
const CLEANUP_INTERVAL_KEY = Symbol.for("guild-cache-cleanup-interval");

/**
 * 定期的なクリーンアップを開始
 * サーバーサイドでのみ実行される（クライアントサイドでは実行されない）
 */
export function startPeriodicCleanup(): void {
  const globalAny = globalThis as any;

  if (
    typeof setInterval !== "undefined" &&
    typeof window === "undefined" &&
    !globalAny[CLEANUP_INTERVAL_KEY]
  ) {
    globalAny[CLEANUP_INTERVAL_KEY] = setInterval(
      cleanupExpiredCache,
      CLEANUP_INTERVAL_MS
    );
  }
}

/**
 * 定期的なクリーンアップを停止
 */
export function stopPeriodicCleanup(): void {
  const globalAny = globalThis as any;
  if (globalAny[CLEANUP_INTERVAL_KEY]) {
    clearInterval(globalAny[CLEANUP_INTERVAL_KEY]);
    globalAny[CLEANUP_INTERVAL_KEY] = null;
  }
}

// 自動的にクリーンアップを開始
startPeriodicCleanup();
