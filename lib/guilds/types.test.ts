/**
 * Task 2: 型定義の整備テスト
 *
 * Requirements:
 * - 6.1: Guild型を定義する: id (number), guildId (string), name (string), avatarUrl (string | null), locale (string)
 * - 6.2: Supabaseの自動生成型と互換性のある型定義を使用する
 * - 2.3: トークン期限切れ、レート制限、ネットワークエラーなどのエラー種別を定義
 * - 2.4: ギルド一覧UIで使用するエラー型を作成
 */

import { describe, expect, it } from "vitest";
import type { Guild, GuildListError, GuildRow } from "./types";
import { toGuild } from "./types";

describe("Task 2.1: ギルド関連の内部型", () => {
  describe("Guild type", () => {
    it("should allow creating a valid Guild object", () => {
      const guild: Guild = {
        id: 1,
        guildId: "123456789012345678",
        name: "Test Server",
        avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
        locale: "ja",
      };

      expect(guild.id).toBe(1);
      expect(guild.guildId).toBe("123456789012345678");
      expect(guild.name).toBe("Test Server");
      expect(guild.avatarUrl).toBe(
        "https://cdn.discordapp.com/icons/123/abc.png"
      );
      expect(guild.locale).toBe("ja");
    });

    it("should allow null avatarUrl for guilds without icon", () => {
      const guild: Guild = {
        id: 2,
        guildId: "987654321098765432",
        name: "No Icon Server",
        avatarUrl: null,
        locale: "en",
      };

      expect(guild.avatarUrl).toBeNull();
    });
  });

  describe("GuildRow type (Supabase compatibility)", () => {
    it("should have snake_case properties matching Supabase schema", () => {
      const row: GuildRow = {
        id: 1,
        guild_id: "123456789012345678",
        name: "Test Server",
        avatar_url: "https://cdn.discordapp.com/icons/123/abc.png",
        locale: "ja",
      };

      expect(row.id).toBe(1);
      expect(row.guild_id).toBe("123456789012345678");
      expect(row.name).toBe("Test Server");
      expect(row.avatar_url).toBe(
        "https://cdn.discordapp.com/icons/123/abc.png"
      );
      expect(row.locale).toBe("ja");
    });

    it("should allow null avatar_url in GuildRow", () => {
      const row: GuildRow = {
        id: 2,
        guild_id: "987654321098765432",
        name: "No Icon Server",
        avatar_url: null,
        locale: "en",
      };

      expect(row.avatar_url).toBeNull();
    });
  });
});

describe("Task 2.3: エラー型", () => {
  describe("GuildListError type", () => {
    it("should represent api_error with message", () => {
      const error: GuildListError = {
        type: "api_error",
        message: "Discordからの情報取得に失敗しました。",
      };

      expect(error.type).toBe("api_error");
      if (error.type === "api_error") {
        expect(error.message).toBe("Discordからの情報取得に失敗しました。");
      }
    });

    it("should represent token_expired error", () => {
      const error: GuildListError = {
        type: "token_expired",
      };

      expect(error.type).toBe("token_expired");
    });

    it("should represent no_token error", () => {
      const error: GuildListError = {
        type: "no_token",
      };

      expect(error.type).toBe("no_token");
    });
  });
});

describe("toGuild conversion function", () => {
  it("should convert GuildRow to Guild with correct property mapping", () => {
    const row: GuildRow = {
      id: 1,
      guild_id: "123456789012345678",
      name: "Test Server",
      avatar_url: "https://cdn.discordapp.com/icons/123/abc.png",
      locale: "ja",
    };

    const guild = toGuild(row);

    expect(guild.id).toBe(1);
    expect(guild.guildId).toBe("123456789012345678");
    expect(guild.name).toBe("Test Server");
    expect(guild.avatarUrl).toBe("https://cdn.discordapp.com/icons/123/abc.png");
    expect(guild.locale).toBe("ja");
  });

  it("should preserve null avatar_url as null avatarUrl", () => {
    const row: GuildRow = {
      id: 2,
      guild_id: "987654321098765432",
      name: "No Icon Server",
      avatar_url: null,
      locale: "en",
    };

    const guild = toGuild(row);

    expect(guild.avatarUrl).toBeNull();
  });
});
