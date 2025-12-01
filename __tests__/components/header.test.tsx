/**
 * @file Header コンポーネントのテスト
 * @description タスク3.1, 3.2の実装を検証
 *
 * テスト対象:
 * - タスク3.1: Headerコンポーネントの基本構造実装
 * - タスク3.2: ヘッダーCTAボタンとレイアウト実装
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Header } from "@/components/header";

describe("Header - ヘッダーナビゲーション", () => {
  describe("タスク3.1: Headerコンポーネントの基本構造実装", () => {
    it("header要素が正しく表示されている", () => {
      const { container } = render(<Header />);
      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();
    });

    it("nav要素が正しく表示されている", () => {
      const { container } = render(<Header />);
      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
    });

    it("サービス名またはロゴが表示されている", () => {
      const { container } = render(<Header />);
      const serviceName = container.querySelector("header a[href='/']");
      expect(serviceName).toBeInTheDocument();
      expect(serviceName?.textContent).toBe("Discalendar");
    });

    it("デスクトップナビゲーションリンク「機能」が表示されている", () => {
      render(<Header />);
      // デスクトップナビゲーション内の「機能」リンク
      const featureLinks = screen.getAllByText("機能");
      const desktopLink = featureLinks.find((link) =>
        link.closest("nav")?.classList.contains("md:flex")
      );
      expect(desktopLink).toBeInTheDocument();
    });

    it("デスクトップナビゲーションリンク「使い方」が表示されている", () => {
      render(<Header />);
      const usageLinks = screen.getAllByText("使い方");
      const desktopLink = usageLinks.find((link) =>
        link.closest("nav")?.classList.contains("md:flex")
      );
      expect(desktopLink).toBeInTheDocument();
    });

    it("デスクトップナビゲーションリンク「料金」が表示されている", () => {
      render(<Header />);
      const pricingLinks = screen.getAllByText("料金");
      const desktopLink = pricingLinks.find((link) =>
        link.closest("nav")?.classList.contains("md:flex")
      );
      expect(desktopLink).toBeInTheDocument();
    });

    it("デスクトップナビゲーションがmd:ブレークポイント以上で表示される", () => {
      const { container } = render(<Header />);
      const desktopNav = container.querySelector("nav.md\\:flex");
      expect(desktopNav).toBeInTheDocument();
      expect(desktopNav?.classList.contains("hidden")).toBe(true);
    });
  });

  describe("タスク3.2: ヘッダーCTAボタンとレイアウト実装", () => {
    it("「ログイン」ボタンが表示されている", () => {
      const { container } = render(<Header />);
      // デスクトップヘッダーのログインボタン（aタグ）
      const loginButton = container.querySelector("a[href='#login']");
      expect(loginButton).toBeInTheDocument();
      expect(loginButton?.textContent).toBe("ログイン");
    });

    it("「無料で始める」ボタンが表示されている", () => {
      const { container } = render(<Header />);
      // デスクトップヘッダーの無料で始めるボタン（aタグ）
      const signupButton = container.querySelector("a[href='#signup']");
      expect(signupButton).toBeInTheDocument();
      expect(signupButton?.textContent).toBe("無料で始める");
    });

    it("「ログイン」ボタンにghostバリアントが適用されている", () => {
      const { container } = render(<Header />);
      const loginButton = container.querySelector("a[href='#login']");
      // ghostバリアントのスタイルクラスが含まれているか確認
      expect(loginButton?.className).toContain("hover:bg-accent");
    });

    it("「無料で始める」ボタンにdefaultバリアントが適用されている", () => {
      const { container } = render(<Header />);
      const signupButton = container.querySelector("a[href='#signup']");
      // defaultバリアントのスタイルクラスが含まれているか確認
      expect(signupButton?.className).toContain("bg-primary");
    });

    it("Flexboxレイアウトでヘッダー要素が配置されている", () => {
      const { container } = render(<Header />);
      const headerContainer = container.querySelector("header > div");
      expect(headerContainer?.classList.contains("flex")).toBe(true);
    });

    it("space-betweenでサービス名とボタンが両端に配置されている", () => {
      const { container } = render(<Header />);
      const headerContainer = container.querySelector("header > div");
      expect(headerContainer?.className).toContain("justify-between");
    });
  });

  describe("Requirements: セマンティックHTMLとアクセシビリティ (2.6, 7.1)", () => {
    it("header要素が1つだけ存在する", () => {
      const { container } = render(<Header />);
      const headers = container.querySelectorAll("header");
      expect(headers.length).toBe(1);
    });

    it("nav要素が1つ以上存在する（デスクトップナビゲーション）", () => {
      const { container } = render(<Header />);
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
