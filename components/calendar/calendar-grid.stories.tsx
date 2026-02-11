/**
 * CalendarGrid Stories
 *
 * Task 4.1: CalendarGrid/CalendarToolbarコンポーネントのストーリー作成
 * - モックイベントデータを定義
 * - ビューモード別（month、week、day）のストーリーを定義
 * - イベントなし（empty）状態のストーリーを定義
 * - onEventClick、onDateChange等のActionsパネル連携を設定
 * - argTypesでviewMode、selectedDate等を制御可能に設定
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import type { CalendarEvent } from "@/lib/calendar/types";
import { CalendarGrid } from "./calendar-grid";

// モックイベントデータ
const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "チームミーティング",
    start: new Date(2025, 0, 15, 10, 0),
    end: new Date(2025, 0, 15, 11, 0),
    allDay: false,
    color: "#3b82f6",
    description: "週次の進捗確認ミーティング",
  },
  {
    id: "2",
    title: "祝日",
    start: new Date(2025, 0, 13, 0, 0),
    end: new Date(2025, 0, 13, 23, 59),
    allDay: true,
    color: "#ef4444",
    description: "成人の日",
  },
  {
    id: "3",
    title: "プロジェクトレビュー",
    start: new Date(2025, 0, 20, 14, 0),
    end: new Date(2025, 0, 20, 16, 0),
    allDay: false,
    color: "#22c55e",
    description: "Q1プロジェクトのレビュー会議",
    location: "会議室A",
  },
  {
    id: "4",
    title: "Discord配信",
    start: new Date(2025, 0, 18, 20, 0),
    end: new Date(2025, 0, 18, 22, 0),
    allDay: false,
    color: "#8b5cf6",
    description: "コミュニティ配信イベント",
    channel: { id: "123456", name: "general" },
  },
  {
    id: "5",
    title: "年次休暇",
    start: new Date(2025, 0, 22, 0, 0),
    end: new Date(2025, 0, 24, 23, 59),
    allDay: true,
    color: "#f59e0b",
    description: "休暇取得",
  },
];

const meta: Meta<typeof CalendarGrid> = {
  title: "Calendar/CalendarGrid",
  component: CalendarGrid,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    viewMode: {
      control: "select",
      options: ["month", "week", "day"],
      description: "カレンダーの表示モード",
    },
    selectedDate: {
      control: "date",
      description: "選択中の日付",
    },
    events: {
      control: "object",
      description: "表示するイベント一覧",
    },
  },
  decorators: [
    (StoryFn) => (
      <div style={{ height: "600px", padding: "1rem" }}>
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 月ビュー（デフォルト）
 * カレンダーを月単位で表示する標準的なビュー
 */
export const MonthView: Story = {
  args: {
    viewMode: "month",
    selectedDate: new Date(2025, 0, 15),
    today: new Date(2025, 0, 15),
    events: mockEvents,
    onEventClick: fn(),
    onDateChange: fn(),
    onEventDrop: fn(),
    onEventResize: fn(),
  },
};

/**
 * 週ビュー
 * カレンダーを週単位で表示し、時間軸を含むビュー
 */
export const WeekView: Story = {
  args: {
    viewMode: "week",
    selectedDate: new Date(2025, 0, 15),
    today: new Date(2025, 0, 15),
    events: mockEvents,
    onEventClick: fn(),
    onDateChange: fn(),
    onEventDrop: fn(),
    onEventResize: fn(),
  },
};

/**
 * 日ビュー
 * 単一の日を詳細に表示するビュー
 */
export const DayView: Story = {
  args: {
    viewMode: "day",
    selectedDate: new Date(2025, 0, 15),
    today: new Date(2025, 0, 15),
    events: mockEvents,
    onEventClick: fn(),
    onDateChange: fn(),
    onEventDrop: fn(),
    onEventResize: fn(),
  },
};

/**
 * イベントなし
 * イベントが存在しない場合の空の状態
 */
export const Empty: Story = {
  args: {
    viewMode: "month",
    selectedDate: new Date(2025, 0, 15),
    today: new Date(2025, 0, 15),
    events: [],
    onEventClick: fn(),
    onDateChange: fn(),
  },
};

/**
 * 多数のイベント
 * 1日に複数のイベントがある場合の表示確認
 */
export const ManyEvents: Story = {
  args: {
    viewMode: "month",
    selectedDate: new Date(2025, 0, 15),
    today: new Date(2025, 0, 15),
    events: [
      ...mockEvents,
      {
        id: "6",
        title: "朝会",
        start: new Date(2025, 0, 15, 9, 0),
        end: new Date(2025, 0, 15, 9, 30),
        allDay: false,
        color: "#06b6d4",
      },
      {
        id: "7",
        title: "ランチミーティング",
        start: new Date(2025, 0, 15, 12, 0),
        end: new Date(2025, 0, 15, 13, 0),
        allDay: false,
        color: "#ec4899",
      },
      {
        id: "8",
        title: "1on1",
        start: new Date(2025, 0, 15, 15, 0),
        end: new Date(2025, 0, 15, 15, 30),
        allDay: false,
        color: "#14b8a6",
      },
    ],
    onEventClick: fn(),
    onDateChange: fn(),
  },
};

/**
 * 今日がハイライトされた表示
 * 今日の日付セルがハイライトされることを確認
 */
export const TodayHighlighted: Story = {
  args: {
    viewMode: "month",
    selectedDate: new Date(),
    today: new Date(),
    events: mockEvents.map((event) => ({
      ...event,
      start: new Date(),
      end: new Date(Date.now() + 3_600_000), // 1時間後
    })),
    onEventClick: fn(),
    onDateChange: fn(),
    onEventDrop: fn(),
    onEventResize: fn(),
  },
};

/**
 * ドラッグ＆ドロップ
 * 週ビューでイベントのドラッグ移動・リサイズを確認
 */
export const DragAndDrop: Story = {
  args: {
    viewMode: "week",
    selectedDate: new Date(2025, 0, 15),
    today: new Date(2025, 0, 15),
    events: mockEvents,
    onEventClick: fn(),
    onDateChange: fn(),
    onEventDrop: fn(),
    onEventResize: fn(),
    resizable: true,
  },
};
