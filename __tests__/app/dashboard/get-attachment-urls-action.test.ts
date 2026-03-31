/**
 * Task 6.1: getAttachmentUrlsAction テスト
 *
 * TDD RED: Server Action経由でSigned URLを取得する機能を検証する
 *
 * Requirements:
 * - 3.1, 3.2: 認証・ギルドメンバーシップチェック
 * - 6.1, 6.2: イベント表示時のSigned URL取得
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttachmentMeta } from "@/lib/calendar/attachment-types";

// ──────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────

const mockGetSignedUrls = vi.fn();
vi.mock("@/lib/calendar/attachment-service", () => ({
  createAttachmentService: vi.fn(() => ({
    getSignedUrls: mockGetSignedUrls,
    deleteFiles: vi.fn(),
  })),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      getSession: vi.fn().mockResolvedValue({
        data: { session: { provider_token: "token" } },
      }),
    },
    storage: { from: vi.fn() },
  })),
}));

// resolveServerAuth が内部で使う依存をモック
vi.mock("@/lib/guilds/cache", () => ({
  getCachedGuilds: vi.fn(() => ({
    guilds: [
      {
        guildId: "guild-123",
        permissions: { administrator: true, manageGuild: true },
      },
    ],
  })),
  clearCache: vi.fn(),
}));

vi.mock("@/lib/guilds/user-guilds-service", () => ({
  createUserGuildsService: vi.fn(() => ({
    getUserGuildPermissions: vi.fn().mockResolvedValue({
      success: true,
      data: null,
    }),
    upsertUserGuild: vi.fn(),
  })),
}));

vi.mock("@/lib/discord/client", () => ({
  getUserGuilds: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/discord/notification-channel-service", () => ({
  getGuildChannels: vi.fn(),
}));

vi.mock("@/lib/guilds/fetch-guilds", () => ({
  fetchGuilds: vi.fn(),
}));

vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: vi.fn(),
}));

vi.mock("@/lib/guilds/event-settings-service", () => ({
  createEventSettingsService: vi.fn(),
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
  createPublicCalendarService: vi.fn(),
}));

vi.mock("@/lib/calendar/rsvp-service", () => ({
  createRsvpService: vi.fn(),
}));

vi.mock("@/lib/ics/ics-feed-token-service", () => ({
  createIcsFeedTokenService: vi.fn(),
}));

describe("Task 6.1: getAttachmentUrlsAction", () => {
  const sampleAttachments: AttachmentMeta[] = [
    {
      name: "poster.jpg",
      path: "guild-123/event-1/uuid_poster.jpg",
      type: "image/jpeg",
      size: 1024,
    },
    {
      name: "map.pdf",
      path: "guild-123/event-1/uuid_map.pdf",
      type: "application/pdf",
      size: 2048,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
  });

  it("認証済みギルドメンバーに対してSigned URLを返す", async () => {
    const { getAttachmentUrlsAction } = await import("@/app/dashboard/actions");

    mockGetSignedUrls.mockResolvedValueOnce({
      success: true,
      data: [
        {
          path: "guild-123/event-1/uuid_poster.jpg",
          signedUrl: "https://signed-url-1",
        },
        {
          path: "guild-123/event-1/uuid_map.pdf",
          signedUrl: "https://signed-url-2",
        },
      ],
    });

    const result = await getAttachmentUrlsAction({
      guildId: "guild-123",
      attachments: sampleAttachments,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].signedUrl).toBe("https://signed-url-1");
    }
  });

  it("空の添付配列に対して空配列を返す", async () => {
    const { getAttachmentUrlsAction } = await import("@/app/dashboard/actions");

    const result = await getAttachmentUrlsAction({
      guildId: "guild-123",
      attachments: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("未認証の場合はエラーを返す", async () => {
    const { getAttachmentUrlsAction } = await import("@/app/dashboard/actions");

    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const result = await getAttachmentUrlsAction({
      guildId: "guild-123",
      attachments: sampleAttachments,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("Signed URL生成失敗時にエラーを返す", async () => {
    const { getAttachmentUrlsAction } = await import("@/app/dashboard/actions");

    mockGetSignedUrls.mockResolvedValueOnce({
      success: false,
      error: {
        code: "FETCH_FAILED",
        message: "添付ファイルのURLを取得できませんでした。",
        details: "Storage error",
      },
    });

    const result = await getAttachmentUrlsAction({
      guildId: "guild-123",
      attachments: sampleAttachments,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FETCH_FAILED");
      // details はクライアントに漏洩しない
      expect(result.error).not.toHaveProperty("details");
    }
  });
});
