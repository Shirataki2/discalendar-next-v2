import type { Meta, StoryObj } from "@storybook/react";
import { PollOptionRow } from "./poll-option-row";

const meta: Meta<typeof PollOptionRow> = {
  title: "Polls/PollOptionRow",
  component: PollOptionRow,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj<typeof PollOptionRow>;

const option = {
  id: "opt-1",
  poll_id: "poll-1",
  starts_at: "2026-04-20T03:00:00Z",
  ends_at: "2026-04-20T04:00:00Z",
  position: 0,
  created_at: "2026-04-18T00:00:00Z",
};

export const Default: Story = {
  args: {
    option,
    aggregate: {
      optionId: "opt-1",
      counts: { yes: 3, maybe: 1, no: 0 },
      yesVoters: ["user-a", "user-b", "user-c"],
    },
  },
};

export const Winner: Story = {
  args: {
    ...Default.args,
    isWinner: true,
  },
};

export const ManyVoters: Story = {
  args: {
    option,
    aggregate: {
      optionId: "opt-1",
      counts: { yes: 25, maybe: 0, no: 0 },
      yesVoters: Array.from({ length: 25 }, (_, idx) => `user-${idx + 1}`),
    },
  },
};
