/**
 * GuildSettingsPanel の Storybook ストーリー
 *
 * Task 7.1: ギルド設定パネルのストーリー
 * - 管理者表示（restricted OFF / ON）
 * - ローディング状態
 */
import type { Meta, StoryObj } from "@storybook/react";
import { GuildSettingsPanel } from "./guild-settings-panel";

const meta = {
  title: "Guilds/GuildSettingsPanel",
  component: GuildSettingsPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: 320 }}>
        <StoryFn />
      </div>
    ),
  ],
} satisfies Meta<typeof GuildSettingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    guildId: "123456789",
    restricted: false,
  },
};

export const RestrictedOn: Story = {
  args: {
    guildId: "123456789",
    restricted: true,
  },
};
