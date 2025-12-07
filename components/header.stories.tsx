import type { Meta, StoryObj } from "@storybook/react";
import { Menu } from "lucide-react";
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
 */
const navLinks: NavLink[] = [
  { label: "機能", href: "#features" },
  { label: "使い方", href: "#how-to-use" },
  { label: "料金", href: "#pricing" },
];

/**
 * HeaderUIコンポーネント（Storybook用プレゼンテーショナル版）
 *
 * 実際のHeaderはasync Server ComponentでSupabaseに依存しているため、
 * Storybookでは直接使用できない。このコンポーネントはUIの見た目を再現する。
 */
function HeaderUI({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* サービス名またはロゴ */}
        <div className="flex items-center">
          <a className="font-bold text-xl" href="/">
            Discalendar
          </a>
        </div>

        {/* デスクトップナビゲーション */}
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

        {/* CTAボタン（デスクトップ） */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <Button asChild variant="ghost">
                <a href="/dashboard">ダッシュボード</a>
              </Button>
              <Button variant="ghost">ログアウト</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <a href="/auth/login">ログイン</a>
              </Button>
              <Button asChild>
                <a href="/auth/login">無料で始める</a>
              </Button>
            </>
          )}
        </div>

        {/* モバイルナビゲーション（ボタンのみ表示） */}
        <div className="md:hidden">
          <Button aria-label="メニューを開く" size="icon" variant="ghost">
            <Menu className="size-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}

const meta: Meta<typeof HeaderUI> = {
  title: "Landing/Header",
  component: HeaderUI,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    isAuthenticated: {
      control: "boolean",
      description: "認証状態を切り替え",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト表示（未認証状態）
 */
export const Default: Story = {
  args: {
    isAuthenticated: false,
  },
};

/**
 * 認証済み状態
 */
export const Authenticated: Story = {
  args: {
    isAuthenticated: true,
  },
};

/**
 * モバイルビューポート表示
 */
export const Mobile: Story = {
  args: {
    isAuthenticated: false,
  },
  globals: {
    viewport: {
      value: "mobile",
      isRotated: false,
    },
  },
};

/**
 * モバイルビューポート表示（認証済み）
 */
export const MobileAuthenticated: Story = {
  args: {
    isAuthenticated: true,
  },
  globals: {
    viewport: {
      value: "mobile",
      isRotated: false,
    },
  },
};

/**
 * タブレットビューポート表示
 */
export const Tablet: Story = {
  args: {
    isAuthenticated: false,
  },
  globals: {
    viewport: {
      value: "tablet",
      isRotated: false,
    },
  },
};
