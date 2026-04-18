import type { Meta, StoryObj } from "@storybook/react";
import { PollCard } from "./poll-card";

const meta: Meta<typeof PollCard> = {
  title: "Polls/PollCard",
  component: PollCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj<typeof PollCard>;

const basePoll = {
  id: "poll-1",
  guild_id: "123456789012345678",
  title: "次回ミートアップの日程調整",
  description: "候補日時を投票で決めます。2 件まで ○ できます。",
  status: "open" as const,
  channel_id: "c1",
  message_id: null,
  created_by: "u1",
  finalized_by: null,
  finalized_option_id: null,
  finalized_event_id: null,
  created_at: "2026-04-18T00:00:00Z",
  updated_at: "2026-04-18T00:00:00Z",
};

export const Open: Story = {
  args: { poll: basePoll },
};

export const Closed: Story = {
  args: { poll: { ...basePoll, status: "closed" } },
};

export const Finalized: Story = {
  args: {
    poll: {
      ...basePoll,
      status: "finalized",
      finalized_event_id: "evt-1",
      finalized_option_id: "opt-1",
    },
  },
};
