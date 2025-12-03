/**
 * GuildListClient コンポーネントのテスト
 *
 * Requirements:
 * - 4.1: ギルドの一覧をカード形式で表示する
 * - 4.4: ユーザーが所属するDiscalendar登録済みギルドが存在しない場合、「利用可能なサーバーがありません」というメッセージを表示する
 * - 4.5: ギルド一覧を取得中、ローディングインジケーターを表示する（Suspense対応）
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Guild, GuildListError } from "@/lib/guilds/types";
import { GuildListClient } from "./guild-list-client";

// Top-level regex for performance optimization
const EMPTY_STATE_MESSAGE_REGEX = /利用可能なサーバーがありません/i;
const API_ERROR_MESSAGE_REGEX = /Discordからの情報取得に失敗しました/i;
const TOKEN_EXPIRED_MESSAGE_REGEX = /セッションの有効期限が切れました/i;
const NO_TOKEN_MESSAGE_REGEX = /Discord連携が無効です/i;
const LOGIN_LINK_REGEX = /ログイン/i;
const SECTION_TITLE_REGEX = /参加中のサーバー/i;

describe("GuildListClient", () => {
  afterEach(() => {
    cleanup();
  });

  // テスト用ギルドデータ
  const mockGuilds: Guild[] = [
    {
      id: 1,
      guildId: "123456789012345678",
      name: "テストサーバー1",
      avatarUrl:
        "https://cdn.discordapp.com/icons/123456789012345678/abc123.png",
      locale: "ja",
    },
    {
      id: 2,
      guildId: "234567890123456789",
      name: "テストサーバー2",
      avatarUrl: null,
      locale: "ja",
    },
    {
      id: 3,
      guildId: "345678901234567890",
      name: "Test Server 3",
      avatarUrl:
        "https://cdn.discordapp.com/icons/345678901234567890/def456.png",
      locale: "en",
    },
  ];

  // Requirement 4.1: カード形式でギルド一覧を表示
  describe("ギルド一覧表示 (Req 4.1)", () => {
    it("複数のギルドをカード形式で表示する", () => {
      render(<GuildListClient guilds={mockGuilds} />);

      expect(screen.getByText("テストサーバー1")).toBeInTheDocument();
      expect(screen.getByText("テストサーバー2")).toBeInTheDocument();
      expect(screen.getByText("Test Server 3")).toBeInTheDocument();
    });

    it("ギルドカードがグリッドレイアウトでレンダリングされる", () => {
      render(<GuildListClient guilds={mockGuilds} />);
      const grid = screen.getByTestId("guild-list-grid");
      expect(grid).toBeInTheDocument();
      expect(grid.className).toContain("grid");
    });

    it("各ギルドに対してGuildCardコンポーネントがレンダリングされる", () => {
      render(<GuildListClient guilds={mockGuilds} />);
      const guildCards = screen.getAllByTestId("guild-card");
      expect(guildCards).toHaveLength(3);
    });
  });

  // Requirement 4.4: 空状態メッセージ
  describe("空状態メッセージ (Req 4.4)", () => {
    it("ギルドが空の場合、「利用可能なサーバーがありません」メッセージを表示する", () => {
      render(<GuildListClient guilds={[]} />);
      expect(screen.getByText(EMPTY_STATE_MESSAGE_REGEX)).toBeInTheDocument();
    });

    it("ギルドが空の場合、グリッドは表示されない", () => {
      render(<GuildListClient guilds={[]} />);
      expect(screen.queryByTestId("guild-list-grid")).not.toBeInTheDocument();
    });
  });

  // エラー状態の表示
  describe("エラー状態表示", () => {
    it("APIエラーの場合、エラーメッセージを表示する", () => {
      const apiError: GuildListError = {
        type: "api_error",
        message: "Discordからの情報取得に失敗しました。",
      };
      render(<GuildListClient error={apiError} guilds={[]} />);
      expect(screen.getByText(API_ERROR_MESSAGE_REGEX)).toBeInTheDocument();
    });

    it("トークン期限切れの場合、再認証を促すメッセージを表示する", () => {
      const tokenExpiredError: GuildListError = { type: "token_expired" };
      render(<GuildListClient error={tokenExpiredError} guilds={[]} />);
      expect(screen.getByText(TOKEN_EXPIRED_MESSAGE_REGEX)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: LOGIN_LINK_REGEX })
      ).toBeInTheDocument();
    });

    it("トークンなしの場合、再認証を促すメッセージを表示する", () => {
      const noTokenError: GuildListError = { type: "no_token" };
      render(<GuildListClient error={noTokenError} guilds={[]} />);
      expect(screen.getByText(NO_TOKEN_MESSAGE_REGEX)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: LOGIN_LINK_REGEX })
      ).toBeInTheDocument();
    });

    it("エラー時はギルドリストを表示しない", () => {
      const apiError: GuildListError = {
        type: "api_error",
        message: "エラーが発生しました",
      };
      render(<GuildListClient error={apiError} guilds={mockGuilds} />);
      // エラーがある場合、ギルドリストは表示されない
      expect(screen.queryByTestId("guild-list-grid")).not.toBeInTheDocument();
    });
  });

  describe("セクションタイトル", () => {
    it("「参加中のサーバー」セクションタイトルを表示する", () => {
      render(<GuildListClient guilds={mockGuilds} />);
      expect(
        screen.getByRole("heading", { name: SECTION_TITLE_REGEX })
      ).toBeInTheDocument();
    });
  });
});
