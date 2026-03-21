/**
 * GuildIconButton Storybook
 *
 * アイコンのみ表示のギルド選択ボタンのストーリー。
 */
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
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
  isPublic: false,
  publicSlug: null,
};

const mockGuildWithoutAvatar: Guild = {
  id: 2,
  guildId: "987654321",
  name: "アイコンなしサーバー",
  avatarUrl: null,
  locale: "ja",
  isPublic: false,
  publicSlug: null,
};

export const Default: Story = {
  args: {
    guild: mockGuildWithAvatar,
    isSelected: false,
    onSelect: fn(),
  },
};

export const Selected: Story = {
  args: {
    guild: mockGuildWithAvatar,
    isSelected: true,
    onSelect: fn(),
  },
};

export const WithoutAvatar: Story = {
  args: {
    guild: mockGuildWithoutAvatar,
    isSelected: false,
    onSelect: fn(),
  },
};

export const WithoutAvatarSelected: Story = {
  args: {
    guild: mockGuildWithoutAvatar,
    isSelected: true,
    onSelect: fn(),
  },
};

export const MultipleIcons: Story = {
  args: {
    guild: mockGuildWithAvatar,
    isSelected: false,
    onSelect: fn(),
  },
  render: () => {
    const handleSelect = fn();
    return (
      <div className="flex gap-3">
        <GuildIconButton
          guild={mockGuildWithAvatar}
          isSelected={false}
          onSelect={handleSelect}
        />
        <GuildIconButton
          guild={mockGuildWithoutAvatar}
          isSelected={true}
          onSelect={handleSelect}
        />
        <GuildIconButton
          guild={{
            ...mockGuildWithAvatar,
            id: 3,
            guildId: "111",
            name: "サーバー3",
          }}
          isSelected={false}
          onSelect={handleSelect}
        />
      </div>
    );
  },
};
