import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { PollFinalizeModal } from "./poll-finalize-modal";

const meta: Meta<typeof PollFinalizeModal> = {
  title: "Polls/PollFinalizeModal",
  component: PollFinalizeModal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof PollFinalizeModal>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <PollFinalizeModal
        candidateOptions={[
          {
            id: "opt-1",
            poll_id: "poll-1",
            starts_at: "2026-04-20T03:00:00Z",
            ends_at: "2026-04-20T04:00:00Z",
            position: 0,
            created_at: "2026-04-18T00:00:00Z",
          },
          {
            id: "opt-2",
            poll_id: "poll-1",
            starts_at: "2026-04-21T03:00:00Z",
            ends_at: "2026-04-21T04:00:00Z",
            position: 1,
            created_at: "2026-04-18T00:00:00Z",
          },
        ]}
        onConfirm={(id) => {
          // biome-ignore lint/suspicious/noConsole: storybook demo
          console.log("confirm", id);
          return Promise.resolve();
        }}
        onOpenChange={setOpen}
        open={open}
      />
    );
  },
};
