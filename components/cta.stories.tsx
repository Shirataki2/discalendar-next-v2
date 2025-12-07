import type { Meta, StoryObj } from "@storybook/react";
import { CTA } from "./cta";

const meta: Meta<typeof CTA> = {
  title: "Landing/CTA",
  component: CTA,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト表示
 * グラデーション背景にCTAメッセージとボタンを表示
 */
export const Default: Story = {};

/**
 * モバイルビューポート表示
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
 */
export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: "desktop",
    },
  },
};
