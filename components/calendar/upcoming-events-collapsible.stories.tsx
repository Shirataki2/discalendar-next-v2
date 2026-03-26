import type { Meta, StoryObj } from "@storybook/react";
import { UpcomingEventsCollapsible } from "./upcoming-events-collapsible";

const meta: Meta<typeof UpcomingEventsCollapsible> = {
  title: "Calendar/UpcomingEventsCollapsible",
  component: UpcomingEventsCollapsible,
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

export const Expanded: Story = {
  args: {
    children: (
      <div className="rounded border p-4 text-muted-foreground text-sm">
        直近の予定がここに表示されます
      </div>
    ),
  },
};

export const WithMultipleItems: Story = {
  args: {
    children: (
      <div className="space-y-2">
        <div className="rounded border p-3 text-sm">チームミーティング</div>
        <div className="rounded border p-3 text-sm">定例ミーティング</div>
        <div className="rounded border p-3 text-sm">デプロイ作業</div>
      </div>
    ),
  },
};
