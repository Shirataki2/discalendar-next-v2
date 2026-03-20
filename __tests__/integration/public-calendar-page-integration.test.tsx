/**
 * 公開カレンダーページとOGPの統合テスト
 *
 * Task 6.2: 公開カレンダーページとOGPの動作確認テスト
 * - 有効な公開URLにアクセスしてカレンダーが正常に表示される
 * - 非公開ギルドのURLにアクセスして404が表示される
 * - 存在しないスラッグにアクセスして404が表示される
 * - OGPメタタグにギルド名とイベント概要が含まれている
 *
 * Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3
 */
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

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/components/calendar/public-calendar-container", () => ({
  PublicCalendarContainer: (props: {
    guildId: string;
    guildName: string;
    initialEvents: unknown[];
  }) => (
    <div data-testid="public-calendar-container">
      <span data-testid="guild-id">{props.guildId}</span>
      <span data-testid="guild-name">{props.guildName}</span>
      <span data-testid="initial-events-count">
        {props.initialEvents.length}
      </span>
    </div>
  ),
}));

const sampleGuild = {
  guildId: "guild-123",
  name: "テストコミュニティ",
  avatarUrl: "https://example.com/avatar.png",
  publicSlug: "abc123def456",
};

const sampleEvents = [
  {
    id: "evt-1",
    title: "月例ミーティング",
    start: new Date("2026-03-15T10:00:00Z"),
    end: new Date("2026-03-15T11:00:00Z"),
    allDay: false,
    color: "#3b82f6",
    description: "月例定例ミーティング",
    location: "Discordボイスチャンネル",
  },
  {
    id: "evt-2",
    title: "ゲーム大会",
    start: new Date("2026-03-20T09:00:00Z"),
    end: new Date("2026-03-20T17:00:00Z"),
    allDay: true,
    color: "#22c55e",
    description: undefined,
    location: undefined,
  },
  {
    id: "evt-3",
    title: "作業配信",
    start: new Date("2026-03-25T14:00:00Z"),
    end: new Date("2026-03-25T18:00:00Z"),
    allDay: false,
    color: "#f59e0b",
    description: "もくもく作業配信",
    location: undefined,
  },
];

describe("Task 6.2: 公開カレンダーページ統合テスト", () => {
  describe("ページレンダリング", () => {
    it("有効な公開URLにアクセスしてカレンダーが正常に表示される", async () => {
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

      expect(
        screen.getByTestId("public-calendar-container")
      ).toBeInTheDocument();
      expect(screen.getByTestId("guild-id")).toHaveTextContent("guild-123");
      expect(screen.getByTestId("guild-name")).toHaveTextContent(
        "テストコミュニティ"
      );
      expect(screen.getByTestId("initial-events-count")).toHaveTextContent("3");
    });

    it("非公開ギルドのURLにアクセスして404が表示される（GUILD_NOT_PUBLIC）", async () => {
      mockGetPublicGuildBySlug.mockResolvedValue({
        success: false,
        error: {
          code: "GUILD_NOT_PUBLIC",
          message: "このギルドは公開されていません。",
        },
      });

      const { default: Page } = await import("@/app/cal/[slug]/page");

      await expect(
        Page({ params: Promise.resolve({ slug: "private_slug" }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalled();
    });

    it("存在しないスラッグにアクセスして404が表示される（GUILD_NOT_FOUND）", async () => {
      mockGetPublicGuildBySlug.mockResolvedValue({
        success: false,
        error: {
          code: "GUILD_NOT_FOUND",
          message: "指定されたギルドが見つかりません。",
        },
      });

      const { default: Page } = await import("@/app/cal/[slug]/page");

      await expect(
        Page({ params: Promise.resolve({ slug: "nonexistent123" }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalled();
    });

    it("イベント取得失敗でもページは表示される（空配列で表示）", async () => {
      mockGetPublicGuildBySlug.mockResolvedValue({
        success: true,
        data: sampleGuild,
      });
      mockFetchPublicEvents.mockResolvedValue({
        success: false,
        error: { code: "FETCH_FAILED", message: "接続エラー" },
      });

      const { default: Page } = await import("@/app/cal/[slug]/page");
      const { render, screen } = await import("@testing-library/react");

      const result = await Page({
        params: Promise.resolve({ slug: "abc123def456" }),
      });
      render(result);

      expect(
        screen.getByTestId("public-calendar-container")
      ).toBeInTheDocument();
      expect(screen.getByTestId("initial-events-count")).toHaveTextContent("0");
    });
  });

  describe("OGPメタタグ生成", () => {
    it("og:title にギルド名が含まれる", async () => {
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

      expect(metadata.title).toContain("テストコミュニティ");
      expect(metadata.openGraph).toBeDefined();
      if (metadata.openGraph && "title" in metadata.openGraph) {
        expect(metadata.openGraph.title).toContain("テストコミュニティ");
      }
    });

    it("og:description にイベント概要（最大3件のイベント名）が含まれる", async () => {
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

      expect(ogDescription).toContain("月例ミーティング");
      expect(ogDescription).toContain("ゲーム大会");
      expect(ogDescription).toContain("作業配信");
    });

    it("Twitterカード用メタタグが正しく設定される", async () => {
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
      expect(metadata.twitter?.title).toContain("テストコミュニティ");
      expect(metadata.twitter?.description).toBeDefined();
    });

    it("OGP画像にデフォルトブランド画像が設定される", async () => {
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

      if (metadata.openGraph && "images" in metadata.openGraph) {
        expect(metadata.openGraph.images).toContain("/og-default.png");
      }
    });

    it("イベントが0件の場合もギルド名のみでdescriptionが生成される", async () => {
      mockGetPublicGuildBySlug.mockResolvedValue({
        success: true,
        data: sampleGuild,
      });
      mockFetchPublicEvents.mockResolvedValue({
        success: true,
        data: [],
      });

      const { generateMetadata } = await import("@/app/cal/[slug]/page");
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "abc123def456" }),
      });

      expect(metadata.description).toContain("テストコミュニティ");
    });

    it("存在しないギルドでは空のメタデータを返す", async () => {
      mockGetPublicGuildBySlug.mockResolvedValue({
        success: false,
        error: { code: "GUILD_NOT_FOUND", message: "見つかりません" },
      });

      const { generateMetadata } = await import("@/app/cal/[slug]/page");
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "nonexistent123" }),
      });

      expect(metadata).toEqual({});
    });
  });
});
