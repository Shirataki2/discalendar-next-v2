/**
 * NotificationChannelSelect Stories
 *
 * NotificationChannelSelectのStorybook定義。
 * Server Actions (fetchGuildChannels, updateNotificationChannel) への依存があるため、
 * Storybook上ではチャンネル取得に失敗しエラー状態となる。
 *
 * Requirements: 2.1-2.7, 3.3, 3.4, 4.2, 4.3, 6.3
 */

import type { Meta, StoryObj } from "@storybook/react";
import { NotificationChannelSelect } from "./notification-channel-select";

const meta: Meta<typeof NotificationChannelSelect> = {
  title: "Guilds/NotificationChannelSelect",
  component: NotificationChannelSelect,
  tags: ["autodocs"],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  argTypes: {
    guildId: {
      control: "text",
      description: "ギルドID",
    },
    currentChannelId: {
      control: "text",
      description: "現在設定されているチャンネルID（未設定時はnull）",
    },
  },
  decorators: [
    (StoryFn) => (
      <div style={{ maxWidth: 400, padding: 24 }}>
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト状態
 *
 * Server Actions が利用できないため、
 * 読み込み後にエラー状態を表示する。
 * 実環境ではチャンネル一覧がドロップダウンに表示される。
 */
export const Default: Story = {
  args: {
    guildId: "123456789012345678",
    currentChannelId: null,
  },
};

/**
 * チャンネル設定済み状態
 *
 * currentChannelIdが設定されている場合のストーリー。
 * Storybook上ではチャンネル取得エラーとなるが、
 * 実環境では該当チャンネルが選択された状態で表示される。
 */
export const WithSelectedChannel: Story = {
  args: {
    guildId: "123456789012345678",
    currentChannelId: "987654321098765432",
  },
};
