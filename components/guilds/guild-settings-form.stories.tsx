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
    isPublic: false,
    publicSlug: null,
    feedUrl:
      "https://abc.supabase.co/functions/v1/ics-feed?guild_id=123456789&token=abc123def456",
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
    isPublic: false,
    publicSlug: null,
    feedUrl:
      "https://abc.supabase.co/functions/v1/ics-feed?guild_id=987654321&token=xyz789",
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
    isPublic: false,
    publicSlug: null,
    feedUrl:
      "https://abc.supabase.co/functions/v1/ics-feed?guild_id=123456789&token=abc123def456",
  },
};

export const PublicCalendarEnabled: Story = {
  args: {
    guild: {
      guildId: "123456789",
      name: "Public Calendar Server",
      avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
    },
    restricted: false,
    currentChannelId: null,
    isPublic: true,
    publicSlug: "abc123def456",
    feedUrl: "https://abc.supabase.co/functions/v1/ics-feed?guild_id=123456789",
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
    isPublic: false,
    publicSlug: null,
    feedUrl:
      "https://abc.supabase.co/functions/v1/ics-feed?guild_id=123456789&token=abc123def456",
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
