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
  globals: {
    viewport: {
      value: "tablet",
      isRotated: false,
    },
  },
};

/**
 * デスクトップビューポート表示
 */
export const Desktop: Story = {
  globals: {
    viewport: {
      value: "desktop",
      isRotated: false,
    },
  },
};
