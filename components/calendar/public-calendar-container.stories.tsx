/**
 * PublicCalendarContainer Storybook
 *
 * 公開カレンダーページのメインコンテナのストーリー。
 */
import type { Meta, StoryObj } from "@storybook/react";
import type { PublicCalendarEvent } from "@/lib/calendar/public-calendar-service";
import { PublicCalendarContainer } from "./public-calendar-container";

const meta = {
  title: "Components/Calendar/PublicCalendarContainer",
  component: PublicCalendarContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PublicCalendarContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const now = new Date();

const mockEvents: PublicCalendarEvent[] = [
  {
    id: "event-1",
    title: "定例ミーティング",
    start: new Date(now.getFullYear(), now.getMonth(), 15, 10, 0),
    end: new Date(now.getFullYear(), now.getMonth(), 15, 11, 0),
    allDay: false,
    color: "#3b82f6",
    description: "週次の定例ミーティングです。",
    location: "Discord VC",
  },
  {
    id: "event-2",
    title: "ゲームナイト",
    start: new Date(now.getFullYear(), now.getMonth(), 20, 20, 0),
    end: new Date(now.getFullYear(), now.getMonth(), 20, 23, 0),
    allDay: false,
    color: "#22c55e",
    description: undefined,
    location: undefined,
  },
  {
    id: "event-3",
    title: "メンテナンス日",
    start: new Date(now.getFullYear(), now.getMonth(), 25, 0, 0),
    end: new Date(now.getFullYear(), now.getMonth(), 25, 23, 59),
    allDay: true,
    color: "#f59e0b",
    description: "サーバーメンテナンス",
    location: undefined,
  },
];

export const Default: Story = {
  args: {
    guildId: "123456789012345678",
    guildName: "テストサーバー",
    initialEvents: mockEvents,
    initialDate: now,
  },
};

export const Empty: Story = {
  args: {
    guildId: "123456789012345678",
    guildName: "イベントなしサーバー",
    initialEvents: [],
    initialDate: now,
  },
};
