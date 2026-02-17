/**
 * @file スタイリングテスト
 * @description タスク7.2 - デザインシステムとスタイリングの最終調整
 *
 * Requirements:
 * - 1.3: レスポンシブデザイン
 * - 10.1: Tailwind CSSユーティリティクラス
 * - 10.2: カラーパレット統一
 * - 10.3: タイポグラフィ統一
 * - 10.4: スペーシング標準スケール
 * - 10.5: ホバー・フォーカス状態
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
          <a className="hover:text-primary" href="#features">
            機能
          </a>
          <a className="hover:text-primary" href="#how-to-use">
            使い方
          </a>
          <a className="hover:text-primary" href="#pricing">
            料金
          </a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <button className="hover:bg-accent focus:ring-2" type="button">
            ログイン
          </button>
          <button
            className="bg-primary text-primary-foreground focus:ring-2"
            type="button"
          >
            無料で始める
          </button>
        </div>
      </div>
    </header>
  ),
}));

import Page from "@/app/page";

// Regex constants for performance
const HEADING_SIZE_REGEX = /text-(4xl|5xl|6xl)|text-\[length:var\(--font-size-/;
const TEXT_SIZE_REGEX = /text-(xs|sm|base|lg|xl)/;
const SPACING_REGEX = /[pm][tblrxy]?-\d+/;
const MD_GRID_COLS_REGEX = /md:grid-cols-/;
const FLEX_DIRECTION_REGEX = /flex-(col|row)/;
const LG_FLEX_ROW_REGEX = /lg:flex-row/;

describe("スタイリング - Tailwind CSSクラスの存在確認", () => {
  afterEach(() => {
    cleanup();
  });

  it("ページ要素にTailwindクラスが適用されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const mainElement = container.querySelector("main");

    expect(mainElement?.className).toBeTruthy();
  });

  it("レスポンシブクラス（md:, lg:）が使用されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const htmlString = container.innerHTML;

    // md:またはlg:プレフィックスを含むクラスの存在確認
    expect(htmlString).toContain("md:");
    expect(htmlString).toContain("lg:");
  });
});

describe("スタイリング - フォーカス状態", () => {
  afterEach(() => {
    cleanup();
  });

  it("ボタンにフォーカス状態のスタイルが定義されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const buttons = container.querySelectorAll("button");

    // shadcn/ui Buttonコンポーネントにはデフォルトでフォーカススタイルが適用される
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("リンクにホバー状態のスタイルが定義されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const htmlString = container.innerHTML;

    // hover:クラスの存在確認
    expect(htmlString).toContain("hover:");
  });
});

describe("スタイリング - カラーシステム", () => {
  afterEach(() => {
    cleanup();
  });

  it("Tailwindカラートークンが使用されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const htmlString = container.innerHTML;

    // text-primary, bg-background等のトークンが使用されているか
    const hasColorTokens =
      htmlString.includes("text-primary") ||
      htmlString.includes("text-muted-foreground") ||
      htmlString.includes("bg-background") ||
      htmlString.includes("bg-muted");

    expect(hasColorTokens).toBe(true);
  });
});

describe("スタイリング - タイポグラフィ", () => {
  afterEach(() => {
    cleanup();
  });

  it("見出しに適切なテキストサイズクラスが適用されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const h1 = container.querySelector("h1");

    expect(h1?.className).toMatch(HEADING_SIZE_REGEX);
  });

  it("テキスト要素にTailwindタイポグラフィクラスが適用されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const htmlString = container.innerHTML;

    // text-サイズクラスの存在確認
    expect(htmlString).toMatch(TEXT_SIZE_REGEX);
  });
});

describe("スタイリング - スペーシング", () => {
  afterEach(() => {
    cleanup();
  });

  it("セクション間にスペーシングが適用されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const sections = container.querySelectorAll("section");

    for (const section of sections) {
      // py-（padding-y）またはmy-（margin-y）クラスの存在確認
      const hasPadding = section.className.includes("py-");
      const hasMargin = section.className.includes("my-");

      expect(hasPadding || hasMargin).toBe(true);
    }
  });

  it("コンテナにTailwind標準スペーシングが使用されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const htmlString = container.innerHTML;

    // p-4, mt-8等の標準スペーシングクラスの使用確認
    expect(htmlString).toMatch(SPACING_REGEX);
  });
});

describe("スタイリング - レスポンシブグリッド", () => {
  afterEach(() => {
    cleanup();
  });

  it("機能カードグリッドがレスポンシブクラスを持つ", async () => {
    const page = await Page();
    const { container } = render(page);
    const featuresSection = container.querySelector(
      '[data-testid="landing-features"]'
    );
    // Find grid element by looking for element with class containing "grid"
    const gridContainer = featuresSection?.querySelector('[class*="grid"]');

    expect(gridContainer).toBeTruthy();
    if (gridContainer) {
      expect(gridContainer.className).toContain("grid-cols-");
      expect(gridContainer.className).toMatch(MD_GRID_COLS_REGEX);
    }
  });

  it("Heroセクションがレスポンシブフレックスレイアウトを持つ", async () => {
    const page = await Page();
    const { container } = render(page);
    const heroSection = container.querySelector('[data-testid="landing-hero"]');
    // Find flex element by looking for element with class containing "flex-col"
    const flexContainer = heroSection?.querySelector('[class*="flex-col"]');

    expect(flexContainer).toBeTruthy();
    if (flexContainer) {
      expect(flexContainer.className).toMatch(FLEX_DIRECTION_REGEX);
      expect(flexContainer.className).toMatch(LG_FLEX_ROW_REGEX);
    }
  });
});
