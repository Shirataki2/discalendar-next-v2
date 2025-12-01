/**
 * @file Footer コンポーネントのテスト
 * @description タスク6.2の実装を検証
 *
 * テスト対象:
 * - タスク6.2: Footerコンポーネントの実装とリンク構造
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "@/components/footer";

// テスト用正規表現（パフォーマンス最適化のためトップレベルで定義）
const SERVICE_DESCRIPTION_REGEX = /Discalendar|予定|Discord/;
const COPYRIGHT_REGEX = /©|Copyright/;
const SOCIAL_ARIA_LABEL_REGEX = /Twitter|GitHub/;

describe("Footer - フッター", () => {
  describe("タスク6.2: Footerコンポーネントの実装とリンク構造", () => {
    it("footer要素が正しく表示されている", () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector("footer");
      expect(footer).toBeInTheDocument();
    });

    it("サービス名または簡潔な説明が表示されている", () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector("footer");
      const text = footer?.textContent || "";
      expect(text.length).toBeGreaterThan(0);
      // Discalendarまたは予定管理などのキーワードが含まれているか確認
      expect(text).toMatch(SERVICE_DESCRIPTION_REGEX);
    });

    it("補足ナビゲーションリンク（利用規約、プライバシーポリシー、お問い合わせ）が表示されている", () => {
      const { container } = render(<Footer />);
      const links = container.querySelectorAll("a");
      const linkTexts = Array.from(links).map((link) => link.textContent || "");

      expect(linkTexts).toContain("利用規約");
      expect(linkTexts).toContain("プライバシーポリシー");
      expect(linkTexts).toContain("お問い合わせ");
    });

    it("ソーシャルメディアリンク（TwitterおよびGitHub）が表示されている", () => {
      const { container } = render(<Footer />);
      // aria-labelでTwitterとGitHubリンクを探す
      const twitterLink = container.querySelector("a[aria-label*='Twitter']");
      const githubLink = container.querySelector("a[aria-label*='GitHub']");

      expect(twitterLink).toBeInTheDocument();
      expect(githubLink).toBeInTheDocument();
    });

    it("TwitterとGitHubのアイコンがlucide-reactを使用して表示されている", () => {
      const { container } = render(<Footer />);
      // lucide-reactアイコンはsvg要素としてレンダリングされる
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });

    it("著作権表記が追加されている", () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector("footer");
      const text = footer?.textContent || "";
      // 著作権表記には通常©やCopyrightが含まれる
      expect(text).toMatch(COPYRIGHT_REGEX);
    });

    it("リンクにaria-label属性が設定されている（スクリーンリーダー対応）", () => {
      const { container } = render(<Footer />);
      const socialLinks = container.querySelectorAll(
        "a[aria-label*='Twitter'], a[aria-label*='GitHub']"
      );

      expect(socialLinks.length).toBeGreaterThanOrEqual(2);

      for (const link of socialLinks) {
        const ariaLabel = link.getAttribute("aria-label");
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toMatch(SOCIAL_ARIA_LABEL_REGEX);
      }
    });

    it("すべてのhrefがプレースホルダー（#または#section-id）として設定されている", () => {
      const { container } = render(<Footer />);
      const links = container.querySelectorAll("a");

      for (const link of links) {
        const href = link.getAttribute("href") || "";
        // プレースホルダーは#で始まる
        expect(href.startsWith("#")).toBe(true);
      }
    });
  });

  describe("Requirements: セマンティックHTMLとアクセシビリティ (6.1, 6.6, 7.1, 7.2)", () => {
    it("footer要素が1つだけ存在する", () => {
      const { container } = render(<Footer />);
      const footers = container.querySelectorAll("footer");
      expect(footers.length).toBe(1);
    });

    it("すべてのリンクがキーボードでアクセス可能", () => {
      const { container } = render(<Footer />);
      const links = container.querySelectorAll("a");

      for (const link of links) {
        expect(link.getAttribute("tabIndex")).not.toBe("-1");
      }
    });

    it("ソーシャルメディアリンクに適切なaria-labelが設定されている", () => {
      const { container } = render(<Footer />);
      const twitterLink = container.querySelector("a[aria-label*='Twitter']");
      const githubLink = container.querySelector("a[aria-label*='GitHub']");

      expect(twitterLink?.getAttribute("aria-label")).toContain("Twitter");
      expect(githubLink?.getAttribute("aria-label")).toContain("GitHub");
    });
  });

  describe("Requirements: パフォーマンス (8.3)", () => {
    it("Server Componentとして実装されている（use clientディレクティブなし）", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "components", "footer.tsx");
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
