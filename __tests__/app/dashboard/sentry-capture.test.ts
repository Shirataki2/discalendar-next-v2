/**
 * Dashboard Server Actions の Sentry captureException テスト
 *
 * DIS-154: サービスエラー時に captureException が呼ばれることを検証。
 * バリデーショ��・認証エラーではキャプチャされないことも検証。
 *
 * Requirements: 1.1, 1.4, 2.1, 2.3, 3.1
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ──────────────────────────────────────────────
// Mocks - closure wrapper pattern で vi.mock ホイスティング対応
// ──────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockGetCachedGuilds = vi.fn();
const mockUpsertGuildConfig = vi.fn();
const mockUpsertEventSettings = vi.fn();
const mockEnablePublicCalendar = vi.fn();
const mockDisablePublicCalendar = vi.fn();
const mockRegeneratePublicSlug = vi.fn();
const mockGetPublicSettings = vi.fn();
const mockGetOrCreateToken = vi.fn();
const mockRegenerateToken = vi.fn();
const mockGetGuildChannels = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/guilds/cache", () => ({
  getCachedGuilds: (...args: unknown[]) => mockGetCachedGuilds(...args),
  clearCache: vi.fn(),
}));

vi.mock("@/lib/discord/client", () => ({
  getUserGuilds: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock("@/lib/guilds/user-guilds-service", () => ({
  createUserGuildsService: vi.fn(() => ({
    getUserGuildPermissions: vi.fn(),
    syncUserGuilds: vi.fn(),
    upsertSingleGuild: vi.fn(),
  })),
}));

vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: vi.fn(() => ({
    getGuildConfig: vi.fn(),
    upsertGuildConfig: (...args: unknown[]) =>
      mockUpsertGuildConfig(...args),
  })),
}));

vi.mock("@/lib/guilds/event-settings-service", () => ({
  createEventSettingsService: vi.fn(() => ({
    upsertEventSettings: (...args: unknown[]) =>
      mockUpsertEventSettings(...args),
  })),
}));

vi.mock("@/lib/calendar/event-service", async () => {
  const actual = await vi.importActual("@/lib/calendar/event-service");
  return {
    ...actual,
    createEventService: vi.fn(),
  };
});

vi.mock("@/lib/calendar/permission-check", () => ({
  checkEventPermission: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/lib/calendar/public-calendar-service", () => ({
  createPublicCalendarService: vi.fn(() => ({
    enablePublicCalendar: (...args: unknown[]) =>
      mockEnablePublicCalendar(...args),
    disablePublicCalendar: (...args: unknown[]) =>
      mockDisablePublicCalendar(...args),
    regeneratePublicSlug: (...args: unknown[]) =>
      mockRegeneratePublicSlug(...args),
    getPublicSettings: (...args: unknown[]) =>
      mockGetPublicSettings(...args),
  })),
}));

vi.mock("@/lib/calendar/rsvp-service", () => ({
  createRsvpService: vi.fn(),
}));

vi.mock("@/lib/ics/ics-feed-token-service", () => ({
  createIcsFeedTokenService: vi.fn(() => ({
    getOrCreateToken: (...args: unknown[]) =>
      mockGetOrCreateToken(...args),
    regenerateToken: (...args: unknown[]) => mockRegenerateToken(...args),
    buildFeedUrl: vi.fn(() => "https://example.com/feed"),
  })),
}));

vi.mock("@/lib/discord/notification-channel-service", () => ({
  getGuildChannels: (...args: unknown[]) =>
    mockGetGuildChannels(...args),
}));

vi.mock("@/lib/guilds/fetch-guilds", () => ({
  fetchGuilds: vi.fn(),
}));

vi.mock("@/lib/calendar/attachment-service", () => ({
  createAttachmentService: vi.fn(() => ({
    getSignedUrls: vi.fn(),
    deleteFiles: vi.fn(),
  })),
}));

import { captureException } from "@sentry/nextjs";
import {
  fetchGuildChannels,
  getOrCreateIcsFeedToken,
  regenerateIcsFeedToken,
  regeneratePublicSlugAction,
  togglePublicCalendar,
  updateGuildConfig,
  updateNotificationChannel,
} from "@/app/dashboard/actions";

// ──────────────────────────────────────────────
// テスト用定数
// ──────────────────────────────────────────────

const TEST_GUILD_ID = "11111111111111111";

/** resolveServerAuth が成功するようにセットアップ（管理権限��り） */
function setupAuthWithManageGuild() {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: "user-1" } },
    error: null,
  });
  mockGetSession.mockResolvedValueOnce({
    data: { session: { provider_token: "token" } },
  });
  mockGetCachedGuilds.mockReturnValueOnce({
    guilds: [
      {
        guildId: TEST_GUILD_ID,
        name: "Test Guild",
        permissions: {
          administrator: true,
          manageGuild: true,
          manageChannels: true,
          manageMessages: false,
          manageRoles: false,
          manageEvents: false,
          raw: 0x20n,
        },
      },
    ],
    invitableGuilds: [],
  });
}

/** resolveServerAuth が成功するようにセットアップ（管理権限なし） */
function setupAuthWithoutManageGuild() {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: "user-1" } },
    error: null,
  });
  mockGetSession.mockResolvedValueOnce({
    data: { session: { provider_token: "token" } },
  });
  mockGetCachedGuilds.mockReturnValueOnce({
    guilds: [
      {
        guildId: TEST_GUILD_ID,
        name: "Test Guild",
        permissions: {
          administrator: false,
          manageGuild: false,
          manageChannels: false,
          manageMessages: false,
          manageRoles: false,
          manageEvents: false,
          raw: 0n,
        },
      },
    ],
    invitableGuilds: [],
  });
}

