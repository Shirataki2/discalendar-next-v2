import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UpcomingEvent } from "@/lib/calendar/cross-guild-event-types";

// Mock fetchUpcomingEvents
const mockFetchUpcomingEvents = vi.fn();
vi.mock("@/lib/calendar/cross-guild-event-service", () => ({
  fetchUpcomingEvents: (...args: unknown[]) => mockFetchUpcomingEvents(...args),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: vi.fn() },
    })
  ),
}));

// Mock Next.js navigation (UpcomingEventsError uses useRouter)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { UpcomingEventsSection } from "./upcoming-events-section";

const sampleEvents: UpcomingEvent[] = [
  {
    id: "event-1",
    title: "チームミーティング",
    start: "2026-03-25T10:00:00.000Z",
    end: "2026-03-25T11:00:00.000Z",
    allDay: false,
    color: "#3b82f6",
    isRecurring: false,
    guildId: "guild-1",
    guildName: "テストサーバー",
    guildAvatarUrl: null,
  },
  {
    id: "event-2",
    title: "定例会議",
    start: "2026-03-26T14:00:00.000Z",
    end: "2026-03-26T15:00:00.000Z",
    allDay: false,
    color: "#22c55e",
    isRecurring: true,
    guildId: "guild-2",
    guildName: "開発サーバー",
    guildAvatarUrl: null,
  },
];

const sampleGuilds = [
  {
    id: 1,
    guildId: "guild-1",
    name: "テストサーバー",
    avatarUrl: null,
    locale: "ja",
    isPublic: false,
    publicSlug: null,
  },
  {
    id: 2,
    guildId: "guild-2",
    name: "開発サーバー",
    avatarUrl: null,
    locale: "ja",
    isPublic: false,
    publicSlug: null,
  },
];

describe("UpcomingEventsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("予定がある場合に UpcomingEventList をレンダリングする", async () => {
    mockFetchUpcomingEvents.mockResolvedValue({
      success: true,
      data: sampleEvents,
      hasMore: false,
    });

    const jsx = await UpcomingEventsSection({ guilds: sampleGuilds });
    render(jsx);

    expect(screen.getByText("チームミーティング")).toBeInTheDocument();
    expect(screen.getByText("定例会議")).toBeInTheDocument();
  });

  it("予定がない場合に空状態メッセージを表示する", async () => {
    mockFetchUpcomingEvents.mockResolvedValue({
      success: true,
      data: [],
      hasMore: false,
    });

    const jsx = await UpcomingEventsSection({ guilds: sampleGuilds });
    render(jsx);

    expect(screen.getByText("直近の予定はありません")).toBeInTheDocument();
  });

  it("ギルドが0件の場合に Bot 招待案内を表示する", async () => {
    const jsx = await UpcomingEventsSection({ guilds: [] });
    render(jsx);

    expect(
      screen.getByText("Botが参加しているサーバーがありません")
    ).toBeInTheDocument();
    // fetchUpcomingEvents は呼ばれない
    expect(mockFetchUpcomingEvents).not.toHaveBeenCalled();
  });

  it("エラー時にエラー+リトライ表示をレンダリングする", async () => {
    mockFetchUpcomingEvents.mockResolvedValue({
      success: false,
      error: { code: "FETCH_FAILED", message: "取得に失敗しました" },
    });

    const jsx = await UpcomingEventsSection({ guilds: sampleGuilds });
    render(jsx);

    expect(screen.getByText("予定の取得に失敗しました")).toBeInTheDocument();
    expect(screen.getByText("再読み込み")).toBeInTheDocument();
  });

  it("hasMore が true の場合に「他にも予定があります」を表示する", async () => {
    mockFetchUpcomingEvents.mockResolvedValue({
      success: true,
      data: sampleEvents,
      hasMore: true,
    });

    const jsx = await UpcomingEventsSection({ guilds: sampleGuilds });
    render(jsx);

    expect(screen.getByText("他にも予定があります")).toBeInTheDocument();
  });

  it("guilds を GuildInfo 形式に変換して fetchUpcomingEvents に渡す", async () => {
    mockFetchUpcomingEvents.mockResolvedValue({
      success: true,
      data: [],
      hasMore: false,
    });

    await UpcomingEventsSection({ guilds: sampleGuilds });

    expect(mockFetchUpcomingEvents).toHaveBeenCalledWith(expect.anything(), {
      guilds: [
        { guildId: "guild-1", name: "テストサーバー", avatarUrl: null },
        { guildId: "guild-2", name: "開発サーバー", avatarUrl: null },
      ],
    });
  });
});
