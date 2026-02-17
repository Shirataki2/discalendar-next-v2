/**
 * Task 4.2 & 4.3: ドキュメントコンテンツのテスト
 *
 * Requirements:
 * - 3.2: 全ドキュメントページを提供する
 * - 3.4: タイトル・本文コンテンツを表示する
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocsCalendar } from "./docs-calendar";
import { DocsCommands } from "./docs-commands";
import { DocsEdit } from "./docs-edit";
import { DocsGettingStarted } from "./docs-getting-started";
import { DocsInitialize } from "./docs-initialize";
import { DocsInvite } from "./docs-invite";
import { DocsLogin } from "./docs-login";

const STEP_1_PATTERN = /STEP 1/;
const STEP_2_PATTERN = /STEP 2/;
const STEP_3_PATTERN = /STEP 3/;
const DISCORD_LINK_PATTERN = /Discord.*連携/;
const USER_INFO_PATTERN = /あなたに関する情報/;
const LOGIN_SUCCESS_PATTERN = /ログイン成功後/;
const SUPPORT_SERVER_PATTERN = /サポートサーバー/;
const CALENDAR_FEATURE_PATTERN = /カレンダー機能を使うには/;
const DASHBOARD_INVITE_PATTERN = /ダッシュボードからの招待/;

// Task 4.3 patterns
const NOTIFICATION_RECEIVE_PATTERN = /通知を受け取る/;
const MESSAGE_MANAGE_PATTERN = /メッセージの管理/;
const SERVER_MANAGE_PATTERN = /サーバーの管理/;
const INIT_COMPLETE_PATTERN = /初期設定は完了/;
const CALENDAR_SCREEN_PATTERN = /カレンダー画面/;
const DATE_CONTROL_PATTERN = /日付の操作/;
const NEW_EVENT_PATTERN = /予定の新規作成/;
const MONTHLY_PATTERN = /月間/;
const WEEKLY_PATTERN = /週間/;
const PRE_NOTIFICATION_PATTERN = /事前通知/;
const RIGHT_CLICK_PATTERN = /右クリック/;
const TAP_PATTERN = /タップ/;
const DELETE_EVENT_PATTERN = /予定の削除/;
const NOTIFICATION_DEST_PATTERN = /通知の送信先/;
const EVENT_LIST_PATTERN = /予定のリスト/;
const CREATE_EVENT_PATTERN = /予定を作成/;
const HELP_MESSAGE_PATTERN = /ヘルプメッセージ/;
const JOIN_SERVER_PATTERN = /サーバーに参加させる/;

// Patterns for replaced h1 title tests
const GETTING_STARTED_INTRO_PATTERN = /Discalendarの導入から基本操作まで/;
const LOGIN_INTRO_PATTERN = /Discordアカウントと連携/;
const SLASH_COMMANDS_PATTERN = /スラッシュコマンドの一覧/;

describe("Task 4.2: ドキュメントコンテンツ（基本的な使い方、ログイン、Botの招待）", () => {
  describe("DocsGettingStarted", () => {
    it("導入手順の説明テキストを表示する", () => {
      render(<DocsGettingStarted />);
      expect(
        screen.getByText(GETTING_STARTED_INTRO_PATTERN)
      ).toBeInTheDocument();
    });

    it("3つのステップ見出しを表示する", () => {
      render(<DocsGettingStarted />);
      const headings = screen.getAllByRole("heading", { level: 2 });
      expect(headings.length).toBeGreaterThanOrEqual(3);
      expect(headings[0]).toHaveTextContent(STEP_1_PATTERN);
      expect(headings[1]).toHaveTextContent(STEP_2_PATTERN);
      expect(headings[2]).toHaveTextContent(STEP_3_PATTERN);
    });

    it("各ステップの詳細ページへのリンクを含む", () => {
      render(<DocsGettingStarted />);
      expect(screen.getByRole("link", { name: "ログイン" })).toHaveAttribute(
        "href",
        "/docs/login"
      );
      expect(screen.getByRole("link", { name: "Botの招待" })).toHaveAttribute(
        "href",
        "/docs/invite"
      );
      expect(screen.getByRole("link", { name: "初期設定" })).toHaveAttribute(
        "href",
        "/docs/initialize"
      );
    });

    it("article要素でラップされている", () => {
      const { container } = render(<DocsGettingStarted />);
      expect(container.querySelector("article")).toBeInTheDocument();
    });
  });

  describe("DocsLogin", () => {
    it("Discord連携の説明テキストを表示する", () => {
      render(<DocsLogin />);
      expect(screen.getByText(LOGIN_INTRO_PATTERN)).toBeInTheDocument();
    });

    it("Discord連携のセクション見出しを含む", () => {
      render(<DocsLogin />);
      expect(
        screen.getByRole("heading", { level: 2, name: DISCORD_LINK_PATTERN })
      ).toBeInTheDocument();
    });

    it("権限の説明を含む（ユーザー情報・サーバー情報）", () => {
      render(<DocsLogin />);
      expect(screen.getByText(USER_INFO_PATTERN)).toBeInTheDocument();
    });

    it("ログイン成功後のセクションを含む", () => {
      render(<DocsLogin />);
      expect(
        screen.getByRole("heading", { level: 2, name: LOGIN_SUCCESS_PATTERN })
      ).toBeInTheDocument();
    });

    it("ダッシュボードへのリンクを含む", () => {
      render(<DocsLogin />);
      expect(
        screen.getByRole("link", { name: "ダッシュボード" })
      ).toHaveAttribute("href", "/dashboard");
    });

    it("サポートサーバーへの外部リンクを含む", () => {
      render(<DocsLogin />);
      const supportLink = screen.getByRole("link", {
        name: SUPPORT_SERVER_PATTERN,
      });
      expect(supportLink).toHaveAttribute("target", "_blank");
      expect(supportLink).toHaveAttribute(
        "rel",
        expect.stringContaining("noopener")
      );
    });

    it("article要素でラップされている", () => {
      const { container } = render(<DocsLogin />);
      expect(container.querySelector("article")).toBeInTheDocument();
    });
  });

  describe("DocsInvite", () => {
    it("Bot追加の説明テキストを表示する", () => {
      render(<DocsInvite />);
      expect(screen.getByText(CALENDAR_FEATURE_PATTERN)).toBeInTheDocument();
    });

    it("Botの導入が必要な理由を説明する", () => {
      render(<DocsInvite />);
      expect(screen.getByText(CALENDAR_FEATURE_PATTERN)).toBeInTheDocument();
    });

    it("ダッシュボードからの招待セクションを含む", () => {
      render(<DocsInvite />);
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: DASHBOARD_INVITE_PATTERN,
        })
      ).toBeInTheDocument();
    });

    it("必要な権限をリストで表示する", () => {
      render(<DocsInvite />);
      expect(screen.getByText("メッセージを読む")).toBeInTheDocument();
      expect(screen.getByText("メッセージの送信")).toBeInTheDocument();
      expect(screen.getByText("埋め込みリンク")).toBeInTheDocument();
    });

    it("導入完了のセクションを含む", () => {
      render(<DocsInvite />);
      expect(
        screen.getByRole("heading", { level: 2, name: "導入完了" })
      ).toBeInTheDocument();
    });

    it("article要素でラップされている", () => {
      const { container } = render(<DocsInvite />);
      expect(container.querySelector("article")).toBeInTheDocument();
    });
  });
});

describe("Task 4.3: ドキュメントコンテンツ（初期設定、予定の追加と表示、予定の編集と削除、コマンド）", () => {
  describe("DocsInitialize", () => {
    it("通知設定の説明テキストを表示する", () => {
      render(<DocsInitialize />);
      expect(
        screen.getByText(NOTIFICATION_RECEIVE_PATTERN)
      ).toBeInTheDocument();
    });

    it("通知チャンネルの設定について説明する", () => {
      render(<DocsInitialize />);
      expect(
        screen.getByText(NOTIFICATION_RECEIVE_PATTERN)
      ).toBeInTheDocument();
    });

    it("/init コマンドの使い方を表示する", () => {
      render(<DocsInitialize />);
      expect(screen.getByText("/init")).toBeInTheDocument();
    });

    it("必要な権限について説明する", () => {
      render(<DocsInitialize />);
      expect(screen.getByText(MESSAGE_MANAGE_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(SERVER_MANAGE_PATTERN)).toBeInTheDocument();
    });

    it("設定完了後の案内を含む", () => {
      render(<DocsInitialize />);
      expect(screen.getByText(INIT_COMPLETE_PATTERN)).toBeInTheDocument();
    });

    it("article要素でラップされている", () => {
      const { container } = render(<DocsInitialize />);
      expect(container.querySelector("article")).toBeInTheDocument();
    });
  });

  describe("DocsCalendar", () => {
    it("カレンダー画面の説明テキストを表示する", () => {
      render(<DocsCalendar />);
      expect(screen.getByText(CALENDAR_SCREEN_PATTERN)).toBeInTheDocument();
    });

    it("カレンダー画面の説明を含む", () => {
      render(<DocsCalendar />);
      expect(screen.getByText(CALENDAR_SCREEN_PATTERN)).toBeInTheDocument();
    });

    it("日付コントロールについて説明する", () => {
      render(<DocsCalendar />);
      expect(
        screen.getByRole("heading", { level: 2, name: DATE_CONTROL_PATTERN })
      ).toBeInTheDocument();
    });

    it("新規作成の手順を説明する", () => {
      render(<DocsCalendar />);
      expect(
        screen.getByRole("heading", { level: 2, name: NEW_EVENT_PATTERN })
      ).toBeInTheDocument();
    });

    it("表示切り替え（月間・週間等）について説明する", () => {
      render(<DocsCalendar />);
      expect(screen.getByText(MONTHLY_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(WEEKLY_PATTERN)).toBeInTheDocument();
    });

    it("通知設定について説明する", () => {
      render(<DocsCalendar />);
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: PRE_NOTIFICATION_PATTERN,
        })
      ).toBeInTheDocument();
    });

    it("article要素でラップされている", () => {
      const { container } = render(<DocsCalendar />);
      expect(container.querySelector("article")).toBeInTheDocument();
    });
  });

  describe("DocsEdit", () => {
    it("編集操作の説明テキストを表示する", () => {
      render(<DocsEdit />);
      const matches = screen.getAllByText(RIGHT_CLICK_PATTERN);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("右クリックでの編集操作を説明する", () => {
      render(<DocsEdit />);
      const matches = screen.getAllByText(RIGHT_CLICK_PATTERN);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("モバイルでのタップ操作を説明する", () => {
      render(<DocsEdit />);
      const matches = screen.getAllByText(TAP_PATTERN);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("予定の削除方法を説明する", () => {
      render(<DocsEdit />);
      expect(
        screen.getByRole("heading", { level: 2, name: DELETE_EVENT_PATTERN })
      ).toBeInTheDocument();
    });

    it("article要素でラップされている", () => {
      const { container } = render(<DocsEdit />);
      expect(container.querySelector("article")).toBeInTheDocument();
    });
  });

  describe("DocsCommands", () => {
    it("コマンド一覧の説明テキストを表示する", () => {
      render(<DocsCommands />);
      expect(screen.getByText(SLASH_COMMANDS_PATTERN)).toBeInTheDocument();
    });

    it("全5コマンドの見出しを表示する", () => {
      render(<DocsCommands />);
      const commands = ["/init", "/list", "/create", "/help", "/invite"];
      for (const cmd of commands) {
        expect(
          screen.getByRole("heading", { level: 2, name: cmd })
        ).toBeInTheDocument();
      }
    });

    it("/init コマンドの説明を含む", () => {
      render(<DocsCommands />);
      expect(screen.getByText(NOTIFICATION_DEST_PATTERN)).toBeInTheDocument();
    });

    it("/list コマンドの説明を含む", () => {
      render(<DocsCommands />);
      expect(screen.getByText(EVENT_LIST_PATTERN)).toBeInTheDocument();
    });

    it("/create コマンドの説明を含む", () => {
      render(<DocsCommands />);
      expect(screen.getByText(CREATE_EVENT_PATTERN)).toBeInTheDocument();
    });

    it("/help コマンドの説明を含む", () => {
      render(<DocsCommands />);
      expect(screen.getByText(HELP_MESSAGE_PATTERN)).toBeInTheDocument();
    });

    it("/invite コマンドの説明を含む", () => {
      render(<DocsCommands />);
      expect(screen.getByText(JOIN_SERVER_PATTERN)).toBeInTheDocument();
    });

    it("article要素でラップされている", () => {
      const { container } = render(<DocsCommands />);
      expect(container.querySelector("article")).toBeInTheDocument();
    });
  });
});
