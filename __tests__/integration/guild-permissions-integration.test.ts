/**
 * 権限チェック統合テスト
 *
 * Task 8: 権限システム全体の統合テストスイート
 * - parsePermissions → canManageGuild → checkEventPermission の統合パイプライン検証
 * - checkEventPermission の restricted/非restricted × 管理権限あり/なし × 各操作タイプの全組み合わせ
 * - 各管理権限タイプ（administrator, manageGuild, manageMessages, manageRoles）での canManageGuild 判定
 *
 * Requirements: 1.1, 2.1, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4
 */
import { describe, expect, it } from "vitest";
import {
  checkEventPermission,
  type EventOperation,
} from "@/lib/calendar/permission-check";
import { canManageGuild, parsePermissions } from "@/lib/discord/permissions";
import type { GuildConfig } from "@/lib/guilds/guild-config-service";

// ──────────────────────────────────────────────
// 権限ビットフィールド定数（raw 文字列）
// ──────────────────────────────────────────────

/** ADMINISTRATOR (1 << 3) = 8 */
const BIT_ADMINISTRATOR = "8";
/** MANAGE_CHANNELS (1 << 4) = 16 */
const BIT_MANAGE_CHANNELS = "16";
/** MANAGE_GUILD (1 << 5) = 32 */
const BIT_MANAGE_GUILD = "32";
/** MANAGE_MESSAGES (1 << 13) = 8192 */
const BIT_MANAGE_MESSAGES = "8192";
/** MANAGE_ROLES (1 << 28) = 268435456 */
const BIT_MANAGE_ROLES = "268435456";
/** MANAGE_EVENTS (1 << 33) = 8589934592 */
const BIT_MANAGE_EVENTS = "8589934592";
/** 権限なし */
const BIT_NONE = "0";
/** 空文字列 */
const BIT_EMPTY = "";

// ──────────────────────────────────────────────
// ギルド設定フィクスチャ
// ──────────────────────────────────────────────

const RESTRICTED_CONFIG: GuildConfig = { guildId: "guild-1", restricted: true };
const UNRESTRICTED_CONFIG: GuildConfig = {
  guildId: "guild-1",
  restricted: false,
};

// ──────────────────────────────────────────────
// 統合パイプラインテスト
// ──────────────────────────────────────────────

