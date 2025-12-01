/**
 * @file Features コンポーネントのテスト
 * @description タスク5.1, 5.2, 5.3の実装を検証
 *
 * テスト対象:
 * - タスク5.1: Featuresコンポーネントの基本構造とモックデータ実装
 * - タスク5.2: 機能カードのレイアウトとshadcn/ui統合実装
 * - タスク5.3: 機能カードのレスポンシブグリッドレイアウト実装
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Features } from "@/components/features";

// テスト用正規表現（パフォーマンス最適化のためトップレベルで定義）
const GRID_REGEX = /grid/;
const GRID_COLS_1_REGEX = /grid-cols-1/;
const MD_GRID_COLS_2_REGEX = /md:grid-cols-2/;
const LG_GRID_COLS_3_REGEX = /lg:grid-cols-3/;
const GAP_REGEX = /gap-/;
const ICON_SIZE_REGEX = /h-(\d+)\s+w-(\d+)/;
const CONST_FEATURES_DATA_REGEX = /const\s+featuresData/;
const TYPE_INTERFACE_FEATURE_ITEM_REGEX = /(type|interface)\s+FeatureItem/;

describe("Features - 機能紹介セクション", () => {
  describe("タスク5.1: Featuresコンポーネントの基本構造とモックデータ実装", () => {
    it("section要素が正しく表示されている", () => {
      const { container } = render(<Features />);
      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("h2見出しでセクションタイトル「主な機能」が表示されている", () => {
      const { container } = render(<Features />);
      const heading = container.querySelector("h2");
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toContain("主な機能");
    });

    it("3つの機能カードが表示されている", () => {
      const { container } = render(<Features />);
      // shadcn/ui Cardコンポーネントは特定のクラスを持つdiv要素としてレンダリングされる
      const cards = container.querySelectorAll(
        "[class*='rounded-xl'][class*='border']"
      );
      expect(cards.length).toBe(3);
    });

    it("カレンダーUI機能のカードが表示されている", () => {
      const { container } = render(<Features />);
      const cardTitles = Array.from(container.querySelectorAll("h3")).map(
        (h3) => h3.textContent
      );
      expect(cardTitles).toContain("カレンダーUI");
    });

    it("Discord連携機能のカードが表示されている", () => {
      const { container } = render(<Features />);
      const cardTitles = Array.from(container.querySelectorAll("h3")).map(
        (h3) => h3.textContent
      );
      expect(cardTitles).toContain("Discord連携");
    });

    it("予定管理機能のカードが表示されている", () => {
      const { container } = render(<Features />);
      const cardTitles = Array.from(container.querySelectorAll("h3")).map(
        (h3) => h3.textContent
      );
      expect(cardTitles).toContain("予定管理");
    });

    it("各カードにlucide-reactアイコンが表示されている", () => {
      const { container } = render(<Features />);
      // lucide-reactアイコンはsvg要素としてレンダリングされる
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("タスク5.2: 機能カードのレイアウトとshadcn/ui統合実装", () => {
    it("各カードにアイコン、機能名（h3見出し）、説明文が含まれている", () => {
      const { container } = render(<Features />);
      const cards = container.querySelectorAll(
        "[class*='rounded-xl'][class*='border']"
      );

      for (const card of cards) {
        // アイコン（svg要素）が存在するか確認
        const icon = card.querySelector("svg");
        expect(icon).toBeInTheDocument();

        // h3見出しが存在するか確認
        const title = card.querySelector("h3");
        expect(title).toBeInTheDocument();

        // CardDescription（div要素）が存在するか確認
        const description = card.querySelector(
          "[class*='text-muted-foreground']"
        );
        expect(description).toBeInTheDocument();
      }
    });

    it("アイコンサイズが統一されている（h-12 w-12等）", () => {
      const { container } = render(<Features />);
      const icons = container.querySelectorAll("svg");

      expect(icons.length).toBeGreaterThanOrEqual(3);

      // すべてのアイコンが同じサイズクラスを持っているか確認
      const iconSizes = Array.from(icons).map((icon) => {
        const className = icon.className?.baseVal || "";
        // h-8, h-10, h-12, h-16等のサイズクラスを抽出
        const sizeMatch = className.match(ICON_SIZE_REGEX);
        return sizeMatch ? `h-${sizeMatch[1]} w-${sizeMatch[2]}` : null;
      });

      // 少なくとも3つのアイコンが同じサイズを持っているか確認
      const firstSize = iconSizes[0];
      expect(firstSize).toBeTruthy();
      expect(iconSizes.filter((size) => size === firstSize).length).toBe(3);
    });

    it("shadcn/ui Cardコンポーネントが使用されている", () => {
      const { container } = render(<Features />);
      // shadcn/ui Cardコンポーネントのデフォルトクラスをチェック
      const cards = container.querySelectorAll(
        "[class*='rounded-xl'][class*='border'][class*='bg-card']"
      );
      expect(cards.length).toBe(3);
    });

    it("各カードにスペーシングクラスが適用されている", () => {
      const { container } = render(<Features />);
      const cards = container.querySelectorAll(
        "[class*='rounded-xl'][class*='border']"
      );

      // カード内のCardHeaderにスペーシングが適用されているか確認
      for (const card of cards) {
        const cardHeader = card.querySelector("[class*='p-6']");
        expect(cardHeader).toBeInTheDocument();
      }
    });
  });

  describe("タスク5.3: 機能カードのレスポンシブグリッドレイアウト実装", () => {
    it("グリッドレイアウトが使用されている", () => {
      const { container } = render(<Features />);
      const gridContainer = container.querySelector("[class*='grid']");
      const className = gridContainer?.className || "";
      expect(className).toMatch(GRID_REGEX);
    });

    it("モバイル画面でgrid-cols-1が適用されている", () => {
      const { container } = render(<Features />);
      const gridContainer = container.querySelector("[class*='grid']");
      const className = gridContainer?.className || "";
      expect(className).toMatch(GRID_COLS_1_REGEX);
    });

    it("タブレット画面でmd:grid-cols-2が適用されている", () => {
      const { container } = render(<Features />);
      const gridContainer = container.querySelector("[class*='grid']");
      const className = gridContainer?.className || "";
      expect(className).toMatch(MD_GRID_COLS_2_REGEX);
    });

    it("デスクトップ画面でlg:grid-cols-3が適用されている", () => {
      const { container } = render(<Features />);
      const gridContainer = container.querySelector("[class*='grid']");
      const className = gridContainer?.className || "";
      expect(className).toMatch(LG_GRID_COLS_3_REGEX);
    });

    it("グリッドアイテム間のギャップが設定されている", () => {
      const { container } = render(<Features />);
      const gridContainer = container.querySelector("[class*='grid']");
      const className = gridContainer?.className || "";
      expect(className).toMatch(GAP_REGEX);
    });

    it("各カードにh-fullが適用されている", () => {
      const { container } = render(<Features />);
      const cards = container.querySelectorAll(
        "[class*='rounded-xl'][class*='border']"
      );

      // 少なくとも1つのカードにh-fullが適用されているか確認
      const hasHeightFull = Array.from(cards).some((card) => {
        const className = card.className || "";
        return className.includes("h-full");
      });
      expect(hasHeightFull).toBe(true);
    });
  });

  describe("Requirements: セマンティックHTMLとアクセシビリティ (4.1, 7.1, 7.3)", () => {
    it("section要素が1つだけ存在する", () => {
      const { container } = render(<Features />);
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBe(1);
    });

    it("h2見出しが1つだけ存在する", () => {
      const { container } = render(<Features />);
      const h2s = container.querySelectorAll("h2");
      expect(h2s.length).toBe(1);
    });

    it("h3見出しが3つ存在する（各機能カードに1つずつ）", () => {
      const { container } = render(<Features />);
      const h3s = container.querySelectorAll("h3");
      expect(h3s.length).toBe(3);
    });

    it("見出し階層が論理的に構成されている（h2 → h3）", () => {
      const { container } = render(<Features />);
      const h2 = container.querySelector("h2");
      const h3s = container.querySelectorAll("h3");

      expect(h2).toBeInTheDocument();
      expect(h3s.length).toBe(3);

      // h2がh3より前に存在することを確認
      const allHeadings = container.querySelectorAll("h2, h3");
      expect(allHeadings[0].tagName).toBe("H2");
    });
  });

  describe("Requirements: パフォーマンスとモックデータ (8.3, 11.3, 11.5)", () => {
    it("Server Componentとして実装されている（use clientディレクティブなし）", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "components", "features.tsx");
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

    it("モックデータが定数として定義されている", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "components", "features.tsx");
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // featuresData定数が存在するか確認
      expect(fileContent).toContain("featuresData");
      expect(fileContent).toMatch(CONST_FEATURES_DATA_REGEX);
    });

    it("FeatureItem型定義が適用されている", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "components", "features.tsx");
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // FeatureItem型定義が存在するか確認
      expect(fileContent).toContain("FeatureItem");
      expect(fileContent).toMatch(TYPE_INTERFACE_FEATURE_ITEM_REGEX);
    });
  });
});
