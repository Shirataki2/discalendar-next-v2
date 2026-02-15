/**
 * ギルドキャッシュのテスト
 *
 * キャッシュ機能の動作確認用テスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parsePermissions } from "@/lib/discord/permissions";
import type { GuildWithPermissions } from "./types";
import {
  CACHE_TTL_MS,
  type FetchGuildsData,
  clearCache,
  cleanupExpiredCache,
  getCachedGuilds,
  getPendingRequest,
  PENDING_REQUEST_TIMEOUT_MS,
  setCachedGuilds,
  setPendingRequest,
  stopPeriodicCleanup,
} from "./cache";

describe("ギルドキャッシュ", () => {
  const mockGuilds: GuildWithPermissions[] = [
    {
      id: 1,
      guildId: "123456789012345678",
      name: "Test Server 1",
      avatarUrl: "https://example.com/icon1.png",
      locale: "ja",
      permissions: parsePermissions("8"),
    },
    {
      id: 2,
      guildId: "234567890123456789",
      name: "Test Server 2",
      avatarUrl: null,
      locale: "en",
      permissions: parsePermissions("0"),
    },
  ];

  const mockData: FetchGuildsData = {
    guilds: mockGuilds,
    invitableGuilds: [],
  };

  beforeEach(() => {
    // 各テスト前にキャッシュをクリア
    clearCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearCache();
    stopPeriodicCleanup();
  });

  describe("getCachedGuilds / setCachedGuilds", () => {
    it("キャッシュが空の場合はnullを返す", () => {
      const result = getCachedGuilds("user-1");
      expect(result).toBeNull();
    });

    it("キャッシュにデータを保存して取得できる", () => {
      setCachedGuilds("user-1", mockData);
      const result = getCachedGuilds("user-1");
      expect(result).toEqual(mockData);
    });

    it("異なるユーザーIDのキャッシュは独立している", () => {
      const user1Data: FetchGuildsData = {
        guilds: [mockGuilds[0]],
        invitableGuilds: [],
      };
      const user2Data: FetchGuildsData = {
        guilds: [mockGuilds[1]],
        invitableGuilds: [],
      };

      setCachedGuilds("user-1", user1Data);
      setCachedGuilds("user-2", user2Data);

      expect(getCachedGuilds("user-1")).toEqual(user1Data);
      expect(getCachedGuilds("user-2")).toEqual(user2Data);
    });

    it("期限切れのキャッシュはnullを返す", () => {
      setCachedGuilds("user-1", mockData);

      // CACHE_TTL_MS + 1秒経過
      vi.advanceTimersByTime(CACHE_TTL_MS + 1000);

      const result = getCachedGuilds("user-1");
      expect(result).toBeNull();
    });

    it("期限切れ前のキャッシュは有効", () => {
      setCachedGuilds("user-1", mockData);

      // CACHE_TTL_MS - 1秒経過
      vi.advanceTimersByTime(CACHE_TTL_MS - 1000);

      const result = getCachedGuilds("user-1");
      expect(result).toEqual(mockData);
    });

    it("空配列もキャッシュできる", () => {
      const emptyData: FetchGuildsData = {
        guilds: [],
        invitableGuilds: [],
      };
      setCachedGuilds("user-1", emptyData);
      const result = getCachedGuilds("user-1");
      expect(result).toEqual(emptyData);
    });

    it("キャッシュを上書きできる", () => {
      const initialData: FetchGuildsData = {
        guilds: [mockGuilds[0]],
        invitableGuilds: [],
      };
      const updatedData: FetchGuildsData = {
        guilds: [mockGuilds[1]],
        invitableGuilds: [],
      };

      setCachedGuilds("user-1", initialData);
      expect(getCachedGuilds("user-1")).toEqual(initialData);

      setCachedGuilds("user-1", updatedData);
      expect(getCachedGuilds("user-1")).toEqual(updatedData);
    });
  });

  describe("clearCache", () => {
    it("特定のユーザーのキャッシュをクリアできる", () => {
      setCachedGuilds("user-1", mockData);
      setCachedGuilds("user-2", mockData);

      clearCache("user-1");

      expect(getCachedGuilds("user-1")).toBeNull();
      expect(getCachedGuilds("user-2")).toEqual(mockData);
    });

    it("全てのキャッシュをクリアできる", () => {
      setCachedGuilds("user-1", mockData);
      setCachedGuilds("user-2", mockData);
      setCachedGuilds("user-3", mockData);

      clearCache();

      expect(getCachedGuilds("user-1")).toBeNull();
      expect(getCachedGuilds("user-2")).toBeNull();
      expect(getCachedGuilds("user-3")).toBeNull();
    });
  });

  describe("getPendingRequest / setPendingRequest", () => {
    it("進行中のリクエストがない場合はnullを返す", () => {
      const result = getPendingRequest("user-1");
      expect(result).toBeNull();
    });

    it("進行中のリクエストを追跡できる", async () => {
      const promise = Promise.resolve(mockData);
      setPendingRequest("user-1", promise);

      const pending = getPendingRequest("user-1");
      expect(pending).toBe(promise);

      // リクエスト完了を待つ
      const result = await promise;
      expect(result.guilds).toEqual(mockGuilds);
    });

    it("進行中のリクエストを設定できる", async () => {
      const promise = Promise.resolve(mockData);
      setPendingRequest("user-1", promise);

      const pending = getPendingRequest("user-1");
      expect(pending).toBe(promise);

      // リクエスト完了を待つ
      const result = await promise;
      expect(result.guilds).toEqual(mockGuilds);
    });

    it("タイムアウトした進行中のリクエストはnullを返す", () => {
      const promise = Promise.resolve(mockData);
      setPendingRequest("user-1", promise);

      // PENDING_REQUEST_TIMEOUT_MS + 1秒経過
      vi.advanceTimersByTime(PENDING_REQUEST_TIMEOUT_MS + 1000);

      const result = getPendingRequest("user-1");
      expect(result).toBeNull();
    });

    it("タイムアウト前の進行中のリクエストは有効", () => {
      const promise = Promise.resolve(mockData);
      setPendingRequest("user-1", promise);

      // PENDING_REQUEST_TIMEOUT_MS - 1秒経過
      vi.advanceTimersByTime(PENDING_REQUEST_TIMEOUT_MS - 1000);

      const result = getPendingRequest("user-1");
      expect(result).toBe(promise);
    });

    it("失敗したリクエストを設定できる", async () => {
      const promise = Promise.reject(new Error("Request failed"));
      setPendingRequest("user-1", promise);

      const pending = getPendingRequest("user-1");
      expect(pending).toBe(promise);

      // エラーを捕捉（pendingRequestsからの削除は非同期で行われるため、ここでは設定のみ確認）
      try {
        await promise;
      } catch {
        // エラーは無視
      }
    });
  });

  describe("cleanupExpiredCache", () => {
    it("期限切れのキャッシュを削除する", () => {
      setCachedGuilds("user-1", mockData);

      // user-1のキャッシュを期限切れにする
      vi.advanceTimersByTime(CACHE_TTL_MS + 1000);

      cleanupExpiredCache();

      expect(getCachedGuilds("user-1")).toBeNull();

      // 新しいキャッシュを設定して有効期限前であることを確認
      setCachedGuilds("user-2", mockData);
      cleanupExpiredCache();

      // user-2はまだ有効
      expect(getCachedGuilds("user-2")).toEqual(mockData);
    });

    it("タイムアウトした進行中のリクエストを削除する", () => {
      const promise = Promise.resolve(mockData);
      setPendingRequest("user-1", promise);

      // タイムアウトさせる
      vi.advanceTimersByTime(PENDING_REQUEST_TIMEOUT_MS + 1000);

      cleanupExpiredCache();

      expect(getPendingRequest("user-1")).toBeNull();
    });
  });
});
