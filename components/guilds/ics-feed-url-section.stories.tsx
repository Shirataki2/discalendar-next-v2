/**
 * IcsFeedUrlSection の Storybook ストーリー
 *
 * Task 5.3: ICSフィードURL管理セクション
 * - 公開ギルド（トークンなしURL）
 * - 非公開ギルド（トークン付きURL）
 * - フィードURL取得失敗
 */
import type { Meta, StoryObj } from "@storybook/react";
import { IcsFeedUrlSection } from "./ics-feed-url-section";

const meta = {
  title: "Guilds/IcsFeedUrlSection",
  component: IcsFeedUrlSection,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: 480 }}>
        <StoryFn />
      </div>
    ),
  ],
} satisfies Meta<typeof IcsFeedUrlSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PublicGuild: Story = {
  name: "公開ギルド（トークンなし）",
  args: {
    guildId: "123456789012345678",
    isPublic: true,
    feedUrl:
      "https://abcdefgh.supabase.co/functions/v1/ics-feed?guild_id=123456789012345678",
  },
};

export const PrivateGuild: Story = {
  name: "非公開ギルド（トークン付き）",
  args: {
    guildId: "123456789012345678",
    isPublic: false,
    feedUrl:
      "https://abcdefgh.supabase.co/functions/v1/ics-feed?guild_id=123456789012345678&token=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  },
};

export const FeedUrlError: Story = {
  name: "フィードURL取得失敗",
  args: {
    guildId: "123456789012345678",
    isPublic: false,
    feedUrl: "",
  },
};
