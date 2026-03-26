import type { Meta, StoryObj } from "@storybook/react";
import { UpcomingEventsSkeleton } from "./upcoming-events-skeleton";

const meta: Meta<typeof UpcomingEventsSkeleton> = {
  title: "Calendar/UpcomingEventsSkeleton",
  component: UpcomingEventsSkeleton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: "400px" }}>
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
