/**
 * Task 2.2: プライバシーポリシーページのテスト
 *
 * Requirements:
 * - 2.1: `/privacy` ルートでプライバシーポリシーページを提供する
 * - 2.2: タイトル「プライバシーポリシー」と全セクションを表示する
 * - 2.3: Server Componentとして実装し、認証不要でアクセス可能にする
 * - 2.4: セマンティックHTML（見出し階層、リスト、外部リンク）を適用する
 * - 2.5: SEOメタデータを設定する
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/header", () => ({
  Header: () => <header data-testid="mock-header">Header</header>,
}));

vi.mock("@/components/footer", () => ({
  Footer: () => <footer data-testid="mock-footer">Footer</footer>,
}));

import PrivacyPage, { metadata } from "./page";

const ENACTMENT_DATE_PATTERN = /2020年12月1日 制定/;

describe("Task 2.2: プライバシーポリシーページ", () => {
  async function renderPage() {
    const element = await PrivacyPage();
    return render(element);
  }

  describe("Req 2.2: 全セクションの表示", () => {
    it("タイトル「プライバシーポリシー」が表示される", async () => {
      await renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "プライバシーポリシー" })
      ).toBeInTheDocument();
    });

    it("全セクション見出しが表示される", async () => {
      await renderPage();
      const sections = [
        "収集する個人情報",
        "個人情報の利用目的",
        "個人情報の第三者への提供",
        "免責事項",
        "プライバシーポリシーの改定について",
      ];
      for (const section of sections) {
        expect(
          screen.getByRole("heading", { level: 2, name: section })
        ).toBeInTheDocument();
      }
    });

    it("制定日が表示される", async () => {
      await renderPage();
      expect(screen.getByText(ENACTMENT_DATE_PATTERN)).toBeInTheDocument();
    });
  });

  describe("Req 2.4: セマンティックHTML", () => {
    it("article要素でコンテンツが囲まれる", async () => {
      const { container } = await renderPage();
      expect(container.querySelector("article")).toBeInTheDocument();
    });

    it("外部リンクに rel='noopener noreferrer' が設定される", async () => {
      const { container } = await renderPage();
      const externalLinks = container.querySelectorAll('a[target="_blank"]');
      expect(externalLinks.length).toBeGreaterThan(0);
      for (const link of externalLinks) {
        expect(link.getAttribute("rel")).toContain("noopener");
        expect(link.getAttribute("rel")).toContain("noreferrer");
      }
    });
  });

  describe("Req 2.5: SEOメタデータ", () => {
    it("titleが設定されている", () => {
      expect(metadata.title).toContain("プライバシーポリシー");
    });

    it("descriptionが設定されている", () => {
      expect(metadata.description).toBeTruthy();
      expect(typeof metadata.description).toBe("string");
    });
  });

  describe("Req 2.3: Server Component", () => {
    it("use client ディレクティブがない", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "app", "privacy", "page.tsx");
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
