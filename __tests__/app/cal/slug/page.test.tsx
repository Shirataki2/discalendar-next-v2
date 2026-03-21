import { describe, expect, it, vi } from "vitest";

// Mock PublicCalendarService
const mockGetPublicGuildBySlug = vi.fn();
const mockFetchPublicEvents = vi.fn();

vi.mock("@/lib/calendar/public-calendar-service", () => ({
  createPublicCalendarService: () => ({
    getPublicGuildBySlug: mockGetPublicGuildBySlug,
    fetchPublicEvents: mockFetchPublicEvents,
  }),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

// Mock next/navigation
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// Mock PublicCalendarContainer
vi.mock("@/components/calendar/public-calendar-container", () => ({
  PublicCalendarContainer: (props: {
    guildId: string;
    guildName: string;
    initialEvents: unknown[];
    initialDateIso: string;
  }) => (
    <div data-testid="public-calendar-container">
      <span data-testid="guild-id">{props.guildId}</span>
      <span data-testid="guild-name">{props.guildName}</span>
      <span data-testid="initial-events-count">
        {props.initialEvents.length}
      </span>
      <span data-testid="has-initial-date-iso">
        {String(
          typeof props.initialDateIso === "string" &&
            props.initialDateIso.length > 0
        )}
      </span>
    </div>
  ),
}));

const sampleGuild = {
  guildId: "guild-123",
  name: "テストギルド",
  avatarUrl: "https://example.com/avatar.png",
  publicSlug: "abc123def456",
};

const sampleEvents = [
  {
    id: "evt-1",
    title: "イベント1",
    start: new Date("2026-03-15T10:00:00Z"),
    end: new Date("2026-03-15T11:00:00Z"),
    allDay: false,
    color: "#3b82f6",
    description: "説明1",
    location: undefined,
  },
  {
    id: "evt-2",
    title: "イベント2",
    start: new Date("2026-03-20T09:00:00Z"),
    end: new Date("2026-03-20T17:00:00Z"),
    allDay: true,
    color: "#22c55e",
    description: undefined,
    location: undefined,
  },
];

describe("PublicCalendarPage", () => {
  it("有効なスラッグでカレンダーを表示する", async () => {
    mockGetPublicGuildBySlug.mockResolvedValue({
      success: true,
      data: sampleGuild,
    });
    mockFetchPublicEvents.mockResolvedValue({
      success: true,
      data: sampleEvents,
    });

    const { default: Page } = await import("@/app/cal/[slug]/page");
    const { render, screen } = await import("@testing-library/react");

    const result = await Page({
      params: Promise.resolve({ slug: "abc123def456" }),
    });
    render(result);

    expect(screen.getByTestId("guild-id")).toHaveTextContent("guild-123");
    expect(screen.getByTestId("guild-name")).toHaveTextContent("テストギルド");
    expect(screen.getByTestId("initial-events-count")).toHaveTextContent("2");
    expect(screen.getByTestId("has-initial-date-iso")).toHaveTextContent(
      "true"
    );
  });

  it("存在しないスラッグで notFound() を呼ぶ", async () => {
    mockGetPublicGuildBySlug.mockResolvedValue({
      success: false,
      error: { code: "GUILD_NOT_FOUND", message: "見つかりません" },
    });

    const { default: Page } = await import("@/app/cal/[slug]/page");

    await expect(
      Page({ params: Promise.resolve({ slug: "nonexistent" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("イベント取得失敗でも空配列でレンダリングする", async () => {
    mockGetPublicGuildBySlug.mockResolvedValue({
      success: true,
      data: sampleGuild,
    });
    mockFetchPublicEvents.mockResolvedValue({
      success: false,
      error: { code: "FETCH_FAILED", message: "失敗" },
    });

    const { default: Page } = await import("@/app/cal/[slug]/page");
    const { render, screen } = await import("@testing-library/react");

    const result = await Page({
      params: Promise.resolve({ slug: "abc123def456" }),
    });
    render(result);

    expect(screen.getByTestId("initial-events-count")).toHaveTextContent("0");
  });
});

describe("generateMetadata", () => {
  it("ギルド名をtitleに含める", async () => {
    mockGetPublicGuildBySlug.mockResolvedValue({
      success: true,
      data: sampleGuild,
    });
    mockFetchPublicEvents.mockResolvedValue({
      success: true,
      data: sampleEvents,
    });

    const { generateMetadata } = await import("@/app/cal/[slug]/page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "abc123def456" }),
    });

    expect(metadata.title).toContain("テストギルド");
  });

  it("OGP descriptionにイベント名を含める", async () => {
    mockGetPublicGuildBySlug.mockResolvedValue({
      success: true,
      data: sampleGuild,
    });
    mockFetchPublicEvents.mockResolvedValue({
      success: true,
      data: sampleEvents,
    });

    const { generateMetadata } = await import("@/app/cal/[slug]/page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "abc123def456" }),
    });

    const ogDescription =
      metadata.openGraph && "description" in metadata.openGraph
        ? metadata.openGraph.description
        : "";
    expect(ogDescription).toContain("イベント1");
    expect(ogDescription).toContain("イベント2");
  });

  it("Twitterカードメタタグを設定する", async () => {
    mockGetPublicGuildBySlug.mockResolvedValue({
      success: true,
      data: sampleGuild,
    });
    mockFetchPublicEvents.mockResolvedValue({
      success: true,
      data: sampleEvents,
    });

    const { generateMetadata } = await import("@/app/cal/[slug]/page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "abc123def456" }),
    });

    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });

  it("存在しないギルドでは空のメタデータを返す", async () => {
    mockGetPublicGuildBySlug.mockResolvedValue({
      success: false,
      error: { code: "GUILD_NOT_FOUND", message: "見つかりません" },
    });

    const { generateMetadata } = await import("@/app/cal/[slug]/page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "nonexistent" }),
    });

    expect(metadata).toEqual({});
  });
});