describe("Dashboard Actions Sentry captureException", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // updateGuildConfig
  // ──────────────────────────────────────────────

  describe("updateGuildConfig", () => {
    it("サービスエラー時に captureException を呼ぶ", async () => {
      setupAuthWithManageGuild();
      mockUpsertGuildConfig.mockResolvedValueOnce({
        success: false,
        error: {
          code: "DB_ERROR",
          message: "connection timeout",
          details: "detail info",
        },
      });

      await updateGuildConfig({
        guildId: TEST_GUILD_ID,
        restricted: true,
      });

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("[updateGuildConfig]"),
        })
      );
    });

    it("成功時に captureException を呼ばない", async () => {
      setupAuthWithManageGuild();
      mockUpsertGuildConfig.mockResolvedValueOnce({
        success: true,
        data: { guildId: TEST_GUILD_ID, restricted: true },
      });

      await updateGuildConfig({
        guildId: TEST_GUILD_ID,
        restricted: true,
      });

      expect(captureException).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // updateNotificationChannel
  // ──────────────────────────────────────────────

  describe("updateNotificationChannel", () => {
    it("サービスエラー時に captureException を呼ぶ", async () => {
      setupAuthWithManageGuild();
      mockUpsertEventSettings.mockResolvedValueOnce({
        success: false,
        error: {
          code: "DB_ERROR",
          message: "upsert failed",
          details: "detail info",
        },
      });

      await updateNotificationChannel({
        guildId: TEST_GUILD_ID,
        channelId: "22222222222222222",
      });

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("[updateNotificationChannel]"),
        })
      );
    });

    it("バリデーションエラー時に captureException を呼ばない", async () => {
      await updateNotificationChannel({
        guildId: "invalid",
        channelId: "22222222222222222",
      });

      expect(captureException).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // togglePublicCalendar
  // ──────────────────────────────────────────────

  describe("togglePublicCalendar", () => {
    it("enable 失敗時に captureException を呼ぶ", async () => {
      setupAuthWithManageGuild();
      mockEnablePublicCalendar.mockResolvedValueOnce({
        success: false,
        error: { code: "DB_ERROR", message: "enable failed" },
      });

      await togglePublicCalendar({
        guildId: TEST_GUILD_ID,
        enabled: true,
      });

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("[togglePublicCalendar] enable"),
        })
      );
    });

    it("disable 失敗時に captureException を呼ぶ", async () => {
      setupAuthWithManageGuild();
      mockDisablePublicCalendar.mockResolvedValueOnce({
        success: false,
        error: { code: "DB_ERROR", message: "disable failed" },
      });

      await togglePublicCalendar({
        guildId: TEST_GUILD_ID,
        enabled: false,
      });

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("[togglePublicCalendar] disable"),
        })
      );
    });

    it("権限不足時に captureException を呼ばない", async () => {
      setupAuthWithoutManageGuild();

      const result = await togglePublicCalendar({
        guildId: TEST_GUILD_ID,
        enabled: true,
      });

      expect(result.success).toBe(false);
      expect(captureException).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // regeneratePublicSlugAction
  // ──────────────────────────────────────────────

  describe("regeneratePublicSlugAction", () => {
    it("サービスエラー時に captureException を呼ぶ", async () => {
      setupAuthWithManageGuild();
      mockRegeneratePublicSlug.mockResolvedValueOnce({
        success: false,
        error: { code: "DB_ERROR", message: "regenerate failed" },
      });

      await regeneratePublicSlugAction({ guildId: TEST_GUILD_ID });

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("[regeneratePublicSlugAction]"),
        })
      );
    });
  });

  // ──────────────────────────────────────────────
  // fetchGuildChannels
  // ──────────────────────────────────────────────

  describe("fetchGuildChannels", () => {
    it("チャンネル取得エラー時に captureException を呼ぶ", async () => {
      setupAuthWithManageGuild();
      mockGetGuildChannels.mockResolvedValueOnce({
        success: false,
        error: { code: "API_ERROR", message: "Discord API failed" },
      });

      await fetchGuildChannels(TEST_GUILD_ID);

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("[fetchGuildChannels]"),
        })
      );
    });
  });

  // ──────────────────────────────────────────────
  // getOrCreateIcsFeedToken
  // ──────────────────────────────────────────────

  describe("getOrCreateIcsFeedToken", () => {
    it("トークン取得エラー時に captureException を呼ぶ", async () => {
      setupAuthWithManageGuild();
      mockGetPublicSettings.mockResolvedValueOnce({
        success: true,
        data: { isPublic: false },
      });
      mockGetOrCreateToken.mockResolvedValueOnce({
        success: false,
        error: { code: "DB_ERROR", message: "token creation failed" },
      });

      await getOrCreateIcsFeedToken(TEST_GUILD_ID);

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("[getOrCreateIcsFeedToken]"),
        })
      );
    });
  });

  // ──────────────────────────────────────────────
  // regenerateIcsFeedToken
  // ──────────────────────────────────────────────

  describe("regenerateIcsFeedToken", () => {
    it("トークン再生成エラー時に captureException を呼ぶ", async () => {
      setupAuthWithManageGuild();
      mockGetPublicSettings.mockResolvedValueOnce({
        success: false,
        data: null,
      });
      mockRegenerateToken.mockResolvedValueOnce({
        success: false,
        error: { code: "DB_ERROR", message: "regenerate failed" },
      });

      await regenerateIcsFeedToken(TEST_GUILD_ID);

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("[regenerateIcsFeedToken]"),
        })
      );
    });
  });
});
