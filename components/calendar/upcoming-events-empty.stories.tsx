import type { Meta, StoryObj } from "@storybook/react";
import { UpcomingEventsEmpty } from "./upcoming-events-empty";

const meta: Meta<typeof UpcomingEventsEmpty> = {
  title: "Calendar/UpcomingEventsEmpty",
  component: UpcomingEventsEmpty,
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

export const NoEvents: Story = {
  args: { variant: "no-events" },
};

export const NoGuilds: Story = {
  args: { variant: "no-guilds" },
};
