/**
 * @file ThemeSwitcher のStorybook ストーリー
 * @description テーマ切り替えコンポーネントのストーリー
 */

import type { Meta, StoryObj } from "@storybook/react";
import { ThemeSwitcher } from "./theme-switcher";

const meta = {
  title: "Components/ThemeSwitcher",
  component: ThemeSwitcher,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルトのテーマスイッチャー
 */
export const Default: Story = {};

/**
 * ヘッダーコンテキストでの表示例
 */
export const InHeader: Story = {
  decorators: [
    (StoryComponent) => (
      <div className="w-full border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="font-bold text-xl">Discalendar</div>
          <StoryComponent />
        </div>
      </div>
    ),
  ],
};

/**
 * ダークテーマでの表示
 */
export const DarkTheme: Story = {
  parameters: {
    backgrounds: { default: "dark" },
  },
  decorators: [
    (StoryComponent) => (
      <div className="dark">
        <StoryComponent />
      </div>
    ),
  ],
};
