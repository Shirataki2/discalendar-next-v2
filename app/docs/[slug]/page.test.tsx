/**
 * Task 4.1: ドキュメントページの動的ルーティングとレイアウトのテスト
 *
 * Requirements:
 * - 3.1: `/docs` ルート配下でドキュメントページ群を提供する
 * - 3.3: Server Componentとして実装し、認証不要でアクセス可能にする
 * - 3.5: SEOメタデータを設定する
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DOC_ENTRIES, getAllDocSlugs } from "@/lib/docs/config";

vi.mock("@/components/header", () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));

vi.mock("@/components/footer", () => ({
  Footer: () => <footer data-testid="mock-footer">Footer</footer>,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import DocsSlugPage, { generateMetadata, generateStaticParams } from "./page";

describe("Task 4.1: ドキュメントページの動的ルーティングとレイアウト", () => {
  async function renderPage(slug: string) {
    const element = await DocsSlugPage({
      params: Promise.resolve({ slug }),
    });
    return render(element);
  }

  describe("Req 3.1: generateStaticParams", () => {
    it("全ドキュメントページの slug パラメータを返す", async () => {
      const params = await generateStaticParams();
      const slugs = getAllDocSlugs();
      expect(params).toHaveLength(slugs.length);
      for (const slug of slugs) {
        expect(params).toContainEqual({ slug });
      }
    });
  });

  describe("Req 3.5: generateMetadata", () => {
    it("各slugに対応するtitleを生成する", async () => {
      for (const entry of DOC_ENTRIES) {
        const metadata = await generateMetadata({
          params: Promise.resolve({ slug: entry.slug }),
        });
        expect(metadata.title).toContain(entry.title);
        expect(metadata.title).toContain("Discalendar");
      }
    });

    it("各slugに対応するdescriptionを生成する", async () => {
      for (const entry of DOC_ENTRIES) {
        const metadata = await generateMetadata({
          params: Promise.resolve({ slug: entry.slug }),
        });
        expect(metadata.description).toBe(entry.description);
      }
    });
  });

  describe("存在しないslugの処理", () => {
    it("存在しないslugでnotFound()が呼ばれる", async () => {
      await expect(renderPage("non-existent-slug")).rejects.toThrow(
        "NEXT_NOT_FOUND"
      );
    });
  });

  describe("レイアウト統合", () => {
    it("StaticPageLayout（Header + Footer）が適用される", async () => {
      await renderPage("getting-started");
      expect(screen.getByTestId("mock-header")).toBeInTheDocument();
      expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
    });

    it("DocNavigation（目次）が表示される", async () => {
      await renderPage("getting-started");
      const nav = screen.getByRole("navigation", { name: "ドキュメント目次" });
      expect(nav).toBeInTheDocument();
    });

    it("目次に全ドキュメントのリンクが含まれる", async () => {
      await renderPage("getting-started");
      for (const entry of DOC_ENTRIES) {
        expect(screen.getByRole("link", { name: entry.title })).toHaveAttribute(
          "href",
          `/docs/${entry.slug}`
        );
      }
    });

    it("現在のページが目次でアクティブ状態になる", async () => {
      await renderPage("login");
      const activeLink = screen.getByRole("link", { name: "ログイン" });
      expect(activeLink).toHaveAttribute("aria-current", "page");
    });

    it("DocPagination（ページ送り）が表示される", async () => {
      await renderPage("login");
      expect(
        screen.getByRole("navigation", { name: "ページ送り" })
      ).toBeInTheDocument();
    });

    it("最初のページでは「前の記事」が非表示", async () => {
      await renderPage("getting-started");
      expect(screen.queryByText("前の記事")).not.toBeInTheDocument();
      expect(screen.getByText("次の記事")).toBeInTheDocument();
    });

    it("最後のページでは「次の記事」が非表示", async () => {
      await renderPage("commands");
      expect(screen.getByText("前の記事")).toBeInTheDocument();
      expect(screen.queryByText("次の記事")).not.toBeInTheDocument();
    });
  });

  describe("Req 3.3: Server Component", () => {
    it("use client ディレクティブがない", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(
        process.cwd(),
        "app",
        "docs",
        "[slug]",
        "page.tsx"
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

  describe("コンテンツ表示", () => {
    it("slugに対応するコンテンツが表示される", async () => {
      await renderPage("getting-started");
      expect(
        screen.getByRole("heading", { level: 1, name: "基本的な使い方" })
      ).toBeInTheDocument();
    });
  });
});
