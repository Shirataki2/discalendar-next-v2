import type { Meta, StoryObj } from "@storybook/react";
import { MobileNav } from "./mobile-nav";

/**
 * ナビゲーションリンクのモックデータ
 */
const mockNavLinks = [
  { label: "機能", href: "#features" },
  { label: "使い方", href: "#how-to-use" },
  { label: "料金", href: "#pricing" },
];

const meta: Meta<typeof MobileNav> = {
  title: "Landing/MobileNav",
  component: MobileNav,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    viewport: {
      defaultViewport: "mobile",
    },
  },
  argTypes: {
    isAuthenticated: {
      control: "boolean",
      description: "認証状態を切り替え",
    },
    links: {
      control: "object",
      description: "ナビゲーションリンクの配列",
    },
  },
  decorators: [
    (StoryComponent) => (
      <div className="relative min-h-[400px] bg-background">
        <div className="flex justify-end p-4">
          <StoryComponent />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト表示（未認証状態）
 * ハンバーガーメニューボタンをクリックするとメニューが開きます
 */
export const Default: Story = {
  args: {
    links: mockNavLinks,
    isAuthenticated: false,
  },
};

/**
 * 認証済み状態
 * ダッシュボードとログアウトボタンが表示されます
 */
export const Authenticated: Story = {
  args: {
    links: mockNavLinks,
    isAuthenticated: true,
  },
};

/**
 * リンクが空の状態
 */
export const EmptyLinks: Story = {
  args: {
    links: [],
    isAuthenticated: false,
  },
};

/**
 * 多数のリンク
 */
export const ManyLinks: Story = {
  args: {
    links: [
      { label: "機能", href: "#features" },
      { label: "使い方", href: "#how-to-use" },
      { label: "料金", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
      { label: "サポート", href: "#support" },
      { label: "ブログ", href: "#blog" },
    ],
    isAuthenticated: false,
  },
};
