/**
 * AttendeeList Stories
 *
 * Task 5: AttendeeList コンポーネントのストーリー
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import type { Meta, StoryObj } from "@storybook/react";
import type { AttendeeRecord } from "@/lib/calendar/rsvp-types";
import { AttendeeList } from "./attendee-list";

function createAttendee(overrides: Partial<AttendeeRecord>): AttendeeRecord {
  return {
    id: crypto.randomUUID(),
    event_id: "event-1",
    event_series_id: null,
    occurrence_date: null,
    guild_id: "guild-1",
    user_id: "user-1",
    discord_user_id: "discord-1",
    discord_username: "TestUser",
    discord_avatar_url: null,
    status: "going",
    responded_at: new Date().toISOString(),
    ...overrides,
  };
}

const meta: Meta<typeof AttendeeList> = {
  title: "Calendar/AttendeeList",
  component: AttendeeList,
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
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 空状態
 * 回答者がいない場合のメッセージ表示
 */
export const Empty: Story = {
  args: {
    attendees: [],
    summary: { going: 0, maybe: 0, notGoing: 0, total: 0 },
  },
};

/**
 * 全ステータスに参加者がいる場合
 */
export const AllStatuses: Story = {
  args: {
    attendees: [
      createAttendee({
        discord_username: "Alice",
        discord_avatar_url: "https://i.pravatar.cc/32?u=alice",
        status: "going",
      }),
      createAttendee({
        discord_username: "Bob",
        discord_avatar_url: "https://i.pravatar.cc/32?u=bob",
        status: "going",
      }),
      createAttendee({
        discord_username: "Charlie",
        discord_avatar_url: "https://i.pravatar.cc/32?u=charlie",
        status: "going",
      }),
      createAttendee({
        discord_username: "Dave",
        status: "maybe",
      }),
      createAttendee({
        discord_username: "Eve",
        discord_avatar_url: "https://i.pravatar.cc/32?u=eve",
        status: "not_going",
      }),
    ],
    summary: { going: 3, maybe: 1, notGoing: 1, total: 5 },
  },
};

/**
 * 参加者のみ
 */
export const GoingOnly: Story = {
  args: {
    attendees: [
      createAttendee({
        discord_username: "Alice",
        discord_avatar_url: "https://i.pravatar.cc/32?u=alice",
        status: "going",
      }),
      createAttendee({
        discord_username: "Bob",
        status: "going",
      }),
    ],
    summary: { going: 2, maybe: 0, notGoing: 0, total: 2 },
  },
};

/**
 * アバターなし（フォールバック表示）
 */
export const NoAvatars: Story = {
  args: {
    attendees: [
      createAttendee({ discord_username: "Alice", status: "going" }),
      createAttendee({ discord_username: "Bob", status: "maybe" }),
      createAttendee({ discord_username: "Charlie", status: "not_going" }),
    ],
    summary: { going: 1, maybe: 1, notGoing: 1, total: 3 },
  },
};
