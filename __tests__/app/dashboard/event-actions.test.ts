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
const mockCreateRecurringSeries = vi.fn();
const mockUpdateOccurrence = vi.fn();
const mockDeleteOccurrence = vi.fn();
const mockUpdateSeries = vi.fn();
const mockDeleteSeries = vi.fn();
const mockSplitSeries = vi.fn();
const mockTruncateSeries = vi.fn();
vi.mock("@/lib/calendar/event-service", () => ({
  createEventService: vi.fn(() => ({
    createEvent: mockCreateEvent,
    updateEvent: mockUpdateEvent,
    deleteEvent: mockDeleteEvent,
    createRecurringSeries: mockCreateRecurringSeries,
    updateOccurrence: mockUpdateOccurrence,
    deleteOccurrence: mockDeleteOccurrence,
    updateSeries: mockUpdateSeries,
    deleteSeries: mockDeleteSeries,
    splitSeries: mockSplitSeries,
    truncateSeries: mockTruncateSeries,
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
  createRecurringEventAction,
  deleteEventAction,
  deleteOccurrenceAction,
  updateEventAction,
  updateOccurrenceAction,
} from "@/app/dashboard/actions";

/** テスト用シリーズ入力 */
const sampleSeriesInput = {
  guildId: "guild-1",
  title: "Weekly Meeting",
  startAt: new Date("2026-03-01T10:00:00Z"),
  endAt: new Date("2026-03-01T11:00:00Z"),
  rrule: "FREQ=WEEKLY;BYDAY=TU",
};

/** テスト用シリーズレコード */
const sampleSeriesRecord = {
  id: "series-1",
  guild_id: "guild-1",
  name: "Weekly Meeting",
  description: null,
  color: "#3B82F6",
  is_all_day: false,
  rrule: "FREQ=WEEKLY;BYDAY=TU",
  dtstart: "2026-03-01T10:00:00Z",
  duration_minutes: 60,
  location: null,
  channel_id: null,
  channel_name: null,
  notifications: [],
  exdates: [],
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

/** テスト用ヘルパー: 権限なしのキャッシュを設定 */
function setupCacheWithNoPermissions(guildId: string) {
  mockGetCachedGuilds.mockReturnValueOnce({
    guilds: [
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
    ],
    invitableGuilds: [],
  });
}

/** テスト用ヘルパー: ADMINISTRATOR 権限ありのキャッシュを設定 */
function setupCacheWithAdminPermissions(guildId: string) {
  mockGetCachedGuilds.mockReturnValueOnce({
    guilds: [
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
    ],
    invitableGuilds: [],
  });
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
      success: true,
      data: { guildId: "guild-1", restricted: true },
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
      success: true,
      data: { guildId: "guild-1", restricted: true },
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
      success: true,
      data: { guildId: "guild-1", restricted: false },
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
      success: true,
      data: { guildId: "guild-1", restricted: true },
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
      success: true,
      data: { guildId: "guild-1", restricted: true },
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
    expect(mockUpdateEvent).toHaveBeenCalledWith("guild-1", "event-1", {
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
      success: true,
      data: { guildId: "guild-1", restricted: false },
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
      success: true,
      data: { guildId: "guild-1", restricted: true },
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
      success: true,
      data: { guildId: "guild-1", restricted: true },
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
    expect(mockDeleteEvent).toHaveBeenCalledWith("guild-1", "event-1");
  });

  it("非 restricted ギルドでは権限に関係なくイベントを削除できる", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: false },
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

describe("createRecurringEventAction", () => {
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

    const result = await createRecurringEventAction({
      guildId: "guild-1",
      eventData: sampleSeriesInput,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockCreateRecurringSeries).not.toHaveBeenCalled();
  });

  it("restricted ギルドで管理権限がない場合 PERMISSION_DENIED を返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: true },
    });

    const result = await createRecurringEventAction({
      guildId: "guild-1",
      eventData: sampleSeriesInput,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(mockCreateRecurringSeries).not.toHaveBeenCalled();
  });

  it("restricted ギルドで管理権限がある場合にシリーズを作成する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithAdminPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: true },
    });
    mockCreateRecurringSeries.mockResolvedValueOnce({
      success: true,
      data: sampleSeriesRecord,
    });

    const result = await createRecurringEventAction({
      guildId: "guild-1",
      eventData: sampleSeriesInput,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("series-1");
      expect(result.data.rrule).toBe("FREQ=WEEKLY;BYDAY=TU");
    }
    expect(mockCreateRecurringSeries).toHaveBeenCalledWith(sampleSeriesInput);
  });

  it("非 restricted ギルドでは権限に関係なくシリーズを作成できる", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: false },
    });
    mockCreateRecurringSeries.mockResolvedValueOnce({
      success: true,
      data: sampleSeriesRecord,
    });

    const result = await createRecurringEventAction({
      guildId: "guild-1",
      eventData: sampleSeriesInput,
    });

    expect(result.success).toBe(true);
    expect(mockCreateRecurringSeries).toHaveBeenCalledWith(sampleSeriesInput);
  });

  it("EventService がエラーを返した場合にそのエラーを伝播する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithAdminPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: false },
    });
    mockCreateRecurringSeries.mockResolvedValueOnce({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "不正なRRULE文字列です。",
      },
    });

    const result = await createRecurringEventAction({
      guildId: "guild-1",
      eventData: sampleSeriesInput,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("既存の createEventAction に影響しない", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: false },
    });
    mockCreateEvent.mockResolvedValueOnce({
      success: true,
      data: { id: "event-1" },
    });

    const result = await createEventAction({
      guildId: "guild-1",
      eventData: {
        guildId: "guild-1",
        title: "Single Event",
        startAt: new Date("2026-03-01T10:00:00Z"),
        endAt: new Date("2026-03-01T11:00:00Z"),
      },
    });

    expect(result.success).toBe(true);
    expect(mockCreateEvent).toHaveBeenCalled();
    expect(mockCreateRecurringSeries).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────
