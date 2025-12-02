/**
 * @file Header コンポーネントのテスト
 * @description タスク3.1, 3.2, 8の実装を検証
 *
 * テスト対象:
 * - タスク3.1: Headerコンポーネントの基本構造実装
 * - タスク3.2: ヘッダーCTAボタンとレイアウト実装
 * - タスク8: 既存ヘッダーのログインリンクを更新する
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock for Server Component patterns
const mockGetUser = vi.fn();

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

// Mock the signOut server action for LogoutButton
vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

// Import component after mocking
import { Header } from "@/components/header";

// Top-level regex for performance (Biome lint rule)
const SIGNUP_BUTTON_NAME = /無料で始める/i;
const LOGIN_BUTTON_NAME = /ログイン$/i;

describe("Header - ヘッダーナビゲーション", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: unauthenticated
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  describe("タスク3.1: Headerコンポーネントの基本構造実装", () => {
    it("header要素が正しく表示されている", async () => {
      const header = await Header();
      const { container } = render(header);
      const headerElement = container.querySelector("header");
      expect(headerElement).toBeInTheDocument();
    });

    it("nav要素が正しく表示されている", async () => {
      const header = await Header();
      const { container } = render(header);
      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
    });

    it("サービス名またはロゴが表示されている", async () => {
      const header = await Header();
      const { container } = render(header);
      const serviceName = container.querySelector("header a[href='/']");
      expect(serviceName).toBeInTheDocument();
      expect(serviceName?.textContent).toBe("Discalendar");
    });

    it("デスクトップナビゲーションリンク「機能」が表示されている", async () => {
      const header = await Header();
      render(header);
      // デスクトップナビゲーション内の「機能」リンク
      const featureLinks = screen.getAllByText("機能");
      const desktopLink = featureLinks.find((link) =>
        link.closest("nav")?.classList.contains("md:flex")
      );
      expect(desktopLink).toBeInTheDocument();
    });

    it("デスクトップナビゲーションリンク「使い方」が表示されている", async () => {
      const header = await Header();
      render(header);
      const usageLinks = screen.getAllByText("使い方");
      const desktopLink = usageLinks.find((link) =>
        link.closest("nav")?.classList.contains("md:flex")
      );
      expect(desktopLink).toBeInTheDocument();
    });

    it("デスクトップナビゲーションリンク「料金」が表示されている", async () => {
      const header = await Header();
      render(header);
      const pricingLinks = screen.getAllByText("料金");
      const desktopLink = pricingLinks.find((link) =>
        link.closest("nav")?.classList.contains("md:flex")
      );
      expect(desktopLink).toBeInTheDocument();
    });

    it("デスクトップナビゲーションがmd:ブレークポイント以上で表示される", async () => {
      const header = await Header();
      const { container } = render(header);
      const desktopNav = container.querySelector("nav.md\\:flex");
      expect(desktopNav).toBeInTheDocument();
      expect(desktopNav?.classList.contains("hidden")).toBe(true);
    });
  });

  describe("タスク3.2: ヘッダーCTAボタンとレイアウト実装 (未認証)", () => {
    it("未認証時「ログイン」ボタンが表示されている", async () => {
      const header = await Header();
      const { container } = render(header);
      // デスクトップヘッダーのログインボタン（aタグ）
      const loginButton = container.querySelector("a[href='/auth/login']");
      expect(loginButton).toBeInTheDocument();
      expect(loginButton?.textContent).toBe("ログイン");
    });

    it("未認証時「無料で始める」ボタンが表示されている", async () => {
      const header = await Header();
      render(header);
      // デスクトップヘッダーの無料で始めるボタン（aタグ）
      const signupButton = screen.getByRole("link", {
        name: SIGNUP_BUTTON_NAME,
      });
      expect(signupButton).toBeInTheDocument();
    });

    it("「ログイン」ボタンにghostバリアントが適用されている", async () => {
      const header = await Header();
      render(header);
      const loginButton = screen.getByRole("link", { name: LOGIN_BUTTON_NAME });
      // ghostバリアントのスタイルクラスが含まれているか確認
      expect(loginButton?.className).toContain("hover:bg-accent");
    });

    it("「無料で始める」ボタンにdefaultバリアントが適用されている", async () => {
      const header = await Header();
      render(header);
      const signupButton = screen.getByRole("link", {
        name: SIGNUP_BUTTON_NAME,
      });
      // defaultバリアントのスタイルクラスが含まれているか確認
      expect(signupButton?.className).toContain("bg-primary");
    });

    it("Flexboxレイアウトでヘッダー要素が配置されている", async () => {
      const header = await Header();
      const { container } = render(header);
      const headerContainer = container.querySelector("header > div");
      expect(headerContainer?.classList.contains("flex")).toBe(true);
    });

    it("space-betweenでサービス名とボタンが両端に配置されている", async () => {
      const header = await Header();
      const { container } = render(header);
      const headerContainer = container.querySelector("header > div");
      expect(headerContainer?.className).toContain("justify-between");
    });
  });

  describe("Requirements: セマンティックHTMLとアクセシビリティ (2.6, 7.1)", () => {
    it("header要素が1つだけ存在する", async () => {
      const header = await Header();
      const { container } = render(header);
      const headers = container.querySelectorAll("header");
      expect(headers.length).toBe(1);
    });

    it("nav要素が1つ以上存在する（デスクトップナビゲーション）", async () => {
      const header = await Header();
      const { container } = render(header);
      const navs = container.querySelectorAll("nav");
      expect(navs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Requirements: パフォーマンス (8.3)", () => {
    it("Server Componentとして実装されている（use clientディレクティブなし）", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "components", "header.tsx");
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // ファイルの先頭行に"use client"ディレクティブがないことを確認
      const lines = fileContent.split("\n");
      const firstCodeLine = lines.find(
        (line) =>
          line.trim() !== "" &&
          !line.trim().startsWith("//") &&
          !line.trim().startsWith("*") &&
          !line.trim().startsWith("/*")
      );

      expect(firstCodeLine).not.toContain('"use client"');
      expect(firstCodeLine).not.toContain("'use client'");
    });
  });
});
