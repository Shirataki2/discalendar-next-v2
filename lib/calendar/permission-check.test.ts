/**
 * checkEventPermission のユニットテスト
 *
 * Task 4: イベント操作権限チェック関数の作成
 * - restricted/非 restricted × 管理権限あり/なし × 各操作タイプの全組み合わせ
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
import { describe, expect, it } from "vitest";
import type { DiscordPermissions } from "@/lib/discord/permissions";
import type { GuildConfig } from "@/lib/guilds/guild-config-service";
import { checkEventPermission } from "./permission-check";

/** 管理権限ありの権限オブジェクト（administrator） */
const ADMIN_PERMISSIONS: DiscordPermissions = {
  administrator: true,
  manageGuild: false,
  manageChannels: false,
  manageMessages: false,
  manageRoles: false,
  manageEvents: false,
  raw: 8n,
};

/** manageGuild のみの権限オブジェクト */
const MANAGE_GUILD_PERMISSIONS: DiscordPermissions = {
  administrator: false,
  manageGuild: true,
  manageChannels: false,
  manageMessages: false,
  manageRoles: false,
  manageEvents: false,
  raw: 32n,
};

/** 管理権限なしの権限オブジェクト */
const NO_MANAGE_PERMISSIONS: DiscordPermissions = {
  administrator: false,
  manageGuild: false,
  manageChannels: true,
  manageMessages: false,
  manageRoles: false,
  manageEvents: true,
  raw: 0n,
};

/** 全フラグ false の権限オブジェクト */
const EMPTY_PERMISSIONS: DiscordPermissions = {
  administrator: false,
  manageGuild: false,
  manageChannels: false,
  manageMessages: false,
  manageRoles: false,
  manageEvents: false,
  raw: 0n,
};

/** restricted ギルド設定 */
const RESTRICTED_CONFIG: GuildConfig = {
  guildId: "guild-1",
  restricted: true,
};

/** 非 restricted ギルド設定 */
const UNRESTRICTED_CONFIG: GuildConfig = {
  guildId: "guild-1",
  restricted: false,
};

describe("checkEventPermission", () => {
  describe("read 操作", () => {
    it("restricted ギルドで管理権限なしでも read は許可される", () => {
      const result = checkEventPermission(
        "read",
        RESTRICTED_CONFIG,
        NO_MANAGE_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
    });

    it("restricted ギルドで管理権限ありでも read は許可される", () => {
      const result = checkEventPermission(
        "read",
        RESTRICTED_CONFIG,
        ADMIN_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
    });

    it("非 restricted ギルドで read は許可される", () => {
      const result = checkEventPermission(
        "read",
        UNRESTRICTED_CONFIG,
        EMPTY_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("非 restricted ギルド", () => {
    it("管理権限なしでも create は許可される", () => {
      const result = checkEventPermission(
        "create",
        UNRESTRICTED_CONFIG,
        NO_MANAGE_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
    });

    it("管理権限なしでも update は許可される", () => {
      const result = checkEventPermission(
        "update",
        UNRESTRICTED_CONFIG,
        NO_MANAGE_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
    });

    it("管理権限なしでも delete は許可される", () => {
      const result = checkEventPermission(
        "delete",
        UNRESTRICTED_CONFIG,
        NO_MANAGE_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
    });

    it("管理権限ありで create は許可される", () => {
      const result = checkEventPermission(
        "create",
        UNRESTRICTED_CONFIG,
        ADMIN_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("restricted ギルド × 管理権限あり", () => {
    it("administrator で create は許可される", () => {
      const result = checkEventPermission(
        "create",
        RESTRICTED_CONFIG,
        ADMIN_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
    });

    it("manageGuild で update は許可される", () => {
      const result = checkEventPermission(
        "update",
        RESTRICTED_CONFIG,
        MANAGE_GUILD_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
    });

    it("administrator で delete は許可される", () => {
      const result = checkEventPermission(
        "delete",
        RESTRICTED_CONFIG,
        ADMIN_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("restricted ギルド × 管理権限なし", () => {
    it("create は拒否される", () => {
      const result = checkEventPermission(
        "create",
        RESTRICTED_CONFIG,
        NO_MANAGE_PERMISSIONS,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("update は拒否される", () => {
      const result = checkEventPermission(
        "update",
        RESTRICTED_CONFIG,
        NO_MANAGE_PERMISSIONS,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("delete は拒否される", () => {
      const result = checkEventPermission(
        "delete",
        RESTRICTED_CONFIG,
        NO_MANAGE_PERMISSIONS,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("全フラグ false でも create は拒否される", () => {
      const result = checkEventPermission(
        "create",
        RESTRICTED_CONFIG,
        EMPTY_PERMISSIONS,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe("reason メッセージ", () => {
    it("拒否時に権限不足の理由が含まれる", () => {
      const result = checkEventPermission(
        "create",
        RESTRICTED_CONFIG,
        EMPTY_PERMISSIONS,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("権限");
    });

    it("許可時に reason は undefined", () => {
      const result = checkEventPermission(
        "create",
        UNRESTRICTED_CONFIG,
        EMPTY_PERMISSIONS,
      );
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });
});