describe("parsePermissions → canManageGuild → checkEventPermission 統合パイプライン", () => {
  describe("raw ビットフィールドから権限判定までのエンドツーエンド", () => {
    it("ADMINISTRATOR ビットフィールド → restricted ギルドでイベント作成可", () => {
      const permissions = parsePermissions(BIT_ADMINISTRATOR);
      expect(canManageGuild(permissions)).toBe(true);

      const result = checkEventPermission(
        "create",
        RESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(true);
    });

    it("MANAGE_GUILD ビットフィールド → restricted ギルドでイベント更新可", () => {
      const permissions = parsePermissions(BIT_MANAGE_GUILD);
      expect(canManageGuild(permissions)).toBe(true);

      const result = checkEventPermission(
        "update",
        RESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(true);
    });

    it("MANAGE_MESSAGES ビットフィールド → restricted ギルドでイベント削除可", () => {
      const permissions = parsePermissions(BIT_MANAGE_MESSAGES);
      expect(canManageGuild(permissions)).toBe(true);

      const result = checkEventPermission(
        "delete",
        RESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(true);
    });

    it("MANAGE_ROLES ビットフィールド → restricted ギルドでイベント作成可", () => {
      const permissions = parsePermissions(BIT_MANAGE_ROLES);
      expect(canManageGuild(permissions)).toBe(true);

      const result = checkEventPermission(
        "create",
        RESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(true);
    });

    it("MANAGE_CHANNELS のみ → restricted ギルドでイベント作成不可", () => {
      const permissions = parsePermissions(BIT_MANAGE_CHANNELS);
      expect(canManageGuild(permissions)).toBe(false);

      const result = checkEventPermission(
        "create",
        RESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("MANAGE_EVENTS のみ → restricted ギルドでイベント作成不可", () => {
      const permissions = parsePermissions(BIT_MANAGE_EVENTS);
      expect(canManageGuild(permissions)).toBe(false);

      const result = checkEventPermission(
        "create",
        RESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(false);
    });

    it("権限なし（'0'） → restricted ギルドでイベント操作不可", () => {
      const permissions = parsePermissions(BIT_NONE);
      expect(canManageGuild(permissions)).toBe(false);

      const result = checkEventPermission(
        "create",
        RESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(false);
    });

    it("空文字列 → restricted ギルドでイベント操作不可", () => {
      const permissions = parsePermissions(BIT_EMPTY);
      expect(canManageGuild(permissions)).toBe(false);

      const result = checkEventPermission(
        "delete",
        RESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(false);
    });

    it("権限なし → 非 restricted ギルドでイベント操作可", () => {
      const permissions = parsePermissions(BIT_NONE);

      const result = checkEventPermission(
        "create",
        UNRESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(true);
    });

    it("不正なビットフィールド → デフォルト権限（全拒否）で動作", () => {
      const permissions = parsePermissions("invalid-not-a-number");
      expect(permissions.raw).toBe(0n);
      expect(canManageGuild(permissions)).toBe(false);

      const result = checkEventPermission(
        "create",
        RESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(false);
    });

    it("複合権限（ADMINISTRATOR + MANAGE_GUILD = 40） → 管理権限あり", () => {
      const permissions = parsePermissions("40");
      expect(permissions.administrator).toBe(true);
      expect(permissions.manageGuild).toBe(true);
      expect(canManageGuild(permissions)).toBe(true);

      const result = checkEventPermission(
        "update",
        RESTRICTED_CONFIG,
        permissions
      );
      expect(result.allowed).toBe(true);
    });
  });
});

// ──────────────────────────────────────────────
// checkEventPermission 全組み合わせマトリクス
// ──────────────────────────────────────────────

describe("checkEventPermission 全組み合わせマトリクス", () => {
  const adminPermissions = parsePermissions(BIT_ADMINISTRATOR);
  const noPermissions = parsePermissions(BIT_NONE);

  const operations: EventOperation[] = ["create", "update", "delete", "read"];
  const configs = [
    { config: RESTRICTED_CONFIG, label: "restricted" },
    { config: UNRESTRICTED_CONFIG, label: "非restricted" },
  ];
  const permissionSets = [
    { permissions: adminPermissions, label: "管理権限あり", hasManage: true },
    { permissions: noPermissions, label: "管理権限なし", hasManage: false },
  ];

  /**
   * 期待される結果を判定するロジック:
   * - read → 常に許可
   * - 非 restricted → 常に許可
   * - restricted + 管理権限あり → 許可
   * - restricted + 管理権限なし → 拒否
   */
  function expectedAllowed(
    operation: EventOperation,
    restricted: boolean,
    hasManagePermission: boolean
  ): boolean {
    if (operation === "read") {
      return true;
    }
    if (!restricted) {
      return true;
    }
    return hasManagePermission;
  }

  for (const { config, label: configLabel } of configs) {
    for (const { permissions, label: permLabel, hasManage } of permissionSets) {
      for (const operation of operations) {
        const expected = expectedAllowed(
          operation,
          config.restricted,
          hasManage
        );
        const resultText = expected ? "許可" : "拒否";

        it(`${configLabel} × ${permLabel} × ${operation} → ${resultText}`, () => {
          const result = checkEventPermission(operation, config, permissions);
          expect(result.allowed).toBe(expected);

          if (!expected) {
            expect(result.reason).toBeDefined();
          }
        });
      }
    }
  }
});

// ──────────────────────────────────────────────
// 各管理権限タイプの canManageGuild 判定
// ──────────────────────────────────────────────

describe("各管理権限タイプの canManageGuild 判定（raw ビットフィールド経由）", () => {
  const managePermissionBitfields = [
    {
      bitfield: BIT_ADMINISTRATOR,
      label: "ADMINISTRATOR",
      flag: "administrator",
    },
    { bitfield: BIT_MANAGE_GUILD, label: "MANAGE_GUILD", flag: "manageGuild" },
    {
      bitfield: BIT_MANAGE_MESSAGES,
      label: "MANAGE_MESSAGES",
      flag: "manageMessages",
    },
    { bitfield: BIT_MANAGE_ROLES, label: "MANAGE_ROLES", flag: "manageRoles" },
  ];

  const nonManagePermissionBitfields = [
    {
      bitfield: BIT_MANAGE_CHANNELS,
      label: "MANAGE_CHANNELS",
      flag: "manageChannels",
    },
    {
      bitfield: BIT_MANAGE_EVENTS,
      label: "MANAGE_EVENTS",
      flag: "manageEvents",
    },
    { bitfield: BIT_NONE, label: "権限なし", flag: null },
    { bitfield: BIT_EMPTY, label: "空文字列", flag: null },
  ];

  for (const { bitfield, label, flag } of managePermissionBitfields) {
    it(`${label} (${bitfield}) → canManageGuild = true`, () => {
      const permissions = parsePermissions(bitfield);

      if (flag) {
        expect(permissions[flag as keyof typeof permissions]).toBe(true);
      }
      expect(canManageGuild(permissions)).toBe(true);
    });
  }

  for (const { bitfield, label, flag } of nonManagePermissionBitfields) {
    it(`${label} (${bitfield}) → canManageGuild = false`, () => {
      const permissions = parsePermissions(bitfield);

      if (flag) {
        expect(permissions[flag as keyof typeof permissions]).toBe(true);
      }
      expect(canManageGuild(permissions)).toBe(false);
    });
  }
});

// ──────────────────────────────────────────────
// restricted ギルドでの管理権限タイプ別イベント操作
// ──────────────────────────────────────────────

describe("restricted ギルドでの管理権限タイプ別イベント操作", () => {
  const writeOperations: EventOperation[] = ["create", "update", "delete"];

  const managePermissions = [
    { bitfield: BIT_ADMINISTRATOR, label: "ADMINISTRATOR" },
    { bitfield: BIT_MANAGE_GUILD, label: "MANAGE_GUILD" },
    { bitfield: BIT_MANAGE_MESSAGES, label: "MANAGE_MESSAGES" },
    { bitfield: BIT_MANAGE_ROLES, label: "MANAGE_ROLES" },
  ];

  for (const { bitfield, label } of managePermissions) {
    for (const operation of writeOperations) {
      it(`${label} → restricted ギルドで ${operation} 許可`, () => {
        const permissions = parsePermissions(bitfield);
        const result = checkEventPermission(
          operation,
          RESTRICTED_CONFIG,
          permissions
        );
        expect(result.allowed).toBe(true);
      });
    }
  }

  it("read 操作は管理権限に関係なく常に許可", () => {
    const permissions = parsePermissions(BIT_NONE);
    const result = checkEventPermission("read", RESTRICTED_CONFIG, permissions);
    expect(result.allowed).toBe(true);
  });
});
