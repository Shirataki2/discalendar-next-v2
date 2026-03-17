/**
 * RSVP Server Actions のテスト
 *
 * Task 3: Web RSVP Server Actions を実装する
 * - resolveServerAuth でギルドメンバーシップ検証
 * - extractDiscordInfo で Discord 情報抽出
 * - claim_rsvp_ownership で Bot レコードの ownership 取得
 * - RsvpService に委譲してデータ操作
 *
 * Requirements: 1.3, 2.2, 2.4
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ──────────────────────────────────────────────
// モック設定
// ──────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockRpc = vi.fn();
const mockSupabase = {
  auth: {
    getUser: mockGetUser,
    getSession: mockGetSession,
  },
  rpc: mockRpc,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// getCachedGuilds モック
const mockGetCachedGuilds = vi.fn();
vi.mock("@/lib/guilds/cache", () => ({
  getCachedGuilds: (...args: unknown[]) => mockGetCachedGuilds(...args),
  clearCache: vi.fn(),
}));

// getUserGuilds モック
const mockGetUserGuilds = vi.fn();
vi.mock("@/lib/discord/client", () => ({
  getUserGuilds: (...args: unknown[]) => mockGetUserGuilds(...args),
}));

// UserGuildsService モック
vi.mock("@/lib/guilds/user-guilds-service", () => ({
  createUserGuildsService: vi.fn(() => ({
    getUserGuildPermissions: vi.fn(),
    syncUserGuilds: vi.fn(),
    upsertSingleGuild: vi.fn(),
  })),
}));

// GuildConfigService モック（authorizeEventOperation 向け — RSVP では不要だが actions.ts 全体で必要）
vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: vi.fn(() => ({
    getGuildConfig: vi.fn(),
    upsertGuildConfig: vi.fn(),
  })),
}));

// EventService モック（actions.ts のインポート解決用）
vi.mock("@/lib/calendar/event-service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/calendar/event-service")>();
  return {
    ...actual,
    createEventService: vi.fn(() => ({
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      createRecurringSeries: vi.fn(),
      updateOccurrence: vi.fn(),
      deleteOccurrence: vi.fn(),
      updateSeries: vi.fn(),
      deleteSeries: vi.fn(),
      splitSeries: vi.fn(),
      truncateSeries: vi.fn(),
      fetchEvents: vi.fn(),
    })),
  };
});

// RsvpService モック
const mockFetchAttendees = vi.fn();
const mockUpsertRsvp = vi.fn();
const mockDeleteRsvp = vi.fn();
vi.mock("@/lib/calendar/rsvp-service", () => ({
  createRsvpService: vi.fn(() => ({
    fetchAttendees: mockFetchAttendees,
    upsertRsvp: mockUpsertRsvp,
    deleteRsvp: mockDeleteRsvp,
  })),
}));

// Sentry モック
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import {
  deleteRsvpAction,
  fetchAttendeesAction,
  upsertRsvpAction,
} from "@/app/dashboard/actions";
import type { AttendeeRecord } from "@/lib/calendar/rsvp-types";

// ──────────────────────────────────────────────
// テスト用定数・ヘルパー
// ──────────────────────────────────────────────

const TEST_GUILD_ID = "11111111111111111";

const TEST_USER = {
  id: "user-1",
  user_metadata: {
    provider_id: "discord-123456",
    full_name: "TestUser",
    avatar_url: "https://cdn.discordapp.com/avatars/123456/abc.png",
  },
};

const TEST_USER_NO_DISCORD = {
  id: "user-2",
  user_metadata: {},
};

const sampleAttendeeRecord: AttendeeRecord = {
  id: "att-1",
  event_id: "event-1",
  event_series_id: null,
  occurrence_date: null,
  guild_id: TEST_GUILD_ID,
  user_id: "user-1",
  discord_user_id: "discord-123456",
  discord_username: "TestUser",
  discord_avatar_url: "https://cdn.discordapp.com/avatars/123456/abc.png",
  status: "going",
  responded_at: "2026-03-17T00:00:00Z",
};

/** resolveServerAuth がキャッシュから権限を解決できるようにセットアップ */
function setupCacheWithMembership(guildId: string) {
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

/**
 * resolveServerAuth のみ必要なアクション用セットアップ（deleteRsvpAction）
 * getUser 1回 + キャッシュ
 */
function setupSimpleAuth(guildId: string) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: TEST_USER },
    error: null,
  });
  setupCacheWithMembership(guildId);
}

/**
 * resolveRsvpAuth が必要なアクション用セットアップ（upsertRsvpAction, fetchAttendeesAction）
 * getUser 2回（resolveServerAuth + Discord情報取得） + キャッシュ + RPC
 */
