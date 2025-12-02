/**
 * @file CTA コンポーネントのテスト
 * @description タスク6.1の実装を検証
 *
 * テスト対象:
 * - タスク6.1: CTAコンポーネントの実装と視覚的強調
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CTA } from "@/components/cta";

// テスト用正規表現（パフォーマンス最適化のためトップレベルで定義）
const GRADIENT_REGEX = /bg-gradient-to-r|gradient/;
const CONTRAST_REGEX = /text-white|text-primary-foreground/;
const CONST_CTA_CONTENT_REGEX = /const\s+ctaContent/;

describe("CTA - CTAセクション", () => {
  describe("タスク6.1: CTAコンポーネントの実装と視覚的強調", () => {
    it("section要素が正しく表示されている", () => {
      const { container } = render(<CTA />);
      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("h2見出しで行動喚起メッセージ「今すぐ始めよう」が表示されている", () => {
      const { container } = render(<CTA />);
      const heading = container.querySelector("h2");
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toContain("今すぐ始めよう");
    });

    it("サブメッセージがp要素で表示されている", () => {
      const { container } = render(<CTA />);
      const section = container.querySelector("section");
      const paragraphs = section?.querySelectorAll("p");
      expect(paragraphs).toBeTruthy();
      expect(paragraphs?.length).toBeGreaterThan(0);
    });

    it("CTAボタン「無料で始める」が表示されている", () => {
      const { container } = render(<CTA />);
      const ctaButton = container.querySelector("a[href='#signup']");
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton?.textContent).toBe("無料で始める");
    });

    it("CTAボタンにshadcn/ui Buttonコンポーネントが使用されている", () => {
      const { container } = render(<CTA />);
      const ctaButton = container.querySelector("a[href='#signup']");
      // shadcn/ui Buttonの特徴的なクラスを確認
      expect(ctaButton?.className).toContain("inline-flex");
      expect(ctaButton?.className).toContain("items-center");
    });

    it("背景グラデーションが適用されている", () => {
      const { container } = render(<CTA />);
      const section = container.querySelector("section");
      const className = section?.className || "";
      expect(className).toMatch(GRADIENT_REGEX);
    });

    it("テキストとボタンのコントラスト比が確保されている（text-whiteまたは類似クラス）", () => {
      const { container } = render(<CTA />);
      const section = container.querySelector("section");
      const className = section?.className || "";
      expect(className).toMatch(CONTRAST_REGEX);
    });

    it("テキストコンテンツが定数として定義されている", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "components", "cta.tsx");
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // ctaContent定数が存在するか確認
      expect(fileContent).toContain("ctaContent");
      expect(fileContent).toMatch(CONST_CTA_CONTENT_REGEX);
    });
  });

  describe("Requirements: セマンティックHTMLとアクセシビリティ (5.1, 7.1)", () => {
    it("section要素が1つだけ存在する", () => {
      const { container } = render(<CTA />);
      const sections = container.querySelectorAll("section");
      expect(sections.length).toBe(1);
    });

    it("h2見出しが1つだけ存在する", () => {
      const { container } = render(<CTA />);
      const h2s = container.querySelectorAll("h2");
      expect(h2s.length).toBe(1);
    });

    it("CTAボタンがキーボードでアクセス可能", () => {
      const { container } = render(<CTA />);
      const ctaButton = container.querySelector("a[href='#signup']");
      expect(ctaButton?.getAttribute("tabIndex")).not.toBe("-1");
    });
  });

  describe("Requirements: パフォーマンスとモックデータ (8.3, 11.1)", () => {
    it("Server Componentとして実装されている（use clientディレクティブなし）", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "components", "cta.tsx");
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

    it("テキストコンテンツが定数として定義されている", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "components", "cta.tsx");
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // テキストコンテンツが定数として定義されているか確認
      expect(fileContent).toContain("今すぐ始めよう");
      expect(fileContent).toContain("無料で始める");
    });
  });
});
