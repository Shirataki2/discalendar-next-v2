/**
 * UserGuildList Storybook
 *
 * ユーザーが参加しているギルドをリスト表示するコンポーネントのストーリー。
 */
import type { Meta, StoryObj } from "@storybook/react";
import type { Guild } from "@/lib/guilds/types";
import { UserGuildList } from "./user-guild-list";

const meta = {
  title: "Components/User/UserGuildList",
  component: UserGuildList,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof UserGuildList>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockGuilds: Guild[] = [
  {
    id: 1,
    guildId: "111111111111111111",
    name: "テストサーバー1",
    avatarUrl: "https://cdn.discordapp.com/icons/111111111111111111/icon1.png",
    locale: "ja",
  },
  {
    id: 2,
    guildId: "222222222222222222",
    name: "テストサーバー2",
    avatarUrl: null,
    locale: "ja",
  },
  {
    id: 3,
    guildId: "333333333333333333",
    name: "English Server",
    avatarUrl: "https://cdn.discordapp.com/icons/333333333333333333/icon3.png",
    locale: "en",
  },
];

export const WithGuilds: Story = {
  args: {
    guilds: mockGuilds,
  },
};

export const EmptyGuilds: Story = {
  args: {
    guilds: [],
  },
};

export const SingleGuild: Story = {
  args: {
    guilds: [mockGuilds[0]],
  },
};
