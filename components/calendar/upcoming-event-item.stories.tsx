import type { Meta, StoryObj } from "@storybook/react";
import type { UpcomingEvent } from "@/lib/calendar/cross-guild-event-types";
import { UpcomingEventItem } from "./upcoming-event-item";

const timedEvent: UpcomingEvent = {
  id: "event-1",
  title: "チームミーティング",
  start: "2026-03-25T10:00:00.000Z",
  end: "2026-03-25T11:00:00.000Z",
  allDay: false,
  color: "#3b82f6",
  isRecurring: false,
  guildId: "guild-1",
  guildName: "開発サーバー",
  guildAvatarUrl: null,
};

const allDayEvent: UpcomingEvent = {
  id: "event-2",
  title: "春分の日",
  start: "2026-03-20T00:00:00.000Z",
  end: "2026-03-20T23:59:59.000Z",
  allDay: true,
  color: "#ef4444",
  isRecurring: false,
  guildId: "guild-2",
  guildName: "祝日カレンダー",
  guildAvatarUrl: null,
};

const recurringEvent: UpcomingEvent = {
  id: "series-1:2026-03-25",
  title: "定例ミーティング",
  start: "2026-03-25T14:00:00.000Z",
  end: "2026-03-25T15:00:00.000Z",
  allDay: false,
  color: "#22c55e",
  isRecurring: true,
  guildId: "guild-1",
  guildName: "開発サーバー",
  guildAvatarUrl: null,
};

const meta: Meta<typeof UpcomingEventItem> = {
  title: "Calendar/UpcomingEventItem",
  component: UpcomingEventItem,
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

export const TimedEvent: Story = {
  args: { event: timedEvent },
};

export const AllDayEvent: Story = {
  args: { event: allDayEvent },
};

export const RecurringEvent: Story = {
  args: { event: recurringEvent },
};

export const VariousColors: Story = {
  render: () => (
    <div className="space-y-2">
      <UpcomingEventItem event={{ ...timedEvent, color: "#3b82f6" }} />
      <UpcomingEventItem event={{ ...timedEvent, color: "#ef4444" }} />
      <UpcomingEventItem event={{ ...timedEvent, color: "#22c55e" }} />
      <UpcomingEventItem event={{ ...timedEvent, color: "#f59e0b" }} />
    </div>
  ),
};

export const LongTitle: Story = {
  args: {
    event: {
      ...timedEvent,
      title:
        "非常に長いイベントタイトルで省略表示の確認をするためのテストイベント",
    },
  },
};
