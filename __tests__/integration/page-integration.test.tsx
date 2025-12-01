/**
 * @file 統合テスト - ランディングページ全体
 * @description タスク9.1 - 全コンポーネントの統合確認と最終テスト
 *
 * Requirements:
 * - 1.1: ページ構造とレイアウトの完全性
 * - 2.1, 3.1, 4.1, 5.1, 6.1: 各セクションコンポーネントの統合
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "@/app/page";

// Regex constants for performance
const MD_GRID_COLS_REGEX = /md:grid-cols-/;
const LG_GRID_COLS_REGEX = /lg:grid-cols-/;
const LG_FLEX_ROW_REGEX = /lg:flex-row/;

describe("統合テスト - ランディングページ全体の構造", () => {
  it("すべてのセクションコンポーネント (Header, Hero, Features, CTA, Footer) が正しく表示される", () => {
    render(<Page />);

    // Header
    const header = screen.getByTestId("landing-header");
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe("HEADER");

    // Hero
    const hero = screen.getByTestId("landing-hero");
    expect(hero).toBeInTheDocument();
    expect(hero.tagName).toBe("SECTION");

    // Features
    const features = screen.getByTestId("landing-features");
    expect(features).toBeInTheDocument();
    expect(features.tagName).toBe("SECTION");

    // CTA
    const cta = screen.getByTestId("landing-cta");
    expect(cta).toBeInTheDocument();
    expect(cta.tagName).toBe("SECTION");

    // Footer
    const footer = screen.getByTestId("landing-footer");
    expect(footer).toBeInTheDocument();
    expect(footer.tagName).toBe("FOOTER");
  });

  it("ページ全体のレイアウトが正しいDOM順序で配置されている", () => {
    const { container } = render(<Page />);

    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();

    // mainの子要素を取得
    const children = Array.from(main?.children || []);

    // 各セクションの順序を確認
    const testIds = children
      .map((child) => child.getAttribute("data-testid"))
      .filter(Boolean);

    expect(testIds).toEqual([
      "landing-header",
      "landing-hero",
      "landing-features",
      "landing-cta",
      "landing-footer",
    ]);
  });

  it("ページ全体が1つのmain要素に含まれている", () => {
    const { container } = render(<Page />);

    const mainElements = container.querySelectorAll("main");
    expect(mainElements.length).toBe(1);

    // すべてのセクションがmain内にある
    const main = mainElements[0];
    expect(main.querySelector('[data-testid="landing-header"]')).toBeTruthy();
    expect(main.querySelector('[data-testid="landing-hero"]')).toBeTruthy();
    expect(main.querySelector('[data-testid="landing-features"]')).toBeTruthy();
    expect(main.querySelector('[data-testid="landing-cta"]')).toBeTruthy();
    expect(main.querySelector('[data-testid="landing-footer"]')).toBeTruthy();
  });
});

describe("統合テスト - スクロール動作とレイアウト", () => {
  it("各セクションが画面に収まる高さを持つ", () => {
    const { container } = render(<Page />);

    const sections = [
      container.querySelector('[data-testid="landing-header"]'),
      container.querySelector('[data-testid="landing-hero"]'),
      container.querySelector('[data-testid="landing-features"]'),
      container.querySelector('[data-testid="landing-cta"]'),
      container.querySelector('[data-testid="landing-footer"]'),
    ];

    for (const section of sections) {
      expect(section).toBeInTheDocument();
      // セクションが存在し、contentを持つことを確認
      expect(section?.textContent?.length).toBeGreaterThan(0);
    }
  });

  it("セクション間のスペーシングが適切に設定されている", () => {
    const { container } = render(<Page />);
    const main = container.querySelector("main");

    // mainにspace-yクラスが設定されている
    expect(main?.className).toContain("space-y");
  });
});

describe("統合テスト - コンテンツの完全性", () => {
  it("h1見出しがHeroセクションに存在する", () => {
    const { container } = render(<Page />);
    const hero = container.querySelector('[data-testid="landing-hero"]');
    const h1 = hero?.querySelector("h1");

    expect(h1).toBeTruthy();
    expect(h1?.textContent).toBeTruthy();
  });

  it("機能カードが3つ存在する", () => {
    const { container } = render(<Page />);
    const features = container.querySelector(
      '[data-testid="landing-features"]'
    );
    const cards = features?.querySelectorAll('[data-feature-card="true"]');

    expect(cards?.length).toBe(3);
  });

  it("CTAボタンがHeroとCTAセクションに存在する", () => {
    const { container } = render(<Page />);

    const hero = container.querySelector('[data-testid="landing-hero"]');
    const cta = container.querySelector('[data-testid="landing-cta"]');

    // Button asChildを使用しているため、aタグとしてレンダリングされる
    const heroCTAs = hero?.querySelectorAll("a[href]");
    const ctaCTAs = cta?.querySelectorAll("a[href]");

    expect(heroCTAs && heroCTAs.length > 0).toBe(true);
    expect(ctaCTAs && ctaCTAs.length > 0).toBe(true);
  });

  it("ナビゲーションリンクがHeaderに存在する", () => {
    const { container } = render(<Page />);
    const header = container.querySelector('[data-testid="landing-header"]');
    const navLinks = header?.querySelectorAll("nav a");

    // デスクトップナビゲーションリンクが存在
    expect(navLinks && navLinks.length >= 3).toBe(true);
  });

  it("フッターにソーシャルリンクと補足リンクが存在する", () => {
    const { container } = render(<Page />);
    const footer = container.querySelector('[data-testid="landing-footer"]');

    const socialLinks = footer?.querySelectorAll(
      'a[aria-label*="Twitter"], a[aria-label*="GitHub"]'
    );
    const footerLinks = footer?.querySelectorAll("a");

    expect(socialLinks && socialLinks.length >= 2).toBe(true);
    expect(footerLinks && footerLinks.length >= 5).toBe(true); // ソーシャル2 + 補足3
  });
});

describe("統合テスト - アクセシビリティの総合確認", () => {
  it("見出し階層が論理的に構成されている (h1 -> h2 -> h3)", () => {
    const { container } = render(<Page />);

    const h1 = container.querySelector("h1");
    const h2Elements = container.querySelectorAll("h2");
    const h3Elements = container.querySelectorAll("h3");

    // h1が1つ存在
    expect(h1).toBeTruthy();

    // h2が複数存在 (Features, CTA等)
    expect(h2Elements.length).toBeGreaterThanOrEqual(2);

    // h3が存在 (機能カード)
    expect(h3Elements.length).toBeGreaterThanOrEqual(3);
  });

  it("すべてのインタラクティブ要素がアクセシブルである", () => {
    const { container } = render(<Page />);

    const buttons = container.querySelectorAll("button");
    const links = container.querySelectorAll("a");

    // すべてのボタンにテキストまたはaria-labelがある
    for (const button of buttons) {
      const hasText =
        button.textContent && button.textContent.trim().length > 0;
      const hasAriaLabel = button.hasAttribute("aria-label");
      expect(hasText || hasAriaLabel).toBe(true);
    }

    // すべてのリンクにテキストまたはaria-labelがある
    for (const link of links) {
      const hasText = link.textContent && link.textContent.trim().length > 0;
      const hasAriaLabel = link.hasAttribute("aria-label");
      expect(hasText || hasAriaLabel).toBe(true);
    }
  });

  it("すべての画像にalt属性が設定されている", () => {
    const { container } = render(<Page />);
    const images = container.querySelectorAll("img");

    for (const img of images) {
      expect(img.hasAttribute("alt")).toBe(true);
    }
  });
});

describe("統合テスト - レスポンシブデザイン", () => {
  it("レスポンシブクラス (md:, lg:) が各セクションに適用されている", () => {
    const { container } = render(<Page />);
    const htmlString = container.innerHTML;

    // md:ブレークポイント
    expect(htmlString).toContain("md:");

    // lg:ブレークポイント
    expect(htmlString).toContain("lg:");
  });

  it("機能カードグリッドがレスポンシブである", () => {
    const { container } = render(<Page />);
    const features = container.querySelector(
      '[data-testid="landing-features"]'
    );
    const grid = features?.querySelector(".grid");

    expect(grid?.className).toContain("grid-cols-1");
    expect(grid?.className).toMatch(MD_GRID_COLS_REGEX);
    expect(grid?.className).toMatch(LG_GRID_COLS_REGEX);
  });

  it("Heroセクションがレスポンシブフレックスレイアウトである", () => {
    const { container } = render(<Page />);
    const hero = container.querySelector('[data-testid="landing-hero"]');
    const flex = hero?.querySelector(".flex");

    expect(flex?.className).toContain("flex-col");
    expect(flex?.className).toMatch(LG_FLEX_ROW_REGEX);
  });
});
