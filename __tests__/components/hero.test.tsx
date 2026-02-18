/**
 * @file Hero コンポーネントのテスト
 * @description タスク4.1, 4.2, 4.3の実装を検証
 *
 * テスト対象:
 * - タスク4.1: Hero基本構造とテキストコンテンツ実装
 * - タスク4.2: HeroセクションのCTAボタンとビジュアル実装
 * - タスク4.3: Heroセクションのレスポンシブレイアウト実装
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "@/components/hero";

// テスト用正規表現（パフォーマンス最適化のためトップレベルで定義）
const DISCORD_REGEX = /Discord/;
const FLEX_GRID_REGEX = /flex|grid/;
const LG_FLEX_ROW_REGEX = /lg:flex-row/;
const LG_WIDTH_REGEX = /lg:w-/;
const SPACING_REGEX = /gap-|space-|p-|px-|py-/;

describe("Hero - ヒーローセクション", () => {
  describe("タスク4.1: Hero基本構造とテキストコンテンツ実装", () => {
    it("section要素が正しく表示されている", () => {
      const { container } = render(<Hero />);
      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("h1見出しでキャッチコピーが表示されている", () => {
      const { container } = render(<Hero />);
      const heading = container.querySelector("h1");
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toBeTruthy();
    });

    it("キャッチコピーに「Discord」「予定」などのキーワードが含まれている", () => {
      const { container } = render(<Hero />);
      const heading = container.querySelector("h1");
      const text = heading?.textContent || "";
      expect(text).toMatch(DISCORD_REGEX);
    });

    it("サブヘッディング（p要素）が表示されている", () => {
      const { container } = render(<Hero />);
      const paragraphs = container.querySelectorAll("p");
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it("Tailwind CSSタイポグラフィユーティリティが適用されている（text-4xl等）", () => {
      const { container } = render(<Hero />);
      const heading = container.querySelector("h1");
      const className = heading?.className || "";
      // text-4xl または類似のサイズクラス、もしくはfluid typographyのCSS変数が含まれているか確認
      const hasTextSize =
        className.includes("text-2xl") ||
        className.includes("text-3xl") ||
        className.includes("text-4xl") ||
        className.includes("text-5xl") ||
        className.includes("text-6xl") ||
        className.includes("text-[length:var(--font-size-");
      expect(hasTextSize).toBe(true);
    });

    it("見出しにleading-relaxed等の行間クラスが適用されている", () => {
      const { container } = render(<Hero />);
      const heading = container.querySelector("h1");
      const className = heading?.className || "";
      // leading系のクラスが含まれているか確認
      expect(className).toContain("leading-");
    });
  });

  describe("タスク4.2: HeroセクションのCTAボタンとビジュアル実装", () => {
    it("CTAボタン「無料で始める」が表示されている", () => {
      const { container } = render(<Hero />);
      const ctaButton = container.querySelector("a[href='#signup']");
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton?.textContent).toBe("無料で始める");
    });

    it("CTAボタンにdefaultバリアントが適用されている", () => {
      const { container } = render(<Hero />);
      const ctaButton = container.querySelector("a[href='#signup']");
      expect(ctaButton?.className).toContain("bg-primary");
    });

    it("next/imageコンポーネントでメインビジュアルが表示されている", () => {
      const { container } = render(<Hero />);
      // Next.jsのImageコンポーネントはimg要素としてレンダリングされる
      const image = container.querySelector("img");
      expect(image).toBeInTheDocument();
    });

    it("画像に意味のあるalt属性が設定されている", () => {
      const { container } = render(<Hero />);
      const image = container.querySelector("img");
      expect(image?.getAttribute("alt")).toBeTruthy();
      expect(image?.getAttribute("alt")?.length).toBeGreaterThan(0);
    });

    it("画像にwidth属性が設定されている", () => {
      const { container } = render(<Hero />);
      const image = container.querySelector("img");
      expect(image?.getAttribute("width")).toBeTruthy();
    });

    it("画像にheight属性が設定されている", () => {
      const { container } = render(<Hero />);
      const image = container.querySelector("img");
      expect(image?.getAttribute("height")).toBeTruthy();
    });
  });

  describe("タスク4.3: Heroセクションのレスポンシブレイアウト実装", () => {
    it("Flexboxまたはグリッドレイアウトが使用されている", () => {
      const { container } = render(<Hero />);
      const layoutContainer = container.querySelector("section > div");
      const className = layoutContainer?.className || "";
      expect(className).toMatch(FLEX_GRID_REGEX);
    });

    it("モバイル画面で縦並び（flex-col）レイアウトが適用されている", () => {
      const { container } = render(<Hero />);
      const layoutContainer = container.querySelector("section > div");
      const className = layoutContainer?.className || "";
      expect(className).toContain("flex-col");
    });

    it("デスクトップ画面でlg:flex-rowが適用されている", () => {
      const { container } = render(<Hero />);
      const layoutContainer = container.querySelector("section > div");
      const className = layoutContainer?.className || "";
      expect(className).toMatch(LG_FLEX_ROW_REGEX);
    });

    it("各カラムの幅比率が設定されている（lg:w-1/2等）", () => {
      const { container } = render(<Hero />);
      const columns = container.querySelectorAll("section > div > div");
      expect(columns.length).toBeGreaterThanOrEqual(2);

      // いずれかのカラムにlg:w-で始まる幅クラスが適用されているか確認
      const hasWidthClass = Array.from(columns).some((col) => {
        const className = col.className || "";
        return className.match(LG_WIDTH_REGEX);
      });
      expect(hasWidthClass).toBe(true);
    });

    it("スペーシングクラスが適用されている", () => {
      const { container } = render(<Hero />);
      const layoutContainer = container.querySelector("section > div");
      const className = layoutContainer?.className || "";
      // gap、space、またはpaddingクラスが適用されているか確認
      expect(className).toMatch(SPACING_REGEX);
    });
  });

  describe("Requirements: セマンティックHTMLとアクセシビリティ (3.1, 7.1, 7.2)", () => {
    it("section要素が1つだけ存在する", () => {
      const { container } = render(<Hero />);
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBe(1);
    });

    it("h1見出しが1つだけ存在する", () => {
      const { container } = render(<Hero />);
      const h1s = container.querySelectorAll("h1");
      expect(h1s.length).toBe(1);
    });

    it("画像のalt属性が空でない", () => {
      const { container } = render(<Hero />);
      const image = container.querySelector("img");
      const alt = image?.getAttribute("alt") || "";
      expect(alt.length).toBeGreaterThan(0);
    });
  });

  describe("Requirements: パフォーマンス (8.1, 8.3)", () => {
    it("Server Componentとして実装されている（use clientディレクティブなし）", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "components", "hero.tsx");
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
