import type { Meta, StoryObj } from "@storybook/react";
import { UserSettingsContent } from "./user-settings-content";

const meta = {
  title: "Pages/UserSettingsContent",
  component: UserSettingsContent,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof UserSettingsContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト状態
 *
 * テーマ設定とカレンダーデフォルトビュー設定のセクションが表示される。
 */
export const Default: Story = {};
