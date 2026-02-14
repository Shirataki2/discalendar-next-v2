/**
 * useGuildPermissions のユニットテスト
 *
 * タスク5: 権限チェック用 React Hook の作成
 * - guildId, permissionsBitfield, restricted を入力として権限状態を計算する
 * - canManageGuild, isRestricted, canEditEvents を派生状態として返す
 * - ローディング状態とエラー状態を管理する
 * - ギルド切り替え時に権限情報を自動的に再計算する
 * - useMemo で不要な再計算を防止する
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DISCORD_PERMISSION_FLAGS } from "@/lib/discord/permissions";
import { useGuildPermissions } from "./use-guild-permissions";

// テスト用ビットフィールド値
const ADMINISTRATOR_BITFIELD = DISCORD_PERMISSION_FLAGS.ADMINISTRATOR.toString();
const MANAGE_GUILD_BITFIELD = DISCORD_PERMISSION_FLAGS.MANAGE_GUILD.toString();
const MANAGE_MESSAGES_BITFIELD =
  DISCORD_PERMISSION_FLAGS.MANAGE_MESSAGES.toString();
const MANAGE_ROLES_BITFIELD = DISCORD_PERMISSION_FLAGS.MANAGE_ROLES.toString();
const MANAGE_CHANNELS_ONLY_BITFIELD =
  DISCORD_PERMISSION_FLAGS.MANAGE_CHANNELS.toString();
const NO_PERMISSIONS_BITFIELD = "0";

describe("useGuildPermissions", () => {
  describe("初期状態 (Req 6.3)", () => {
    it("guildId が null の場合、全権限を false で返す", () => {
      const { result } = renderHook(() =>
        useGuildPermissions(null, null, false)
      );

      expect(result.current.canManageGuild).toBe(false);
      expect(result.current.isRestricted).toBe(false);
      expect(result.current.canEditEvents).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("guildId があるが permissionsBitfield が null の場合、ローディング状態を返す", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", null, false)
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.canManageGuild).toBe(false);
      expect(result.current.canEditEvents).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("canManageGuild 判定 (Req 6.1)", () => {
    it("administrator 権限がある場合、canManageGuild が true", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", ADMINISTRATOR_BITFIELD, false)
      );

      expect(result.current.canManageGuild).toBe(true);
    });

    it("manageGuild 権限がある場合、canManageGuild が true", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", MANAGE_GUILD_BITFIELD, false)
      );

      expect(result.current.canManageGuild).toBe(true);
    });

    it("manageMessages 権限がある場合、canManageGuild が true", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", MANAGE_MESSAGES_BITFIELD, false)
      );

      expect(result.current.canManageGuild).toBe(true);
    });

    it("manageRoles 権限がある場合、canManageGuild が true", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", MANAGE_ROLES_BITFIELD, false)
      );

      expect(result.current.canManageGuild).toBe(true);
    });

    it("manageChannels のみの場合、canManageGuild が false", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", MANAGE_CHANNELS_ONLY_BITFIELD, false)
      );

      expect(result.current.canManageGuild).toBe(false);
    });

    it("権限なし（0）の場合、canManageGuild が false", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", NO_PERMISSIONS_BITFIELD, false)
      );

      expect(result.current.canManageGuild).toBe(false);
    });
  });

  describe("isRestricted フラグ (Req 6.2)", () => {
    it("restricted が true の場合、isRestricted が true", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", ADMINISTRATOR_BITFIELD, true)
      );

      expect(result.current.isRestricted).toBe(true);
    });

    it("restricted が false の場合、isRestricted が false", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", ADMINISTRATOR_BITFIELD, false)
      );

      expect(result.current.isRestricted).toBe(false);
    });
  });

  describe("canEditEvents 判定 (Req 6.2)", () => {
    it("restricted が false の場合、権限に関わらず canEditEvents が true", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", NO_PERMISSIONS_BITFIELD, false)
      );

      expect(result.current.canEditEvents).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("restricted が true で管理権限がある場合、canEditEvents が true", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", ADMINISTRATOR_BITFIELD, true)
      );

      expect(result.current.canEditEvents).toBe(true);
    });

    it("restricted が true で管理権限がない場合、canEditEvents が false", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", NO_PERMISSIONS_BITFIELD, true)
      );

      expect(result.current.canEditEvents).toBe(false);
    });

    it("restricted が true で manageChannels のみの場合、canEditEvents が false", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", MANAGE_CHANNELS_ONLY_BITFIELD, true)
      );

      expect(result.current.canEditEvents).toBe(false);
    });
  });

  describe("ギルド切り替え時の再計算 (Req 6.4)", () => {
    it("guildId が変更されると権限情報が再計算される", () => {
      const { result, rerender } = renderHook(
        ({ guildId, permissions, restricted }) =>
          useGuildPermissions(guildId, permissions, restricted),
        {
          initialProps: {
            guildId: "guild-1",
            permissions: ADMINISTRATOR_BITFIELD,
            restricted: true,
          },
        }
      );

      expect(result.current.canManageGuild).toBe(true);
      expect(result.current.canEditEvents).toBe(true);

      // 別のギルドに切り替え（権限なし、restricted）
      rerender({
        guildId: "guild-2",
        permissions: NO_PERMISSIONS_BITFIELD,
        restricted: true,
      });

      expect(result.current.canManageGuild).toBe(false);
      expect(result.current.canEditEvents).toBe(false);
    });

    it("permissionsBitfield が変更されると再計算される", () => {
      const { result, rerender } = renderHook(
        ({ guildId, permissions, restricted }) =>
          useGuildPermissions(guildId, permissions, restricted),
        {
          initialProps: {
            guildId: "guild-1",
            permissions: NO_PERMISSIONS_BITFIELD,
            restricted: true,
          },
        }
      );

      expect(result.current.canEditEvents).toBe(false);

      // 権限が付与された
      rerender({
        guildId: "guild-1",
        permissions: ADMINISTRATOR_BITFIELD,
        restricted: true,
      });

      expect(result.current.canEditEvents).toBe(true);
    });

    it("restricted フラグが変更されると再計算される", () => {
      const { result, rerender } = renderHook(
        ({ guildId, permissions, restricted }) =>
          useGuildPermissions(guildId, permissions, restricted),
        {
          initialProps: {
            guildId: "guild-1",
            permissions: NO_PERMISSIONS_BITFIELD,
            restricted: true,
          },
        }
      );

      expect(result.current.canEditEvents).toBe(false);

      // restricted が解除された
      rerender({
        guildId: "guild-1",
        permissions: NO_PERMISSIONS_BITFIELD,
        restricted: false,
      });

      expect(result.current.canEditEvents).toBe(true);
    });

    it("guildId が null に変わるとローディングが false になる", () => {
      const { result, rerender } = renderHook(
        ({ guildId, permissions, restricted }) =>
          useGuildPermissions(guildId, permissions, restricted),
        {
          initialProps: {
            guildId: "guild-1" as string | null,
            permissions: ADMINISTRATOR_BITFIELD as string | null,
            restricted: false,
          },
        }
      );

      expect(result.current.canManageGuild).toBe(true);

      rerender({
        guildId: null,
        permissions: null,
        restricted: false,
      });

      expect(result.current.canManageGuild).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("useMemo による安定性", () => {
    it("入力が同じ場合、同じ参照を返す", () => {
      const { result, rerender } = renderHook(
        ({ guildId, permissions, restricted }) =>
          useGuildPermissions(guildId, permissions, restricted),
        {
          initialProps: {
            guildId: "guild-1",
            permissions: ADMINISTRATOR_BITFIELD,
            restricted: false,
          },
        }
      );

      const firstResult = result.current;

      // 同じ props で再レンダリング
      rerender({
        guildId: "guild-1",
        permissions: ADMINISTRATOR_BITFIELD,
        restricted: false,
      });

      expect(result.current).toBe(firstResult);
    });

    it("入力が変わると新しい参照を返す", () => {
      const { result, rerender } = renderHook(
        ({ guildId, permissions, restricted }) =>
          useGuildPermissions(guildId, permissions, restricted),
        {
          initialProps: {
            guildId: "guild-1",
            permissions: ADMINISTRATOR_BITFIELD,
            restricted: false,
          },
        }
      );

      const firstResult = result.current;

      rerender({
        guildId: "guild-2",
        permissions: ADMINISTRATOR_BITFIELD,
        restricted: false,
      });

      expect(result.current).not.toBe(firstResult);
    });
  });

  describe("エッジケース", () => {
    it("空文字列の permissionsBitfield はフェイルセーフで全権限拒否", () => {
      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", "", false)
      );

      expect(result.current.canManageGuild).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it("複合権限ビットフィールドが正しく解析される", () => {
      const combined = (
        DISCORD_PERMISSION_FLAGS.ADMINISTRATOR |
        DISCORD_PERMISSION_FLAGS.MANAGE_EVENTS
      ).toString();

      const { result } = renderHook(() =>
        useGuildPermissions("guild-123", combined, false)
      );

      expect(result.current.canManageGuild).toBe(true);
    });
  });
});
