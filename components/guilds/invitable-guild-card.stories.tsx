/**
 * InvitableGuildCard Storybook
 *
 * BOT 未参加ギルドのカード表示と招待ボタンのストーリー。
 */
import type { Meta, StoryObj } from "@storybook/react";
import type { InvitableGuild } from "@/lib/guilds/types";
import { InvitableGuildCard } from "./invitable-guild-card";

const meta = {
  title: "Components/Guilds/InvitableGuildCard",
  component: InvitableGuildCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof InvitableGuildCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockGuildWithAvatar: InvitableGuild = {
  guildId: "123456789",
  name: "テストサーバー",
  avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
};

const mockGuildWithoutAvatar: InvitableGuild = {
  guildId: "987654321",
  name: "アイコンなしサーバー",
  avatarUrl: null,
};

const botInviteUrl =
  "https://discord.com/oauth2/authorize?client_id=12345&permissions=0&scope=bot";

export const Default: Story = {
  args: {
    guild: mockGuildWithAvatar,
    botInviteUrl,
  },
};

export const WithoutAvatar: Story = {
  args: {
    guild: mockGuildWithoutAvatar,
    botInviteUrl,
  },
};

export const WithoutInviteUrl: Story = {
  args: {
    guild: mockGuildWithAvatar,
    botInviteUrl: null,
  },
};

export const MultipleCards: Story = {
  args: {
    guild: mockGuildWithAvatar,
    botInviteUrl,
  },
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <InvitableGuildCard
        botInviteUrl={botInviteUrl}
        guild={mockGuildWithAvatar}
      />
      <InvitableGuildCard
        botInviteUrl={botInviteUrl}
        guild={mockGuildWithoutAvatar}
      />
      <InvitableGuildCard
        botInviteUrl={null}
        guild={{
          guildId: "111",
          name: "URL未設定サーバー",
          avatarUrl: null,
        }}
      />
    </div>
  ),
};