// Task 4.2: オカレンス編集・削除アクション
// ──────────────────────────────────────────────

/** テスト用: 認証済み + 権限あり状態をセットアップ */
function setupAuthorizedUser(guildId: string) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: "user-1" } },
    error: null,
  });
  setupCacheWithAdminPermissions(guildId);
  mockGetGuildConfig.mockResolvedValueOnce({
    success: true,
    data: { guildId, restricted: false },
  });
}

/** テスト用オカレンス日付 */
const sampleOccurrenceDate = new Date("2026-03-08T10:00:00Z");

/** テスト用更新データ（単一オカレンス向け） */
const sampleEventUpdate = { title: "Updated Title" };

/** テスト用更新データ（シリーズ向け） */
const sampleSeriesUpdate = {
  title: "Updated Series",
  rrule: "FREQ=WEEKLY;BYDAY=WE",
};

/** テスト用CalendarEventレスポンス */
const sampleCalendarEvent = {
  id: "event-exc-1",
  title: "Updated Title",
  start: new Date("2026-03-08T10:00:00Z"),
  end: new Date("2026-03-08T11:00:00Z"),
  allDay: false,
  color: "#3B82F6",
  seriesId: "series-1",
  isRecurring: true,
  originalDate: sampleOccurrenceDate,
};

describe("updateOccurrenceAction", () => {
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

    const result = await updateOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "this",
      occurrenceDate: sampleOccurrenceDate,
      eventData: sampleEventUpdate,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockUpdateOccurrence).not.toHaveBeenCalled();
    expect(mockUpdateSeries).not.toHaveBeenCalled();
    expect(mockSplitSeries).not.toHaveBeenCalled();
  });

  it("restricted ギルドで管理権限がない場合 PERMISSION_DENIED を返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: true },
    });

    const result = await updateOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "this",
      occurrenceDate: sampleOccurrenceDate,
      eventData: sampleEventUpdate,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(mockUpdateOccurrence).not.toHaveBeenCalled();
  });

  it("scope 'this' の場合 updateOccurrence に委譲する", async () => {
    setupAuthorizedUser("guild-1");
    mockUpdateOccurrence.mockResolvedValueOnce({
      success: true,
      data: sampleCalendarEvent,
    });

    const result = await updateOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "this",
      occurrenceDate: sampleOccurrenceDate,
      eventData: sampleEventUpdate,
    });

    expect(result.success).toBe(true);
    expect(mockUpdateOccurrence).toHaveBeenCalledWith(
      "guild-1",
      "series-1",
      sampleOccurrenceDate,
      sampleEventUpdate
    );
    expect(mockUpdateSeries).not.toHaveBeenCalled();
    expect(mockSplitSeries).not.toHaveBeenCalled();
  });

  it("scope 'all' の場合 updateSeries に委譲する", async () => {
    setupAuthorizedUser("guild-1");
    mockUpdateSeries.mockResolvedValueOnce({
      success: true,
      data: { ...sampleSeriesRecord, name: "Updated Series" },
    });

    const result = await updateOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "all",
      occurrenceDate: sampleOccurrenceDate,
      eventData: sampleSeriesUpdate,
    });

    expect(result.success).toBe(true);
    expect(mockUpdateSeries).toHaveBeenCalledWith(
      "guild-1",
      "series-1",
      sampleSeriesUpdate
    );
    expect(mockUpdateOccurrence).not.toHaveBeenCalled();
    expect(mockSplitSeries).not.toHaveBeenCalled();
  });

  it("scope 'following' の場合 splitSeries に委譲する", async () => {
    setupAuthorizedUser("guild-1");
    const newSeriesRecord = {
      ...sampleSeriesRecord,
      id: "series-2",
      dtstart: "2026-03-08T10:00:00Z",
    };
    mockSplitSeries.mockResolvedValueOnce({
      success: true,
      data: newSeriesRecord,
    });

    const result = await updateOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "following",
      occurrenceDate: sampleOccurrenceDate,
      eventData: sampleSeriesUpdate,
    });

    expect(result.success).toBe(true);
    expect(mockSplitSeries).toHaveBeenCalledWith(
      "guild-1",
      "series-1",
      sampleOccurrenceDate,
      sampleSeriesUpdate
    );
    expect(mockUpdateOccurrence).not.toHaveBeenCalled();
    expect(mockUpdateSeries).not.toHaveBeenCalled();
  });

  it("EventService がエラーを返した場合にそのエラーを伝播する", async () => {
    setupAuthorizedUser("guild-1");
    mockUpdateOccurrence.mockResolvedValueOnce({
      success: false,
      error: {
        code: "SERIES_NOT_FOUND",
        message: "指定されたイベントシリーズが見つかりません。",
      },
    });

    const result = await updateOccurrenceAction({
      guildId: "guild-1",
      seriesId: "nonexistent",
      scope: "this",
      occurrenceDate: sampleOccurrenceDate,
      eventData: sampleEventUpdate,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SERIES_NOT_FOUND");
    }
  });
});

