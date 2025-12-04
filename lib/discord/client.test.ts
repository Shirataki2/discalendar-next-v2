/**
 * Task 3.1: Discord APIクライアントの単体テスト
 *
 * Requirements:
 * - 2.1: Supabase Authに保存されたDiscordアクセストークンを使用してDiscord APIからユーザーの所属ギルド一覧を取得する
 * - 2.2: 各ギルドのid, name, iconを取得する
 * - 2.3: Discord APIへのアクセスに失敗した場合、エラーを返す
 * - 2.4: Discordアクセストークンが期限切れの場合、認証エラーを返す
 *
 * Contracts: DiscordApiClient Service Interface
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { DiscordGuild } from "./types";
import { getUserGuilds } from "./client";

describe("Task 3.1: Discord APIクライアント", () => {
  // Global fetchをモック
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    globalThis.fetch = mockFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe("getUserGuilds", () => {
    it("should fetch user guilds from Discord API with valid token", async () => {
      // Arrange
      const mockGuilds: DiscordGuild[] = [
        {
          id: "123456789012345678",
          name: "Test Server 1",
          icon: "abc123",
          owner: true,
          permissions: "2146958847",
          features: ["COMMUNITY"],
        },
        {
          id: "987654321098765432",
          name: "Test Server 2",
          icon: null,
          owner: false,
          permissions: "104320577",
          features: [],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGuilds),
      });

      // Act
      const result = await getUserGuilds("valid-access-token");

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].id).toBe("123456789012345678");
        expect(result.data[0].name).toBe("Test Server 1");
        expect(result.data[1].icon).toBeNull();
      }

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        "https://discord.com/api/v10/users/@me/guilds",
        {
          headers: {
            Authorization: "Bearer valid-access-token",
          },
        }
      );
    });

    it("should return unauthorized error for 401 status", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: "401: Unauthorized" }),
      });

      // Act
      const result = await getUserGuilds("expired-token");

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain("期限切れ");
      }
    });

    it("should return rate_limited error for 429 status with retryAfter", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => (name === "Retry-After" ? "30" : null),
        },
        json: () => Promise.resolve({ retry_after: 30 }),
      });

      // Act
      const result = await getUserGuilds("valid-token");

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("rate_limited");
        if (result.error.code === "rate_limited") {
          expect(result.error.retryAfter).toBe(30);
        }
      }
    });

    it("should return network_error when fetch throws", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      // Act
      const result = await getUserGuilds("valid-token");

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("network_error");
        expect(result.error.message).toContain("接続");
      }
    });

    it("should return unknown error for unexpected status codes", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Internal Server Error" }),
      });

      // Act
      const result = await getUserGuilds("valid-token");

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unknown");
      }
    });

    it("should handle empty guild list", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      // Act
      const result = await getUserGuilds("valid-token");

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("should use correct Discord API v10 endpoint", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      // Act
      await getUserGuilds("test-token");

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("discord.com/api/v10"),
        expect.any(Object)
      );
    });

    it("should include Bearer token in Authorization header", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      // Act
      await getUserGuilds("my-access-token");

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        headers: {
          Authorization: "Bearer my-access-token",
        },
      });
    });
  });
});
