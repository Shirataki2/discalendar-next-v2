/**
 * @file app/page.tsx のテスト
 * @description タスク2.1, 2.2の実装を検証
 *
 * テスト対象:
 * - タスク2.1: 新しいapp/page.tsxの作成とServer Component実装
 * - タスク2.2: セクションコンポーネントの統合とレイアウト構築
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the async Header component with a synchronous version for testing
vi.mock("@/components/header", () => ({
  Header: () => (
    <header data-testid="landing-header">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <a href="/">Discalendar</a>
        <nav className="hidden md:flex md:items-center md:gap-6">
          <a href="#features">機能</a>
          <a href="#how-to-use">使い方</a>
          <a href="#pricing">料金</a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <a href="/auth/login">ログイン</a>
          <a href="/auth/login">無料で始める</a>
        </div>
      </div>
    </header>
  ),
}));

import Home from "@/app/page";

// スペーシングクラスの検証用正規表現
const SPACING_CLASS_REGEX = /space-y-|gap-/;

describe("app/page.tsx - ランディングページメインコンポーネント", () => {
  afterEach(() => {
    cleanup();
  });

  describe("タスク2.1: セマンティックHTML構造とServer Component実装", () => {
    it("main要素でページ構造を定義している", async () => {
      const page = await Home();
      const { container } = render(page);
      const mainElement = container.querySelector("main");
      expect(mainElement).toBeInTheDocument();
    });

    it("Headerセクションが含まれている", async () => {
      const page = await Home();
      const { container } = render(page);
      // Headerコンポーネントのテストマーカーを探す
      const header = container.querySelector('[data-testid="landing-header"]');
      expect(header).toBeInTheDocument();
    });

    it("Heroセクションが含まれている", async () => {
      const page = await Home();
      const { container } = render(page);
      const hero = container.querySelector('[data-testid="landing-hero"]');
      expect(hero).toBeInTheDocument();
    });

    it("Featuresセクションが含まれている", async () => {
      const page = await Home();
      const { container } = render(page);
      const features = container.querySelector(
        '[data-testid="landing-features"]'
      );
      expect(features).toBeInTheDocument();
    });

    it("CTAセクションが含まれている", async () => {
      const page = await Home();
      const { container } = render(page);
      const cta = container.querySelector('[data-testid="landing-cta"]');
      expect(cta).toBeInTheDocument();
    });

    it("Footerセクションが含まれている", async () => {
      const page = await Home();
      const { container } = render(page);
      const footer = container.querySelector('[data-testid="landing-footer"]');
      expect(footer).toBeInTheDocument();
    });
  });

  describe("タスク2.2: セクションコンポーネントの統合とレイアウト構築", () => {
    it("セクションが論理的な順序で表示されている (Header -> Hero -> Features -> CTA -> Footer)", async () => {
      const page = await Home();
      const { container } = render(page);

      const sections = [
        container.querySelector('[data-testid="landing-header"]'),
        container.querySelector('[data-testid="landing-hero"]'),
        container.querySelector('[data-testid="landing-features"]'),
        container.querySelector('[data-testid="landing-cta"]'),
        container.querySelector('[data-testid="landing-footer"]'),
      ];

      // すべてのセクションが存在することを確認
      for (const section of sections) {
        expect(section).toBeInTheDocument();
      }

      // DOMツリー上の順序を確認
      for (let i = 0; i < sections.length - 1; i++) {
        const current = sections[i];
        const next = sections[i + 1];
        if (current && next) {
          expect(current.compareDocumentPosition(next)).toBe(
            Node.DOCUMENT_POSITION_FOLLOWING
          );
        }
      }
    });

    it("各セクション間にスペーシングが設定されている", async () => {
      const page = await Home();
      const { container } = render(page);
      const mainElement = container.querySelector("main");

      // mainにスペーシングクラスが適用されているか確認
      expect(mainElement?.className).toMatch(SPACING_CLASS_REGEX);
    });
  });

  describe("Requirements: アクセシビリティとセマンティクス (7.1)", () => {
    it("main要素がセマンティックHTMLとして正しく使用されている", async () => {
      const page = await Home();
      const { container } = render(page);
      const mainElements = container.querySelectorAll("main");

      // main要素が1つだけ存在することを確認
      expect(mainElements.length).toBe(1);
    });
  });

  describe("Requirements: パフォーマンスと最適化 (8.3)", () => {
    it("Server Componentとして実装されている（use clientディレクティブなし）", async () => {
      // ファイルの内容を読み取ってチェック
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "app", "page.tsx");
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // ファイルの先頭行に"use client"ディレクティブがないことを確認
      // コメント内の文字列を除外するため、最初の非コメント行をチェック
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
