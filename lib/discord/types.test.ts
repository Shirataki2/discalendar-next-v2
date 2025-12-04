/**
 * Task 2: Discord API型定義テスト
 *
 * Requirements:
 * - 6.3: Discord APIレスポンス用の型定義を作成する
 * - 2.3: Discord API呼び出しの成功・失敗を表現するResult型を作成
 * - 2.4: トークン期限切れ、レート制限、ネットワークエラーなどのエラー種別を定義
 */

import { describe, expect, it } from "vitest";
import type {
  DiscordApiError,
  DiscordApiResult,
  DiscordGuild,
} from "./types";
import { getGuildIconUrl } from "./types";

describe("Task 2.2: Discord APIレスポンス用の型", () => {
  describe("DiscordGuild type", () => {
    it("should represent a partial guild object from Discord API", () => {
      const guild: DiscordGuild = {
        id: "123456789012345678",
        name: "Test Server",
        icon: "a_abc123def456",
        owner: true,
        permissions: "2146958847",
        features: ["COMMUNITY", "NEWS"],
      };

      expect(guild.id).toBe("123456789012345678");
      expect(guild.name).toBe("Test Server");
      expect(guild.icon).toBe("a_abc123def456");
      expect(guild.owner).toBe(true);
      expect(guild.permissions).toBe("2146958847");
      expect(guild.features).toContain("COMMUNITY");
    });

    it("should allow null icon for guilds without icon", () => {
      const guild: DiscordGuild = {
        id: "987654321098765432",
        name: "No Icon Server",
        icon: null,
        owner: false,
        permissions: "0",
        features: [],
      };

      expect(guild.icon).toBeNull();
    });
  });
});

describe("Task 2.3: Discord APIエラー型とResult型", () => {
  describe("DiscordApiError type", () => {
    it("should represent unauthorized error", () => {
      const error: DiscordApiError = {
        code: "unauthorized",
        message: "アクセストークンが無効または期限切れです。",
      };

      expect(error.code).toBe("unauthorized");
      expect(error.message).toBe("アクセストークンが無効または期限切れです。");
    });

    it("should represent rate_limited error with retryAfter", () => {
      const error: DiscordApiError = {
        code: "rate_limited",
        message: "リクエスト制限に達しました。",
        retryAfter: 30,
      };

      expect(error.code).toBe("rate_limited");
      if (error.code === "rate_limited") {
        expect(error.retryAfter).toBe(30);
      }
    });

    it("should represent network_error", () => {
      const error: DiscordApiError = {
        code: "network_error",
        message: "サーバーに接続できませんでした。",
      };

      expect(error.code).toBe("network_error");
    });

    it("should represent unknown error", () => {
      const error: DiscordApiError = {
        code: "unknown",
        message: "予期しないエラーが発生しました。",
      };

      expect(error.code).toBe("unknown");
    });
  });

  describe("DiscordApiResult type", () => {
    it("should represent successful result with data", () => {
      const guilds: DiscordGuild[] = [
        {
          id: "123456789012345678",
          name: "Test Server",
          icon: "abc123",
          owner: true,
          permissions: "2146958847",
          features: [],
        },
      ];

      const result: DiscordApiResult<DiscordGuild[]> = {
        success: true,
        data: guilds,
      };

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe("Test Server");
      }
    });

    it("should represent failed result with error", () => {
      const result: DiscordApiResult<DiscordGuild[]> = {
        success: false,
        error: {
          code: "unauthorized",
          message: "アクセストークンが無効です。",
        },
      };

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
      }
    });
  });
});

describe("getGuildIconUrl utility function", () => {
  it("should return correct URL for static icon", () => {
    const url = getGuildIconUrl("123456789012345678", "abc123def456");

    expect(url).toBe(
      "https://cdn.discordapp.com/icons/123456789012345678/abc123def456.png?size=128"
    );
  });

  it("should return gif URL for animated icon (a_ prefix)", () => {
    const url = getGuildIconUrl("123456789012345678", "a_abc123def456");

    expect(url).toBe(
      "https://cdn.discordapp.com/icons/123456789012345678/a_abc123def456.gif?size=128"
    );
  });

  it("should return null for null icon hash", () => {
    const url = getGuildIconUrl("123456789012345678", null);

    expect(url).toBeNull();
  });

  it("should support custom size parameter", () => {
    const url = getGuildIconUrl("123456789012345678", "abc123def456", 256);

    expect(url).toBe(
      "https://cdn.discordapp.com/icons/123456789012345678/abc123def456.png?size=256"
    );
  });
});
