/**
 * GuildSettingsDialog の Storybook ストーリー
 *
 * DIS-47: ギルド設定ダイアログのストーリー
 */
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { GuildSettingsDialog } from "./guild-settings-dialog";

const meta = {
  title: "Guilds/GuildSettingsDialog",
  component: GuildSettingsDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof GuildSettingsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    guildId: "123456789",
    restricted: false,
  },
};

export const RestrictedOn: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    guildId: "123456789",
    restricted: true,
  },
};