describe("deleteOccurrenceAction", () => {
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

    const result = await deleteOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "this",
      occurrenceDate: sampleOccurrenceDate,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockDeleteOccurrence).not.toHaveBeenCalled();
    expect(mockDeleteSeries).not.toHaveBeenCalled();
    expect(mockTruncateSeries).not.toHaveBeenCalled();
  });

  it("restricted ギルドで管理権限がない場合 PERMISSION_DENIED を返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: true },
    });

    const result = await deleteOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "this",
      occurrenceDate: sampleOccurrenceDate,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(mockDeleteOccurrence).not.toHaveBeenCalled();
  });

  it("scope 'this' の場合 deleteOccurrence に委譲する", async () => {
    setupAuthorizedUser("guild-1");
    mockDeleteOccurrence.mockResolvedValueOnce({
      success: true,
      data: undefined,
    });

    const result = await deleteOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "this",
      occurrenceDate: sampleOccurrenceDate,
    });

    expect(result.success).toBe(true);
    expect(mockDeleteOccurrence).toHaveBeenCalledWith(
      "guild-1",
      "series-1",
      sampleOccurrenceDate
    );
    expect(mockDeleteSeries).not.toHaveBeenCalled();
    expect(mockTruncateSeries).not.toHaveBeenCalled();
  });

  it("scope 'all' の場合 deleteSeries に委譲する", async () => {
    setupAuthorizedUser("guild-1");
    mockDeleteSeries.mockResolvedValueOnce({
      success: true,
      data: undefined,
    });

    const result = await deleteOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "all",
      occurrenceDate: sampleOccurrenceDate,
    });

    expect(result.success).toBe(true);
    expect(mockDeleteSeries).toHaveBeenCalledWith("guild-1", "series-1");
    expect(mockDeleteOccurrence).not.toHaveBeenCalled();
    expect(mockTruncateSeries).not.toHaveBeenCalled();
  });

  it("scope 'following' の場合 truncateSeries に委譲する", async () => {
    setupAuthorizedUser("guild-1");
    mockTruncateSeries.mockResolvedValueOnce({
      success: true,
      data: undefined,
    });

    const result = await deleteOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "following",
      occurrenceDate: sampleOccurrenceDate,
    });

    expect(result.success).toBe(true);
    expect(mockTruncateSeries).toHaveBeenCalledWith(
      "guild-1",
      "series-1",
      sampleOccurrenceDate
    );
    expect(mockDeleteOccurrence).not.toHaveBeenCalled();
    expect(mockDeleteSeries).not.toHaveBeenCalled();
  });

  it("EventService がエラーを返した場合にそのエラーを伝播する", async () => {
    setupAuthorizedUser("guild-1");
    mockDeleteSeries.mockResolvedValueOnce({
      success: false,
      error: {
        code: "DELETE_FAILED",
        message: "イベントの削除に失敗しました。",
      },
    });

    const result = await deleteOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "all",
      occurrenceDate: sampleOccurrenceDate,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DELETE_FAILED");
    }
  });

  it("非 restricted ギルドでは権限に関係なく削除できる", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    setupCacheWithNoPermissions("guild-1");
    mockGetGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: false },
    });
    mockDeleteOccurrence.mockResolvedValueOnce({
      success: true,
      data: undefined,
    });

    const result = await deleteOccurrenceAction({
      guildId: "guild-1",
      seriesId: "series-1",
      scope: "this",
      occurrenceDate: sampleOccurrenceDate,
    });

    expect(result.success).toBe(true);
    expect(mockDeleteOccurrence).toHaveBeenCalled();
  });
});
