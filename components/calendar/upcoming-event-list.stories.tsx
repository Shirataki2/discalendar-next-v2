import type { Meta, StoryObj } from "@storybook/react";
import type { UpcomingEvent } from "@/lib/calendar/cross-guild-event-types";
import { UpcomingEventList } from "./upcoming-event-list";

function createEvent(overrides: Partial<UpcomingEvent> = {}): UpcomingEvent {
  return {
    id: "event-1",
    title: "テストイベント",
    start: "2026-03-25T10:00:00.000Z",
    end: "2026-03-25T11:00:00.000Z",
    allDay: false,
    color: "#3b82f6",
    isRecurring: false,
    guildId: "guild-1",
    guildName: "開発サーバー",
    guildAvatarUrl: null,
    ...overrides,
  };
}

const sampleEvents: UpcomingEvent[] = [
  createEvent({
    id: "1",
    title: "チームミーティング",
    start: "2026-03-25T10:00:00.000Z",
    end: "2026-03-25T11:00:00.000Z",
    color: "#3b82f6",
  }),
  createEvent({
    id: "2",
    title: "春分の日",
    start: "2026-03-26T00:00:00.000Z",
    end: "2026-03-26T23:59:59.000Z",
    allDay: true,
    color: "#ef4444",
    guildId: "guild-2",
    guildName: "祝日カレンダー",
  }),
  createEvent({
    id: "3",
    title: "定例ミーティング",
    start: "2026-03-27T14:00:00.000Z",
    end: "2026-03-27T15:00:00.000Z",
    color: "#22c55e",
    isRecurring: true,
  }),
  createEvent({
    id: "4",
    title: "デプロイ作業",
    start: "2026-03-28T09:00:00.000Z",
    end: "2026-03-28T10:00:00.000Z",
    color: "#f59e0b",
    guildId: "guild-3",
    guildName: "インフラチーム",
  }),
];

const meta: Meta<typeof UpcomingEventList> = {
  title: "Calendar/UpcomingEventList",
  component: UpcomingEventList,
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

export const Default: Story = {
  args: {
    events: sampleEvents,
    hasMore: false,
  },
};

export const WithHasMore: Story = {
  args: {
    events: sampleEvents,
    hasMore: true,
  },
};

export const SingleEvent: Story = {
  args: {
    events: [sampleEvents[0]],
    hasMore: false,
  },
};
