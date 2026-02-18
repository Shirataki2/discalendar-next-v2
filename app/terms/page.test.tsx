/**
 * Task 2.1: 利用規約ページのテスト
 *
 * Requirements:
 * - 1.1: `/terms` ルートで利用規約ページを提供する
 * - 1.2: タイトル「利用規約」と全条文（第1条〜第12条、制定日・改定日）を表示する
 * - 1.3: Server Componentとして実装し、認証不要でアクセス可能にする
 * - 1.4: セマンティックHTML（見出し階層、リスト）を適用する
 * - 1.5: SEOメタデータを設定する
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/header", () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));

vi.mock("@/components/footer", () => ({
  Footer: () => <footer data-testid="mock-footer">Footer</footer>,
}));

import TermsPage, { metadata } from "./page";

const ESTABLISHMENT_DATE_PATTERN = /2020年12月1日 制定/;

describe("Task 2.1: 利用規約ページ", () => {
  async function renderPage() {
    const element = await TermsPage();
    return render(element);
  }

  describe("Req 1.2: 全条文の表示", () => {
    it("タイトル「利用規約」が表示される", async () => {
      await renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "利用規約" })
      ).toBeInTheDocument();
    });

    it("第1条〜第12条の見出しが表示される", async () => {
      await renderPage();
      const articles = [
        "第1条(適用)",
        "第2条(利用の定義)",
        "第3条(利用の拒否・停止)",
        "第4条(禁止事項)",
        "第5条(知的財産権)",
        "第6条(個人情報の取り扱い)",
        "第7条(サービスの変更・中断・終了)",
        "第8条(免責事項)",
        "第9条(損害賠償)",
        "第10条(本規約の変更)",
        "第11条(可分性)",
        "第12条(準拠法および管轄裁判所)",
      ];
      for (const article of articles) {
        expect(
          screen.getByRole("heading", { level: 2, name: article })
        ).toBeInTheDocument();
      }
    });

    it("制定日が表示される", async () => {
      await renderPage();
      expect(screen.getByText(ESTABLISHMENT_DATE_PATTERN)).toBeInTheDocument();
    });
  });

  describe("Req 1.4: セマンティックHTML", () => {
    it("article要素でコンテンツが囲まれる", async () => {
      const { container } = await renderPage();
      expect(container.querySelector("article")).toBeInTheDocument();
    });

    it("番号付きリスト（ol）が使用される", async () => {
      const { container } = await renderPage();
      const lists = container.querySelectorAll("article ol");
      expect(lists.length).toBeGreaterThan(0);
    });
  });

  describe("Req 1.5: SEOメタデータ", () => {
    it("titleが設定されている", () => {
      expect(metadata.title).toContain("利用規約");
    });

    it("descriptionが設定されている", () => {
      expect(metadata.description).toBeTruthy();
      expect(typeof metadata.description).toBe("string");
    });
  });

  describe("Req 1.3: Server Component", () => {
    it("use client ディレクティブがない", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "app", "terms", "page.tsx");
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

  describe("Req 5.1: 共通レイアウト", () => {
    it("StaticPageLayout（Header + Footer）が適用される", async () => {
      await renderPage();
      expect(screen.getByTestId("mock-header")).toBeInTheDocument();
      expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
    });
  });
});
