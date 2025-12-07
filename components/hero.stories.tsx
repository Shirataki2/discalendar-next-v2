import type { Meta, StoryObj } from "@storybook/react";
import { Hero } from "./hero";

const meta: Meta<typeof Hero> = {
  title: "Landing/Hero",
  component: Hero,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト表示
 * キャッチコピー、サービス説明、CTAボタン、メインビジュアルを表示
 */
export const Default: Story = {};

/**
 * モバイルビューポート表示
 * 縦並びレイアウトで表示されます
 */
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile",
    },
  },
};

/**
 * タブレットビューポート表示
 */
export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: "tablet",
    },
  },
};

/**
 * デスクトップビューポート表示
 * 横並びレイアウトで表示されます
 */
export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: "desktop",
    },
  },
};
