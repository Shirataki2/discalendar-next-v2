/**
 * @file MobileNav コンポーネントのテスト
 * @description タスク3.3, 8の実装を検証
 *
 * テスト対象:
 * - タスク3.3: MobileNavコンポーネントの実装とHeaderへの統合
 * - タスク8: 既存ヘッダーのログインリンクを更新する
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock the signOut server action for LogoutButton
vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

import { MobileNav } from "@/components/mobile-nav";

// テスト用のナビゲーションリンク
const testNavLinks = [
  { label: "機能", href: "#features" },
  { label: "使い方", href: "#how-to-use" },
  { label: "料金", href: "#pricing" },
];

describe("MobileNav - モバイルナビゲーション", () => {
  describe("タスク3.3: MobileNavコンポーネントの実装", () => {
    it("Client Componentとして実装されている（use clientディレクティブあり）", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "components", "mobile-nav.tsx");
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // ファイルの先頭に"use client"ディレクティブがあることを確認
      const lines = fileContent.split("\n");
      const firstCodeLine = lines.find(
        (line) =>
          line.trim() !== "" &&
          !line.trim().startsWith("//") &&
          !line.trim().startsWith("*") &&
          !line.trim().startsWith("/*")
      );

      expect(
        firstCodeLine?.includes('"use client"') ||
          firstCodeLine?.includes("'use client'")
      ).toBe(true);
    });

    it("ハンバーガーメニューボタンが表示されている", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );
      expect(menuButton).toBeInTheDocument();
    });

    it("初期状態ではメニューが閉じている", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );
      expect(menuButton?.getAttribute("aria-expanded")).toBe("false");
    });

    it("Menuアイコンが初期状態で表示されている", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      // lucide-reactのMenuアイコンがSVGとして表示されていることを確認
      const menuIcon = container.querySelector('svg[class*="lucide-menu"]');
      expect(menuIcon).toBeInTheDocument();
    });

    it("ハンバーガーボタンクリックでメニューが開く", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );

      if (menuButton) {
        fireEvent.click(menuButton);
        // メニューが開いていることを確認（aria-expanded=true）
        expect(menuButton.getAttribute("aria-expanded")).toBe("true");
      }
    });

    it("メニューが開くとXアイコンに切り替わる", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );

      if (menuButton) {
        fireEvent.click(menuButton);

        // Xアイコンが表示されていることを確認
        const closeIcon = container.querySelector('svg[class*="lucide-x"]');
        expect(closeIcon).toBeInTheDocument();

        // メニューを閉じるボタンのラベルが更新されていることを確認
        const closeButton = container.querySelector(
          'button[aria-label="メニューを閉じる"]'
        );
        expect(closeButton).toBeInTheDocument();
      }
    });

    it("メニューが開くとナビゲーションリンクが表示される", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );

      if (menuButton) {
        fireEvent.click(menuButton);

        // 各リンクが表示されることを確認
        for (const link of testNavLinks) {
          const linkElement = container.querySelector(`a[href="${link.href}"]`);
          expect(linkElement).toBeInTheDocument();
          expect(linkElement?.textContent).toBe(link.label);
        }
      }
    });

    it("ナビゲーションリンククリックでメニューが自動的に閉じる", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );

      if (menuButton) {
        // メニューを開く
        fireEvent.click(menuButton);
        expect(menuButton.getAttribute("aria-expanded")).toBe("true");

        // リンクをクリック
        const firstLink = container.querySelector(
          `a[href="${testNavLinks[0].href}"]`
        );
        if (firstLink) {
          fireEvent.click(firstLink);
          // メニューが閉じていることを確認
          expect(menuButton.getAttribute("aria-expanded")).toBe("false");
        }
      }
    });

    it("閉じるボタン（X）クリックでメニューが閉じる", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );

      if (menuButton) {
        // メニューを開く
        fireEvent.click(menuButton);
        expect(menuButton.getAttribute("aria-expanded")).toBe("true");

        // 閉じるボタンをクリック
        const closeButton = container.querySelector(
          'button[aria-label="メニューを閉じる"]'
        );
        if (closeButton) {
          fireEvent.click(closeButton);
          // メニューが閉じていることを確認
          expect(menuButton.getAttribute("aria-expanded")).toBe("false");
        }
      }
    });
  });

  describe("Requirements: アクセシビリティ (7.4, 7.5, 7.6)", () => {
    it("ARIA属性 aria-label が適用されている", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );
      expect(menuButton).toHaveAttribute("aria-label");
    });

    it("ARIA属性 aria-expanded が適用されている", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );
      expect(menuButton).toHaveAttribute("aria-expanded");
    });

    it("aria-expanded の値がメニュー開閉状態と一致している", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );

      if (menuButton) {
        // 初期状態: 閉じている
        expect(menuButton.getAttribute("aria-expanded")).toBe("false");

        // メニューを開く
        fireEvent.click(menuButton);
        expect(menuButton.getAttribute("aria-expanded")).toBe("true");

        // メニューを閉じる
        fireEvent.click(menuButton);
        expect(menuButton.getAttribute("aria-expanded")).toBe("false");
      }
    });

    it("キーボードでアクセス可能（button要素の使用）", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const menuButton = container.querySelector(
        'button[aria-label="メニューを開く"]'
      );
      expect(menuButton?.tagName).toBe("BUTTON");
    });
  });

  describe("Requirements: レスポンシブデザイン (10.1, 10.4)", () => {
    it("md:ブレークポイント以上で非表示になるクラスが適用されている", () => {
      const { container } = render(
        <MobileNav isAuthenticated={false} links={testNavLinks} />
      );
      const mobileNavContainer = container.querySelector("div.md\\:hidden");
      expect(mobileNavContainer).toBeInTheDocument();
    });
  });
});
