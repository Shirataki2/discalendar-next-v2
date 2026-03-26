import type { Meta, StoryObj } from "@storybook/react";
import type { UpcomingEvent } from "@/lib/calendar/cross-guild-event-types";
import { UpcomingEventList } from "./upcoming-event-list";
import { UpcomingEventsEmpty } from "./upcoming-events-empty";
import { UpcomingEventsError } from "./upcoming-events-error";

/**
 * UpcomingEventsSection は async Server Component のため直接レンダリングできない。
 * 代わりに、各状態を子コンポーネントで再現するストーリーを提供する。
 */

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
  }),
  createEvent({
    id: "2",
    title: "定例ミーティング",
    start: "2026-03-27T14:00:00.000Z",
    end: "2026-03-27T15:00:00.000Z",
    color: "#22c55e",
    isRecurring: true,
  }),
];

const meta: Meta = {
  title: "Calendar/UpcomingEventsSection",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "async Server Component のため、各状態を子コンポーネントで再現しています。",
      },
    },
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
type Story = StoryObj;

/** 予定がある場合の表示 */
export const WithEvents: Story = {
  render: () => <UpcomingEventList events={sampleEvents} hasMore={false} />,
};

/** 予定がない場合の表示 */
export const NoEvents: Story = {
  render: () => <UpcomingEventsEmpty variant="no-events" />,
};

/** ギルド未参加の場合の表示 */
export const NoGuilds: Story = {
  render: () => <UpcomingEventsEmpty variant="no-guilds" />,
};

/** エラー発生時の表示 */
export const ErrorState: Story = {
  render: () => <UpcomingEventsError />,
};
