/**
 * Discord 権限ビットフィールド解析ユーティリティのテスト
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { describe, expect, it } from "vitest";
import {
  DISCORD_PERMISSION_FLAGS,
  type DiscordPermissions,
  canInviteBot,
  canManageGuild,
  parsePermissions,
} from "./permissions";

describe("parsePermissions", () => {
  describe("全フラグ ON/OFF", () => {
    it("すべての管理権限フラグがONのビットフィールドを正しく解析する", () => {
      // ADMINISTRATOR(8) + MANAGE_CHANNELS(16) + MANAGE_GUILD(32) + MANAGE_MESSAGES(8192) + MANAGE_ROLES(268435456) + MANAGE_EVENTS(8589934592)
      const allFlags = (
        (1n << 3n) |
        (1n << 4n) |
        (1n << 5n) |
        (1n << 13n) |
        (1n << 28n) |
        (1n << 33n)
      ).toString();

      const result = parsePermissions(allFlags);

      expect(result.administrator).toBe(true);
      expect(result.manageGuild).toBe(true);
      expect(result.manageChannels).toBe(true);
      expect(result.manageMessages).toBe(true);
      expect(result.manageRoles).toBe(true);
      expect(result.manageEvents).toBe(true);
    });

    it('"0" の場合はすべてのフラグを false として返す', () => {
      const result = parsePermissions("0");

      expect(result.administrator).toBe(false);
      expect(result.manageGuild).toBe(false);
      expect(result.manageChannels).toBe(false);
      expect(result.manageMessages).toBe(false);
      expect(result.manageRoles).toBe(false);
      expect(result.manageEvents).toBe(false);
      expect(result.raw).toBe(0n);
    });

    it("空文字列の場合はすべてのフラグを false として返す", () => {
      const result = parsePermissions("");

      expect(result.administrator).toBe(false);
      expect(result.manageGuild).toBe(false);
      expect(result.manageChannels).toBe(false);
      expect(result.manageMessages).toBe(false);
      expect(result.manageRoles).toBe(false);
      expect(result.manageEvents).toBe(false);
      expect(result.raw).toBe(0n);
    });
  });

  describe("個別フラグの解析精度", () => {
    it("ADMINISTRATOR (1 << 3) のみ ON の場合", () => {
      const result = parsePermissions("8");

      expect(result.administrator).toBe(true);
      expect(result.manageGuild).toBe(false);
      expect(result.manageChannels).toBe(false);
      expect(result.manageMessages).toBe(false);
      expect(result.manageRoles).toBe(false);
      expect(result.manageEvents).toBe(false);
      expect(result.raw).toBe(8n);
    });

    it("MANAGE_CHANNELS (1 << 4) のみ ON の場合", () => {
      const result = parsePermissions("16");

      expect(result.administrator).toBe(false);
      expect(result.manageChannels).toBe(true);
      expect(result.manageGuild).toBe(false);
    });

    it("MANAGE_GUILD (1 << 5) のみ ON の場合", () => {
      const result = parsePermissions("32");

      expect(result.administrator).toBe(false);
      expect(result.manageGuild).toBe(true);
      expect(result.manageChannels).toBe(false);
      expect(result.manageMessages).toBe(false);
      expect(result.manageRoles).toBe(false);
    });

    it("MANAGE_MESSAGES (1 << 13) のみ ON の場合", () => {
      const result = parsePermissions("8192");

      expect(result.administrator).toBe(false);
      expect(result.manageMessages).toBe(true);
      expect(result.manageGuild).toBe(false);
    });

    it("MANAGE_ROLES (1 << 28) のみ ON の場合", () => {
      const result = parsePermissions("268435456");

      expect(result.administrator).toBe(false);
      expect(result.manageRoles).toBe(true);
      expect(result.manageGuild).toBe(false);
    });

    it("MANAGE_EVENTS (1 << 33) のみ ON の場合（64ビット超）", () => {
      const result = parsePermissions("8589934592");

      expect(result.administrator).toBe(false);
      expect(result.manageEvents).toBe(true);
      expect(result.manageRoles).toBe(false);
      expect(result.raw).toBe(8589934592n);
    });
  });

  describe("raw フィールド", () => {
    it("元のビットフィールド値をBigIntとしてrawに保持する", () => {
      const result = parsePermissions("2146958847");
      expect(result.raw).toBe(2146958847n);
    });
  });

  describe("エッジケース", () => {
    it("不正な入力（非数値文字列）の場合はすべてのフラグを false として返す", () => {
      const result = parsePermissions("invalid");

      expect(result.administrator).toBe(false);
      expect(result.manageGuild).toBe(false);
      expect(result.manageChannels).toBe(false);
      expect(result.manageMessages).toBe(false);
      expect(result.manageRoles).toBe(false);
      expect(result.manageEvents).toBe(false);
      expect(result.raw).toBe(0n);
    });

    it("複数の権限が組み合わさったビットフィールドを正しく解析する", () => {
      // ADMINISTRATOR(8) + MANAGE_GUILD(32) = 40
      const result = parsePermissions("40");

      expect(result.administrator).toBe(true);
      expect(result.manageGuild).toBe(true);
      expect(result.manageChannels).toBe(false);
      expect(result.manageMessages).toBe(false);
    });
  });
});

describe("canManageGuild", () => {
  const basePermissions: DiscordPermissions = {
    administrator: false,
    manageGuild: false,
    manageChannels: false,
    manageMessages: false,
    manageRoles: false,
    manageEvents: false,
    raw: 0n,
  };

  it("administrator が true の場合に true を返す", () => {
    expect(canManageGuild({ ...basePermissions, administrator: true })).toBe(
      true
    );
  });

  it("manageGuild が true の場合に true を返す", () => {
    expect(canManageGuild({ ...basePermissions, manageGuild: true })).toBe(
      true
    );
  });

  it("manageMessages が true の場合に true を返す", () => {
    expect(canManageGuild({ ...basePermissions, manageMessages: true })).toBe(
      true
    );
  });

  it("manageRoles が true の場合に true を返す", () => {
    expect(canManageGuild({ ...basePermissions, manageRoles: true })).toBe(
      true
    );
  });

  it("すべての管理権限が false の場合に false を返す", () => {
    expect(canManageGuild(basePermissions)).toBe(false);
  });

  it("manageChannels のみ true でも false を返す（管理権限に含まれない）", () => {
    expect(
      canManageGuild({ ...basePermissions, manageChannels: true })
    ).toBe(false);
  });

  it("manageEvents のみ true でも false を返す（管理権限に含まれない）", () => {
    expect(canManageGuild({ ...basePermissions, manageEvents: true })).toBe(
      false
    );
  });

  it("複数の管理権限が true の場合も true を返す", () => {
    expect(
      canManageGuild({
        ...basePermissions,
        administrator: true,
        manageGuild: true,
      })
    ).toBe(true);
  });
});

describe("canInviteBot", () => {
  const basePermissions: DiscordPermissions = {
    administrator: false,
    manageGuild: false,
    manageChannels: false,
    manageMessages: false,
    manageRoles: false,
    manageEvents: false,
    raw: 0n,
  };

  it("administrator が true の場合に true を返す", () => {
    expect(canInviteBot({ ...basePermissions, administrator: true })).toBe(
      true
    );
  });

  it("manageGuild が true の場合に true を返す", () => {
    expect(canInviteBot({ ...basePermissions, manageGuild: true })).toBe(true);
  });

  it("administrator と manageGuild の両方が true の場合に true を返す", () => {
    expect(
      canInviteBot({
        ...basePermissions,
        administrator: true,
        manageGuild: true,
      })
    ).toBe(true);
  });

  it("すべての権限が false の場合に false を返す", () => {
    expect(canInviteBot(basePermissions)).toBe(false);
  });

  it("manageMessages のみ true でも false を返す（招待権限に含まれない）", () => {
    expect(canInviteBot({ ...basePermissions, manageMessages: true })).toBe(
      false
    );
  });

  it("manageRoles のみ true でも false を返す（招待権限に含まれない）", () => {
    expect(canInviteBot({ ...basePermissions, manageRoles: true })).toBe(
      false
    );
  });

  it("manageChannels のみ true でも false を返す（招待権限に含まれない）", () => {
    expect(canInviteBot({ ...basePermissions, manageChannels: true })).toBe(
      false
    );
  });

  it("manageEvents のみ true でも false を返す（招待権限に含まれない）", () => {
    expect(canInviteBot({ ...basePermissions, manageEvents: true })).toBe(
      false
    );
  });
});

describe("DISCORD_PERMISSION_FLAGS", () => {
  it("正しいビットフラグ値を持つ", () => {
    expect(DISCORD_PERMISSION_FLAGS.ADMINISTRATOR).toBe(1n << 3n);
    expect(DISCORD_PERMISSION_FLAGS.MANAGE_CHANNELS).toBe(1n << 4n);
    expect(DISCORD_PERMISSION_FLAGS.MANAGE_GUILD).toBe(1n << 5n);
    expect(DISCORD_PERMISSION_FLAGS.MANAGE_MESSAGES).toBe(1n << 13n);
    expect(DISCORD_PERMISSION_FLAGS.MANAGE_ROLES).toBe(1n << 28n);
    expect(DISCORD_PERMISSION_FLAGS.MANAGE_EVENTS).toBe(1n << 33n);
  });
});
