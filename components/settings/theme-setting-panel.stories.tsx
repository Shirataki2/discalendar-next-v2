/**
 * @file ThemeSettingPanel の Storybook ストーリー
 * @description テーマ選択パネルの各状態バリアントを定義
 */

import type { Meta, StoryObj } from "@storybook/react";
import { ThemeSettingPanel } from "./theme-setting-panel";

const meta = {
  title: "Settings/ThemeSettingPanel",
  component: ThemeSettingPanel,
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
} satisfies Meta<typeof ThemeSettingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト状態（システムテーマ）
 *
 * next-themes の ThemeProvider が提供するデフォルトテーマを使用。
 * 通常は "system" が選択された状態で表示される。
 */
export const Default: Story = {};

/**
 * ライトテーマ選択状態
 *
 * Storybook の themes アドオンでライトテーマを適用した例。
 */
export const LightTheme: Story = {
  parameters: {
    themes: { themeOverride: "light" },
  },
};

/**
 * ダークテーマ選択状態
 *
 * Storybook の themes アドオンでダークテーマを適用した例。
 */
export const DarkTheme: Story = {
  parameters: {
    themes: { themeOverride: "dark" },
  },
};

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
            テーマ
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">
            アプリケーションの表示テーマを選択します
          </p>
        </div>
        <StoryFn />
      </div>
    ),
  ],
};
