/**
 * CalendarContainer Stories
 *
 * CalendarContainerのStorybook定義。
 * Supabase・Server Actionsへの依存があるため、Storybook上では
 * セッション取得に失敗しエラー状態となる。各状態バリアントを定義。
 *
 * Requirements: 1.1, 1.2, 1.4, 3.3, 5.1, 5.2
 */

import type { Meta, StoryObj } from "@storybook/react";
import { CalendarContainer } from "./calendar-container";

const meta: Meta<typeof CalendarContainer> = {
  title: "Calendar/CalendarContainer",
  component: CalendarContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/dashboard",
      },
    },
  },
  argTypes: {
    guildId: {
      control: "text",
      description: "ギルドID（nullまたは空文字列で未選択）",
    },
    canEditEvents: {
      control: "boolean",
      description: "イベント編集可否（権限制御）",
    },
  },
  decorators: [
    (StoryFn) => (
      <div
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * ギルド選択済み状態
 *
 * Supabase セッションが存在しないため、
 * 読み込み後にエラー状態を表示する。
 * 実環境ではイベント一覧がカレンダーグリッドに表示される。
 */
export const Default: Story = {
  args: {
    guildId: "guild-123",
    canEditEvents: true,
  },
};

/**
 * ギルド未選択状態
 *
 * guildIdがnullの場合、空のカレンダーグリッドが表示される。
 * ツールバーの追加ボタンは非表示になる。
 */
export const EmptyGuild: Story = {
  args: {
    guildId: null,
    canEditEvents: true,
  },
};

/**
 * 読み取り専用モード
 *
 * canEditEvents=falseの場合、追加ボタンが無効化され、
 * イベントのドラッグ&ドロップ・リサイズ・スロット選択が不可になる。
 * restricted設定のギルドで閲覧のみ許可されるユースケース。
 */
export const ReadOnly: Story = {
  args: {
    guildId: "guild-456",
    canEditEvents: false,
  },
};
