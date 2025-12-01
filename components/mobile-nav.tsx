"use client";

/**
 * @file MobileNav コンポーネント
 * @description モバイル画面サイズでのハンバーガーメニュー表示と開閉制御
 *
 * タスク3.3: MobileNavコンポーネントの実装とHeaderへの統合
 * - Client Component実装（"use client"ディレクティブ必須）
 * - React useState hookでメニュー開閉状態管理
 * - lucide-react Menu/Xアイコン使用
 * - メニュー開閉トグル動作実装
 * - ナビゲーションリンクのモーダル表示（モバイルのみ）
 * - ARIA属性適用（aria-label、aria-expanded）
 * - キーボードアクセシビリティ確保（Tab、Enter）
 * - リンククリック時にメニュー自動クローズ
 * - md:ブレークポイント以上で非表示
 *
 * Requirements:
 * - 2.5: モバイル画面のハンバーガーメニュー
 * - 7.4, 7.5, 7.6: アクセシビリティ - インタラクション
 * - 8.4: Client Componentの適切な使用
 * - 10.1, 10.4: レスポンシブデザイン
 */

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * ナビゲーションリンクの型定義
 */
type NavLink = {
  label: string;
  href: string;
};

/**
 * MobileNavコンポーネントのProps型定義
 */
type MobileNavProps = {
  links: NavLink[];
};

/**
 * MobileNav コンポーネント
 *
 * モバイル画面でのハンバーガーメニューを提供します。
 * - メニュー開閉状態管理（React useState）
 * - ハンバーガーアイコン（Menu）と閉じるアイコン（X）の切り替え
 * - ナビゲーションリンクのモーダル表示
 * - キーボードアクセシビリティの確保
 */
export function MobileNav({ links }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  /**
   * メニュー開閉トグル
   */
  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  /**
   * リンククリック時の処理
   * メニューを自動的に閉じる
   */
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* ハンバーガーメニューボタン - Requirement 7.4, 7.5, 7.6 */}
      <Button
        aria-expanded={isOpen}
        aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
        onClick={toggleMenu}
        size="icon"
        variant="ghost"
      >
        {isOpen ? (
          <X className="lucide-x size-6" />
        ) : (
          <Menu className="lucide-menu size-6" />
        )}
      </Button>

      {/* モバイルナビゲーションメニュー - Requirement 2.5 */}
      {isOpen === true && (
        <div className="absolute top-16 left-0 w-full border-b bg-background shadow-lg">
          <nav className="container mx-auto flex flex-col gap-4 px-4 py-6">
            {links.map((link) => (
              <a
                className="font-medium text-lg transition-colors hover:text-primary"
                href={link.href}
                key={link.href}
                onClick={handleLinkClick}
              >
                {link.label}
              </a>
            ))}

            {/* モバイルCTAボタン */}
            <div className="mt-4 flex flex-col gap-3">
              <Button asChild variant="outline">
                <a href="#login">ログイン</a>
              </Button>
              <Button asChild>
                <a href="#signup">無料で始める</a>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
