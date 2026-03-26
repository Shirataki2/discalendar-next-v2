import type { Meta, StoryObj } from "@storybook/react";
import { UpcomingEventsError } from "./upcoming-events-error";

const meta: Meta<typeof UpcomingEventsError> = {
  title: "Calendar/UpcomingEventsError",
  component: UpcomingEventsError,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    nextjs: { appDirectory: true },
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
