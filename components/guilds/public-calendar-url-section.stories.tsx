/**
 * PublicCalendarUrlSection の Storybook ストーリー
 *
 * Task 5.1, 5.2: 公開カレンダーURL設定セクション
 * - 公開設定オフ / オン の表示
 * - コピーボタン・再生成ボタンの表示
 */
import type { Meta, StoryObj } from "@storybook/react";
import { PublicCalendarUrlSection } from "./public-calendar-url-section";

const meta = {
  title: "Guilds/PublicCalendarUrlSection",
  component: PublicCalendarUrlSection,
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
} satisfies Meta<typeof PublicCalendarUrlSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Disabled: Story = {
  args: {
    guildId: "123456789",
    isPublic: false,
    publicSlug: null,
  },
};

export const Enabled: Story = {
  args: {
    guildId: "123456789",
    isPublic: true,
    publicSlug: "abc123def456",
  },
};
