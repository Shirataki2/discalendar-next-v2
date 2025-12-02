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
 * タスク8: 既存ヘッダーのログインリンクを更新する
 * - ヘッダーのログインリンク先を新しいログインページに変更する
 * - 認証状態に応じてログイン/ログアウトの表示を切り替える
 *
 * Requirements:
 * - 1.1: Discordログインボタンの表示
 * - 2.5: モバイル画面のハンバーガーメニュー
 * - 7.4, 7.5, 7.6: アクセシビリティ - インタラクション
 * - 8.4: Client Componentの適切な使用
 * - 10.1, 10.4: レスポンシブデザイン
 */

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
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
  /** ナビゲーションリンクの配列 */
  links: NavLink[];
  /** ユーザーが認証済みかどうか */
  isAuthenticated: boolean;
};

/**
 * MobileNav コンポーネント
 *
 * モバイル画面でのハンバーガーメニューを提供します。
 * - メニュー開閉状態管理（React useState）
 * - ハンバーガーアイコン（Menu）と閉じるアイコン（X）の切り替え
 * - ナビゲーションリンクのモーダル表示
 * - キーボードアクセシビリティの確保
 * - 認証状態に応じたCTAボタン表示切り替え
 */
export function MobileNav({ links, isAuthenticated }: MobileNavProps) {
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

            {/* モバイルCTAボタン - Task 8 */}
            <div className="mt-4 flex flex-col gap-3">
              {isAuthenticated ? (
                <>
                  <Button asChild variant="outline">
                    <a href="/dashboard" onClick={handleLinkClick}>
                      ダッシュボード
                    </a>
                  </Button>
                  <LogoutButton variant="default" />
                </>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <a href="/auth/login" onClick={handleLinkClick}>
                      ログイン
                    </a>
                  </Button>
                  <Button asChild>
                    <a href="/auth/login" onClick={handleLinkClick}>
                      無料で始める
                    </a>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
