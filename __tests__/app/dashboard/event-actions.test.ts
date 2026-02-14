/**
 * イベント操作 Server Actions の権限チェックテスト
 *
 * Task 6.2: イベント操作の Server Actions に権限チェックを追加する
 * - 認証チェックの直後、DB 操作の前に権限チェックを実行
 * - 権限チェックに失敗した場合は PERMISSION_DENIED エラーを返す
 * - restricted フラグが無効なギルドでは既存の動作を維持
 *
 * Requirements: 4.1, 4.2, 4.3
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// モック設定
const mockGetUser = vi.fn();
const mockSupabase = {
  auth: {
    getUser: mockGetUser,
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

import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/app/dashboard/actions";

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
      permissionsBitfield: "8",
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
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: true,
    });

    const result = await createEventAction({
      guildId: "guild-1",
      permissionsBitfield: "0", // 権限なし
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
      permissionsBitfield: "8", // ADMINISTRATOR
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
      permissionsBitfield: "0", // 権限なし
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
      permissionsBitfield: "8",
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
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: true,
    });

    const result = await updateEventAction({
      eventId: "event-1",
      guildId: "guild-1",
      permissionsBitfield: "0",
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
      permissionsBitfield: "32", // MANAGE_GUILD
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
      permissionsBitfield: "0",
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
      permissionsBitfield: "8",
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
    mockGetGuildConfig.mockResolvedValueOnce({
      guildId: "guild-1",
      restricted: true,
    });

    const result = await deleteEventAction({
      eventId: "event-1",
      guildId: "guild-1",
      permissionsBitfield: "0",
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
      permissionsBitfield: "8", // ADMINISTRATOR
    });

    expect(result.success).toBe(true);
    expect(mockDeleteEvent).toHaveBeenCalledWith("event-1");
  });

  it("非 restricted ギルドでは権限に関係なくイベントを削除できる", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
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
      permissionsBitfield: "0",
    });

    expect(result.success).toBe(true);
    expect(mockDeleteEvent).toHaveBeenCalled();
  });
});
