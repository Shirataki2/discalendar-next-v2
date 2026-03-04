import type { Meta, StoryObj } from "@storybook/react";
import { GuildSettingsForm } from "./guild-settings-form";

const meta = {
  title: "Guilds/GuildSettingsForm",
  component: GuildSettingsForm,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  decorators: [
    (StoryFn) => (
      <div style={{ padding: 24 }}>
        <StoryFn />
      </div>
    ),
  ],
} satisfies Meta<typeof GuildSettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAvatar: Story = {
  args: {
    guild: {
      guildId: "123456789",
      name: "My Discord Server",
      avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
    },
    restricted: false,
    currentChannelId: null,
  },
};

export const WithoutAvatar: Story = {
  args: {
    guild: {
      guildId: "987654321",
      name: "No Icon Server",
      avatarUrl: null,
    },
    restricted: false,
    currentChannelId: null,
  },
};

export const RestrictedOn: Story = {
  args: {
    guild: {
      guildId: "123456789",
      name: "Restricted Server",
      avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
    },
    restricted: true,
    currentChannelId: "11111111111111111",
  },
};

export const Mobile: Story = {
  args: {
    guild: {
      guildId: "123456789",
      name: "Mobile View Server",
      avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
    },
    restricted: false,
    currentChannelId: null,
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
