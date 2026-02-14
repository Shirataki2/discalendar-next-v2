/**
 * イベント操作 Server Actions の権限チェックテスト
 *
 * Task 6.2: イベント操作の Server Actions に権限チェックを追加する
 * - サーバー側で Discord 権限を解決（クライアント入力を信頼しない）
 * - 権限チェックに失敗した場合は PERMISSION_DENIED エラーを返す
 * - restricted フラグが無効なギルドでは既存の動作を維持
 *
 * Requirements: 4.1, 4.2, 4.3
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// モック設定
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockSupabase = {
  auth: {
    getUser: mockGetUser,
    getSession: mockGetSession,
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const mockGetGuildConfig = vi.fn();
vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: vi.fn(() => ({
    getGuildConfig: mockGetGuildConfig,
    upsertGuildConfig: vi.fn(),
  })),
}));

const mockCreateEvent = vi.fn();
const mockUpdateEvent = vi.fn();
const mockDeleteEvent = vi.fn();
vi.mock("@/lib/calendar/event-service", () => ({
  createEventService: vi.fn(() => ({
    createEvent: mockCreateEvent,
    updateEvent: mockUpdateEvent,
    deleteEvent: mockDeleteEvent,
    fetchEvents: vi.fn(),
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// getCachedGuilds モック
const mockGetCachedGuilds = vi.fn();
vi.mock("@/lib/guilds/cache", () => ({
  getCachedGuilds: (...args: unknown[]) => mockGetCachedGuilds(...args),
}));

// getUserGuilds モック
const mockGetUserGuilds = vi.fn();
vi.mock("@/lib/discord/client", () => ({
  getUserGuilds: (...args: unknown[]) => mockGetUserGuilds(...args),
}));

import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/app/dashboard/actions";

/** テスト用ヘルパー: 権限なしのキャッシュを設定 */
function setupCacheWithNoPermissions(guildId: string) {
  mockGetCachedGuilds.mockReturnValueOnce([
    {
      guildId,
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
  ]);
}

/** テスト用ヘルパー: ADMINISTRATOR 権限ありのキャッシュを設定 */
function setupCacheWithAdminPermissions(guildId: string) {
  mockGetCachedGuilds.mockReturnValueOnce([
    {
      guildId,
      name: "Test Guild",
      permissions: {
        administrator: true,
        manageGuild: false,
        manageChannels: false,
        manageMessages: false,
        manageRoles: false,
        manageEvents: false,
        raw: 8n,
      },
    },
  ]);
}

describe("createEventAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証の場合 UNAUTHORIZED エラーを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const result = await createEventAction({
      guildId: "guild-1",
      eventData: {
        guildId: "guild-1",
        title: "Test Event",
        startAt: new Date("2026-03-01T10:00:00Z"),
        endAt: new Date("2026-03-01T11:00:00Z"),
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it("restricted ギルドで管理権限がない場合 PERMISSION_DENIED を返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: true,
    });

    const result = await createEventAction({
      guildId: "guild-1",
      eventData: {
        guildId: "guild-1",
        title: "Test Event",
        startAt: new Date("2026-03-01T10:00:00Z"),
        endAt: new Date("2026-03-01T11:00:00Z"),
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it("restricted ギルドで管理権限がある場合にイベントを作成する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithAdminPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: true,
    });
    mockCreateEvent.mockResolvedValueOnce({
      success: true,
      data: {
        id: "event-1",
        guildId: "guild-1",
        title: "Test Event",
        start: new Date("2026-03-01T10:00:00Z"),
        end: new Date("2026-03-01T11:00:00Z"),
      },
    });

    const eventData = {
      guildId: "guild-1",
      title: "Test Event",
      startAt: new Date("2026-03-01T10:00:00Z"),
      endAt: new Date("2026-03-01T11:00:00Z"),
    };

    const result = await createEventAction({
      guildId: "guild-1",
      eventData,
    });

    expect(result.success).toBe(true);
    expect(mockCreateEvent).toHaveBeenCalledWith(eventData);
  });

  it("非 restricted ギルドでは権限に関係なくイベントを作成できる", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: false,
    });
    mockCreateEvent.mockResolvedValueOnce({
      success: true,
      data: { id: "event-1" },
    });

    const result = await createEventAction({
      guildId: "guild-1",
      eventData: {
        guildId: "guild-1",
        title: "Test Event",
        startAt: new Date("2026-03-01T10:00:00Z"),
        endAt: new Date("2026-03-01T11:00:00Z"),
      },
    });

    expect(result.success).toBe(true);
    expect(mockCreateEvent).toHaveBeenCalled();
  });
});

describe("updateEventAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証の場合 UNAUTHORIZED エラーを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const result = await updateEventAction({
      eventId: "event-1",
      guildId: "guild-1",
      eventData: { title: "Updated" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it("restricted ギルドで管理権限がない場合 PERMISSION_DENIED を返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: true,
    });

    const result = await updateEventAction({
      eventId: "event-1",
      guildId: "guild-1",
      eventData: { title: "Updated" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it("restricted ギルドで管理権限がある場合にイベントを更新する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithAdminPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: true,
    });
    mockUpdateEvent.mockResolvedValueOnce({
      success: true,
      data: { id: "event-1", title: "Updated" },
    });

    const result = await updateEventAction({
      eventId: "event-1",
      guildId: "guild-1",
      eventData: { title: "Updated" },
    });

    expect(result.success).toBe(true);
    expect(mockUpdateEvent).toHaveBeenCalledWith("event-1", {
      title: "Updated",
    });
  });

  it("非 restricted ギルドでは権限に関係なくイベントを更新できる", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: false,
    });
    mockUpdateEvent.mockResolvedValueOnce({
      success: true,
      data: { id: "event-1" },
    });

    const result = await updateEventAction({
      eventId: "event-1",
      guildId: "guild-1",
      eventData: { title: "Updated" },
    });

    expect(result.success).toBe(true);
    expect(mockUpdateEvent).toHaveBeenCalled();
  });
});

describe("deleteEventAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証の場合 UNAUTHORIZED エラーを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const result = await deleteEventAction({
      eventId: "event-1",
      guildId: "guild-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("restricted ギルドで管理権限がない場合 PERMISSION_DENIED を返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: true,
    });

    const result = await deleteEventAction({
      eventId: "event-1",
      guildId: "guild-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("restricted ギルドで管理権限がある場合にイベントを削除する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithAdminPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: true,
    });
    mockDeleteEvent.mockResolvedValueOnce({
      success: true,
      data: undefined,
    });

    const result = await deleteEventAction({
      eventId: "event-1",
      guildId: "guild-1",
    });

    expect(result.success).toBe(true);
    expect(mockDeleteEvent).toHaveBeenCalledWith("event-1");
  });

  it("非 restricted ギルドでは権限に関係なくイベントを削除できる", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: false,
    });
    mockDeleteEvent.mockResolvedValueOnce({
      success: true,
      data: undefined,
    });

    const result = await deleteEventAction({
      eventId: "event-1",
      guildId: "guild-1",
    });

    expect(result.success).toBe(true);
    expect(mockDeleteEvent).toHaveBeenCalled();
  });
});
