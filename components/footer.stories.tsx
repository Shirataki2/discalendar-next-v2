import type { Meta, StoryObj } from "@storybook/react";
import { Footer } from "./footer";

const meta: Meta<typeof Footer> = {
  title: "Landing/Footer",
  component: Footer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト表示
 * サービス説明、ナビゲーションリンク、ソーシャルリンク、著作権表記を表示
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
 * 3カラムレイアウトで表示されます
 */
export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: "desktop",
    },
  },
};
