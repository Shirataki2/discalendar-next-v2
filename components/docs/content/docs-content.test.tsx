/**
 * Task 4.2: ドキュメントコンテンツ（基本的な使い方、ログイン、Botの招待）のテスト
 *
 * Requirements:
 * - 3.2: 全ドキュメントページを提供する
 * - 3.4: タイトル・本文コンテンツを表示する
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocsGettingStarted } from "./docs-getting-started";
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

describe("Task 4.2: ドキュメントコンテンツ（基本的な使い方、ログイン、Botの招待）", () => {
  describe("DocsGettingStarted", () => {
    it("タイトル「基本的な使い方」を表示する", () => {
      render(<DocsGettingStarted />);
      expect(
        screen.getByRole("heading", { level: 1, name: "基本的な使い方" })
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
    it("タイトル「ログイン」を表示する", () => {
      render(<DocsLogin />);
      expect(
        screen.getByRole("heading", { level: 1, name: "ログイン" })
      ).toBeInTheDocument();
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
    it("タイトル「Botの招待」を表示する", () => {
      render(<DocsInvite />);
      expect(
        screen.getByRole("heading", { level: 1, name: "Botの招待" })
      ).toBeInTheDocument();
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
