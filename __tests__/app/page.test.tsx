/**
 * @file app/page.tsx のテスト
 * @description タスク2.1, 2.2の実装を検証
 *
 * テスト対象:
 * - タスク2.1: 新しいapp/page.tsxの作成とServer Component実装
 * - タスク2.2: セクションコンポーネントの統合とレイアウト構築
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

// スペーシングクラスの検証用正規表現
const SPACING_CLASS_REGEX = /space-y-|gap-/;

describe("app/page.tsx - ランディングページメインコンポーネント", () => {
  describe("タスク2.1: セマンティックHTML構造とServer Component実装", () => {
    it("main要素でページ構造を定義している", () => {
      const { container } = render(<Home />);
      const mainElement = container.querySelector("main");
      expect(mainElement).toBeInTheDocument();
    });

    it("Headerセクションが含まれている", () => {
      const { container } = render(<Home />);
      // Headerコンポーネントのテストマーカーを探す
      const header = container.querySelector('[data-testid="landing-header"]');
      expect(header).toBeInTheDocument();
    });

    it("Heroセクションが含まれている", () => {
      const { container } = render(<Home />);
      const hero = container.querySelector('[data-testid="landing-hero"]');
      expect(hero).toBeInTheDocument();
    });

    it("Featuresセクションが含まれている", () => {
      const { container } = render(<Home />);
      const features = container.querySelector(
        '[data-testid="landing-features"]'
      );
      expect(features).toBeInTheDocument();
    });

    it("CTAセクションが含まれている", () => {
      const { container } = render(<Home />);
      const cta = container.querySelector('[data-testid="landing-cta"]');
      expect(cta).toBeInTheDocument();
    });

    it("Footerセクションが含まれている", () => {
      const { container } = render(<Home />);
      const footer = container.querySelector('[data-testid="landing-footer"]');
      expect(footer).toBeInTheDocument();
    });
  });

  describe("タスク2.2: セクションコンポーネントの統合とレイアウト構築", () => {
    it("セクションが論理的な順序で表示されている (Header -> Hero -> Features -> CTA -> Footer)", () => {
      const { container } = render(<Home />);

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

    it("各セクション間にスペーシングが設定されている", () => {
      const { container } = render(<Home />);
      const mainElement = container.querySelector("main");

      // mainにスペーシングクラスが適用されているか確認
      expect(mainElement?.className).toMatch(SPACING_CLASS_REGEX);
    });
  });

  describe("Requirements: アクセシビリティとセマンティクス (7.1)", () => {
    it("main要素がセマンティックHTMLとして正しく使用されている", () => {
      const { container } = render(<Home />);
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
