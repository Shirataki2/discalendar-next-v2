/**
 * RsvpButtons Stories
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2
 */

import type { Meta, StoryObj } from "@storybook/react";
import { RsvpButtons } from "./rsvp-buttons";

const meta: Meta<typeof RsvpButtons> = {
  title: "Calendar/RsvpButtons",
  component: RsvpButtons,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (StoryFn) => (
      <div style={{ minWidth: "300px", padding: "1rem" }}>
        <StoryFn />
      </div>
    ),
  ],
  args: {
    guildId: "11111111111111111",
    eventId: "event-1",
    seriesId: null,
    occurrenceDate: null,
    currentStatus: null,
    isAuthenticated: true,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 未選択状態
 */
export const Default: Story = {};

/**
 * 参加を選択中
 */
export const Going: Story = {
  args: {
    currentStatus: "going",
  },
};

/**
 * 未定を選択中
 */
export const Maybe: Story = {
  args: {
    currentStatus: "maybe",
  },
};

/**
 * 不参加を選択中
 */
export const NotGoing: Story = {
  args: {
    currentStatus: "not_going",
  },
};

/**
 * 未認証（ボタン無効化 + ログイン誘導テキスト）
 */
export const Unauthenticated: Story = {
  args: {
    isAuthenticated: false,
  },
};