function setupRsvpAuth(guildId: string) {
  // resolveServerAuth 内の getUser 呼び出し
  mockGetUser.mockResolvedValueOnce({
    data: { user: TEST_USER },
    error: null,
  });
  setupCacheWithMembership(guildId);
  // resolveRsvpAuth 内の getUser 呼び出し（Discord 情報取得用）
  mockGetUser.mockResolvedValueOnce({
    data: { user: TEST_USER },
    error: null,
  });
  // claim_rsvp_ownership RPC 成功
  mockRpc.mockResolvedValueOnce({ data: null, error: null });
}

/**
 * fetchAttendeesAction 用セットアップ（RPC 不要）
 * getUser 2回 + キャッシュ
 */
function setupFetchAuth(guildId: string) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: TEST_USER },
    error: null,
  });
  setupCacheWithMembership(guildId);
  mockGetUser.mockResolvedValueOnce({
    data: { user: TEST_USER },
    error: null,
  });
}

/** 認証済みだが Discord 情報が欠損している状態をセットアップ */
function setupAuthenticatedNoDiscord(guildId: string) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: TEST_USER_NO_DISCORD },
    error: null,
  });
  setupCacheWithMembership(guildId);
  mockGetUser.mockResolvedValueOnce({
    data: { user: TEST_USER_NO_DISCORD },
    error: null,
  });
}

// ──────────────────────────────────────────────
// upsertRsvpAction
// ──────────────────────────────────────────────

describe("upsertRsvpAction", () => {
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

    const result = await upsertRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
      status: "going",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockUpsertRsvp).not.toHaveBeenCalled();
  });

  it("guild_id が不正な場合 VALIDATION_ERROR を返す", async () => {
    const result = await upsertRsvpAction({
      guildId: "invalid",
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
      status: "going",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("Discord ユーザー情報が欠損している場合エラーを返す", async () => {
    setupAuthenticatedNoDiscord(TEST_GUILD_ID);

    const result = await upsertRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
      status: "going",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.message).toContain("Discord");
    }
    expect(mockUpsertRsvp).not.toHaveBeenCalled();
  });

  it("単発イベントの RSVP を upsert する", async () => {
    setupRsvpAuth(TEST_GUILD_ID);
    mockUpsertRsvp.mockResolvedValueOnce({
      success: true,
      data: sampleAttendeeRecord,
    });

    const result = await upsertRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
      status: "going",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("going");
      expect(result.data.discord_user_id).toBe("discord-123456");
    }
  });

  it("繰り返しイベントの RSVP を upsert する", async () => {
    setupRsvpAuth(TEST_GUILD_ID);
    const seriesAttendee: AttendeeRecord = {
      ...sampleAttendeeRecord,
      event_id: null,
      event_series_id: "series-1",
      occurrence_date: "2026-03-20",
    };
    mockUpsertRsvp.mockResolvedValueOnce({
      success: true,
      data: seriesAttendee,
    });

    const result = await upsertRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: null,
      seriesId: "series-1",
      occurrenceDate: "2026-03-20",
      status: "going",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event_series_id).toBe("series-1");
      expect(result.data.occurrence_date).toBe("2026-03-20");
    }
  });

  it("upsert 前に claim_rsvp_ownership を呼び出す", async () => {
    setupRsvpAuth(TEST_GUILD_ID);
    mockUpsertRsvp.mockResolvedValueOnce({
      success: true,
      data: sampleAttendeeRecord,
    });

    await upsertRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
      status: "going",
    });

    expect(mockRpc).toHaveBeenCalledWith("claim_rsvp_ownership", {
      p_discord_user_id: "discord-123456",
      p_user_id: "user-1",
    });
    // claim は upsert より先に呼ばれる
    const rpcOrder = mockRpc.mock.invocationCallOrder[0];
    const upsertOrder = mockUpsertRsvp.mock.invocationCallOrder[0];
    expect(rpcOrder).toBeLessThan(upsertOrder);
  });

  it("RsvpService がエラーを返した場合にそのエラーを伝播する", async () => {
    setupRsvpAuth(TEST_GUILD_ID);
    mockUpsertRsvp.mockResolvedValueOnce({
      success: false,
      error: {
        code: "CREATE_FAILED",
        message: "出欠の登録に失敗しました。",
        details: "duplicate key violation",
      },
    });

    const result = await upsertRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
      status: "going",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CREATE_FAILED");
      // sanitizeResult で details が除去される
      expect(result.error).not.toHaveProperty("details");
    }
  });

  it("RsvpService に正しいパラメータを渡す", async () => {
    setupRsvpAuth(TEST_GUILD_ID);
    mockUpsertRsvp.mockResolvedValueOnce({
      success: true,
      data: sampleAttendeeRecord,
    });

    await upsertRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
      status: "maybe",
    });

    expect(mockUpsertRsvp).toHaveBeenCalledWith({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: undefined,
      occurrenceDate: undefined,
      userId: "user-1",
      discordUserId: "discord-123456",
      discordUsername: "TestUser",
      discordAvatarUrl: "https://cdn.discordapp.com/avatars/123456/abc.png",
      status: "maybe",
    });
  });
});

