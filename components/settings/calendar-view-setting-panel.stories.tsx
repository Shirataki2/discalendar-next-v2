/**
 * @file CalendarViewSettingPanel の Storybook ストーリー
 * @description カレンダーデフォルトビュー選択パネルの各状態バリアントを定義
 */

import type { Meta, StoryObj } from "@storybook/react";
import { CalendarViewSettingPanel } from "./calendar-view-setting-panel";

const meta = {
  title: "Settings/CalendarViewSettingPanel",
  component: CalendarViewSettingPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: 480 }}>
        <StoryFn />
      </div>
    ),
  ],
} satisfies Meta<typeof CalendarViewSettingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト状態（月ビュー選択）
 *
 * useUserPreferences が返すデフォルト値（月ビュー）が選択された状態。
 */
export const Default: Story = {};

/**
 * カード内配置例
 *
 * SettingsSection（Card）内で表示された場合のレイアウト確認用。
 */
export const InCard: Story = {
  decorators: [
    (StoryFn) => (
      <div
        className="rounded-lg border bg-card p-6 shadow-sm"
        style={{ width: 480 }}
      >
        <div className="mb-4">
          <h3 className="font-semibold text-lg leading-none tracking-tight">
            カレンダーデフォルトビュー
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">
            ダッシュボードのカレンダーで最初に表示するビューを選択します
          </p>
        </div>
        <StoryFn />
      </div>
    ),
  ],
};
