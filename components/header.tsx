/**
 * @file Header コンポーネント
 * @description ランディングページのヘッダーナビゲーション
 *
 * タスク3.1: Headerコンポーネントの基本構造実装
 * - Server Componentとして実装
 * - セマンティックHTML（header、nav要素）使用
 * - サービス名またはロゴの表示エリア配置
 * - デスクトップナビゲーションリンク実装
 * - レスポンシブデザイン（md:ブレークポイント以上でナビゲーション表示）
 *
 * タスク3.2: ヘッダーCTAボタンとレイアウト実装
 * - shadcn/ui Buttonコンポーネント使用
 * - 「ログイン」および「無料で始める」ボタン配置
 * - ボタンvariant設定（ghost、default等）
 * - Flexboxレイアウト（space-between等）
 *
 * Requirements:
 * - 2.1, 2.2, 2.3, 2.4: ヘッダー構造とナビゲーション
 * - 2.6: セマンティックHTML
 * - 7.1: セマンティックHTML要素の使用
 * - 8.3: Server Component実装
 * - 10.1, 10.4, 10.5: レスポンシブデザインとスタイリング
 */

import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";

/**
 * ナビゲーションリンクの型定義
 */
type NavLink = {
  label: string;
  href: string;
};

/**
 * ナビゲーションリンクのモックデータ
 * Requirement 2.3: 主要セクションへのナビゲーションリンク
 */
const navLinks: NavLink[] = [
  { label: "機能", href: "#features" },
  { label: "使い方", href: "#how-to-use" },
  { label: "料金", href: "#pricing" },
];

/**
 * Header コンポーネント
 *
 * ヘッダーナビゲーションバーを提供します。
 * - サービス名/ロゴ表示
 * - デスクトップナビゲーションリンク（md:以上で表示）
 * - モバイルナビゲーション（MobileNavコンポーネント、md:未満で表示）
 * - CTAボタン（ログイン、無料で始める）
 */
export function Header() {
  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-testid="landing-header"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* サービス名またはロゴ - Requirement 2.2 */}
        <div className="flex items-center">
          <a className="font-bold text-xl" href="/">
            Discalendar
          </a>
        </div>

        {/* デスクトップナビゲーション - Requirement 2.3, 2.6 */}
        <nav className="hidden md:flex md:items-center md:gap-6">
          {navLinks.map((link) => (
            <a
              className="font-medium text-sm transition-colors hover:text-primary"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTAボタン（デスクトップ） - Requirement 2.4, 10.5 */}
        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="ghost">
            <a href="#login">ログイン</a>
          </Button>
          <Button asChild>
            <a href="#signup">無料で始める</a>
          </Button>
        </div>

        {/* モバイルナビゲーション - Requirement 2.5 */}
        <div className="md:hidden">
          <MobileNav links={navLinks} />
        </div>
      </div>
    </header>
  );
}
