import type { Meta, StoryObj } from "@storybook/react";
import { Features } from "./features";

const meta: Meta<typeof Features> = {
  title: "Landing/Features",
  component: Features,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト表示
 * 3つの主要機能をカード形式で表示
 */
export const Default: Story = {};

/**
 * モバイルビューポート表示
 * 1カラムレイアウトで表示されます
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
 * 2カラムレイアウトで表示されます
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