// ──────────────────────────────────────────────
// deleteRsvpAction
// ──────────────────────────────────────────────

describe("deleteRsvpAction", () => {
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

    const result = await deleteRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockDeleteRsvp).not.toHaveBeenCalled();
  });

  it("guild_id が不正な場合 VALIDATION_ERROR を返す", async () => {
    const result = await deleteRsvpAction({
      guildId: "bad-id",
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("単発イベントの RSVP を削除する", async () => {
    setupSimpleAuth(TEST_GUILD_ID);
    mockDeleteRsvp.mockResolvedValueOnce({
      success: true,
      data: undefined,
    });

    const result = await deleteRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
    });

    expect(result.success).toBe(true);
    expect(mockDeleteRsvp).toHaveBeenCalledWith({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: undefined,
      occurrenceDate: undefined,
      userId: "user-1",
    });
  });

  it("繰り返しイベントの RSVP を削除する", async () => {
    setupSimpleAuth(TEST_GUILD_ID);
    mockDeleteRsvp.mockResolvedValueOnce({
      success: true,
      data: undefined,
    });

    const result = await deleteRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: null,
      seriesId: "series-1",
      occurrenceDate: "2026-03-20",
    });

    expect(result.success).toBe(true);
    expect(mockDeleteRsvp).toHaveBeenCalledWith({
      guildId: TEST_GUILD_ID,
      eventId: undefined,
      seriesId: "series-1",
      occurrenceDate: "2026-03-20",
      userId: "user-1",
    });
  });

  it("RsvpService がエラーを返した場合にそのエラーを伝播する", async () => {
    setupSimpleAuth(TEST_GUILD_ID);
    mockDeleteRsvp.mockResolvedValueOnce({
      success: false,
      error: {
        code: "DELETE_FAILED",
        message: "出欠の削除に失敗しました。",
        details: "record not found",
      },
    });

    const result = await deleteRsvpAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DELETE_FAILED");
      expect(result.error).not.toHaveProperty("details");
    }
  });
});

// ──────────────────────────────────────────────
// fetchAttendeesAction
// ──────────────────────────────────────────────

describe("fetchAttendeesAction", () => {
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

    const result = await fetchAttendeesAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockFetchAttendees).not.toHaveBeenCalled();
  });

  it("guild_id が不正な場合 VALIDATION_ERROR を返す", async () => {
    const result = await fetchAttendeesAction({
      guildId: "x",
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("単発イベントの参加者データを取得する", async () => {
    setupFetchAuth(TEST_GUILD_ID);
    mockFetchAttendees.mockResolvedValueOnce({
      success: true,
      data: {
        attendees: [sampleAttendeeRecord],
        summary: { going: 1, maybe: 0, notGoing: 0, total: 1 },
        currentUserStatus: "going",
      },
    });

    const result = await fetchAttendeesAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attendees).toHaveLength(1);
      expect(result.data.summary.going).toBe(1);
      expect(result.data.currentUserStatus).toBe("going");
    }
  });

  it("繰り返しイベントの参加者データを取得する", async () => {
    setupFetchAuth(TEST_GUILD_ID);
    mockFetchAttendees.mockResolvedValueOnce({
      success: true,
      data: {
        attendees: [],
        summary: { going: 0, maybe: 0, notGoing: 0, total: 0 },
        currentUserStatus: null,
      },
    });

    const result = await fetchAttendeesAction({
      guildId: TEST_GUILD_ID,
      eventId: null,
      seriesId: "series-1",
      occurrenceDate: "2026-03-20",
    });

    expect(result.success).toBe(true);
    expect(mockFetchAttendees).toHaveBeenCalledWith({
      guildId: TEST_GUILD_ID,
      eventId: undefined,
      seriesId: "series-1",
      occurrenceDate: "2026-03-20",
      currentDiscordUserId: "discord-123456",
    });
  });

  it("RsvpService がエラーを返した場合にそのエラーを伝播する", async () => {
    setupFetchAuth(TEST_GUILD_ID);
    mockFetchAttendees.mockResolvedValueOnce({
      success: false,
      error: {
        code: "FETCH_FAILED",
        message: "出欠データの取得に失敗しました。",
        details: "connection refused",
      },
    });

    const result = await fetchAttendeesAction({
      guildId: TEST_GUILD_ID,
      eventId: "event-1",
      seriesId: null,
      occurrenceDate: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FETCH_FAILED");
      expect(result.error).not.toHaveProperty("details");
    }
  });
});
