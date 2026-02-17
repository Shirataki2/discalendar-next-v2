/**
 * @file StaticPageLayout コンポーネントのテスト
 * @description タスク1.1: 静的ページ共通レイアウトの実装を検証
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock Header (async Server Component) and Footer
vi.mock("@/components/header", () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));

vi.mock("@/components/footer", () => ({
  Footer: () => <footer data-testid="mock-footer">Footer</footer>,
}));

// Import component after mocking
import { StaticPageLayout } from "@/components/static-page-layout";

describe("StaticPageLayout - 静的ページ共通レイアウト", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Req 5.1: 共通ヘッダー・フッター表示", () => {
    it("Header が表示される", async () => {
      const element = await StaticPageLayout({
        children: <p>テストコンテンツ</p>,
      });
      const { container } = render(element);
      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();
    });

    it("Footer が表示される", async () => {
      const element = await StaticPageLayout({
        children: <p>テストコンテンツ</p>,
      });
      const { container } = render(element);
      const footer = container.querySelector("footer");
      expect(footer).toBeInTheDocument();
    });

    it("children が正しくレンダリングされる", async () => {
      const element = await StaticPageLayout({
        children: <p data-testid="test-content">テストコンテンツ</p>,
      });
      const { getByTestId } = render(element);
      expect(getByTestId("test-content")).toBeInTheDocument();
      expect(getByTestId("test-content").textContent).toBe("テストコンテンツ");
    });
  });

  describe("Req 5.2: フルハイトレイアウト", () => {
    it("ルートに min-h-screen と flex が適用される", async () => {
      const element = await StaticPageLayout({
        children: <p data-testid="test-content">テスト</p>,
      });
      const { container } = render(element);
      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass("min-h-screen");
      expect(wrapper).toHaveClass("flex");
      expect(wrapper).toHaveClass("flex-col");
    });

    it("main 要素に flex-1 が適用される", async () => {
      const element = await StaticPageLayout({
        children: <p data-testid="test-content">テスト</p>,
      });
      const { container } = render(element);
      const main = container.querySelector("main");
      expect(main).toHaveClass("flex-1");
    });
  });

  describe("Req 5.3: セマンティックHTML", () => {
    it("main 要素でコンテンツ領域が定義される", async () => {
      const element = await StaticPageLayout({
        children: <p>テスト</p>,
      });
      const { container } = render(element);
      const main = container.querySelector("main");
      expect(main).toBeInTheDocument();
    });

    it("Header → main → Footer の順序で配置される", async () => {
      const element = await StaticPageLayout({
        children: <p>テスト</p>,
      });
      const { container } = render(element);
      const header = container.querySelector("header");
      const main = container.querySelector("main");
      const footer = container.querySelector("footer");

      expect(header).toBeInTheDocument();
      expect(main).toBeInTheDocument();
      expect(footer).toBeInTheDocument();

      // DOM順序を確認
      const allElements = container.querySelectorAll("header, main, footer");
      expect(allElements[0].tagName).toBe("HEADER");
      expect(allElements[1].tagName).toBe("MAIN");
      expect(allElements[2].tagName).toBe("FOOTER");
    });
  });

  describe("Server Component 実装", () => {
    it("use client ディレクティブがない", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(
        process.cwd(),
        "components",
        "static-page-layout.tsx"
      );
      const fileContent = fs.readFileSync(filePath, "utf-8");

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
