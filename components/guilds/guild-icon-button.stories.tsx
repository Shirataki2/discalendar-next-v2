/**
 * GuildIconButton Storybook
 *
 * アイコンのみ表示のギルド選択ボタンのストーリー。
 */
import type { Meta, StoryObj } from "@storybook/react";
import type { Guild } from "@/lib/guilds/types";
import { GuildIconButton } from "./guild-icon-button";

const meta = {
  title: "Components/Guilds/GuildIconButton",
  component: GuildIconButton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof GuildIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockGuildWithAvatar: Guild = {
  id: 1,
  guildId: "123456789",
  name: "テストサーバー",
  avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
  locale: "ja",
};

const mockGuildWithoutAvatar: Guild = {
  id: 2,
  guildId: "987654321",
  name: "アイコンなしサーバー",
  avatarUrl: null,
  locale: "ja",
};

export const Default: Story = {
  args: {
    guild: mockGuildWithAvatar,
    isSelected: false,
    onSelect: (guildId: string) => {
      console.log("Selected guild:", guildId);
    },
  },
};

export const Selected: Story = {
  args: {
    guild: mockGuildWithAvatar,
    isSelected: true,
    onSelect: (guildId: string) => {
      console.log("Selected guild:", guildId);
    },
  },
};

export const WithoutAvatar: Story = {
  args: {
    guild: mockGuildWithoutAvatar,
    isSelected: false,
    onSelect: (guildId: string) => {
      console.log("Selected guild:", guildId);
    },
  },
};

export const WithoutAvatarSelected: Story = {
  args: {
    guild: mockGuildWithoutAvatar,
    isSelected: true,
    onSelect: (guildId: string) => {
      console.log("Selected guild:", guildId);
    },
  },
};

export const MultipleIcons: Story = {
  args: {
    guild: mockGuildWithAvatar,
    isSelected: false,
    onSelect: (id: string) => console.log("Selected:", id),
  },
  render: () => (
    <div className="flex gap-3">
      <GuildIconButton
        guild={mockGuildWithAvatar}
        isSelected={false}
        onSelect={(id) => console.log("Selected:", id)}
      />
      <GuildIconButton
        guild={mockGuildWithoutAvatar}
        isSelected={true}
        onSelect={(id) => console.log("Selected:", id)}
      />
      <GuildIconButton
        guild={{
          ...mockGuildWithAvatar,
          id: 3,
          guildId: "111",
          name: "サーバー3",
        }}
        isSelected={false}
        onSelect={(id) => console.log("Selected:", id)}
      />
    </div>
  ),
};
