/**
 * EventBlock Stories
 *
 * Task 4.2: EventBlock/EventPopoverコンポーネントのストーリー作成
 * - モックイベントデータを定義
 * - 通常イベント・終日イベントのストーリーを定義
 * - onEventClick等のActionsパネル連携を設定
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import type { CalendarEvent } from "@/lib/calendar/types";
import { EventBlock } from "./event-block";

// モックイベントデータ
const timedEvent: CalendarEvent = {
  id: "1",
  title: "チームミーティング",
  start: new Date(2025, 0, 15, 10, 0),
  end: new Date(2025, 0, 15, 11, 0),
  allDay: false,
  color: "#3b82f6",
  description: "週次の進捗確認ミーティング",
};

const allDayEvent: CalendarEvent = {
  id: "2",
  title: "祝日",
  start: new Date(2025, 0, 13, 0, 0),
  end: new Date(2025, 0, 13, 23, 59),
  allDay: true,
  color: "#ef4444",
  description: "成人の日",
};

const longTitleEvent: CalendarEvent = {
  id: "3",
  title: "非常に長いイベントタイトルで省略表示の確認をするためのテストイベント",
  start: new Date(2025, 0, 15, 14, 0),
  end: new Date(2025, 0, 15, 16, 0),
  allDay: false,
  color: "#22c55e",
  description: "タイトルが長い場合の表示確認",
};

const meta: Meta<typeof EventBlock> = {
  title: "Calendar/EventBlock",
  component: EventBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    event: {
      control: "object",
      description: "イベントデータ",
    },
    title: {
      control: "text",
      description: "イベントタイトル",
    },
    showTime: {
      control: "boolean",
      description: "時刻を表示するかどうか",
    },
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: "200px" }}>
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 時間指定イベント（デフォルト）
 * 開始・終了時刻が指定された通常のイベント
 */
export const TimedEvent: Story = {
  args: {
    event: timedEvent,
    title: timedEvent.title,
    showTime: false,
    onClick: fn(),
  },
};

/**
 * 時間指定イベント（時刻表示あり）
 * 開始時刻を表示するバージョン
 */
export const TimedEventWithTime: Story = {
  args: {
    event: timedEvent,
    title: timedEvent.title,
    showTime: true,
    onClick: fn(),
  },
};

/**
 * 終日イベント
 * allDay: true のイベント表示
 */
export const AllDayEvent: Story = {
  args: {
    event: allDayEvent,
    title: allDayEvent.title,
    showTime: false,
    onClick: fn(),
  },
};

/**
 * 長いタイトル
 * タイトルが長い場合の省略表示確認
 */
export const LongTitle: Story = {
  args: {
    event: longTitleEvent,
    title: longTitleEvent.title,
    showTime: false,
    onClick: fn(),
  },
};

/**
 * 各種カラー
 * 異なるカラーのイベント表示
 */
export const VariousColors: Story = {
  render: () => (
    <div className="space-y-2">
      <EventBlock
        event={{ ...timedEvent, color: "#3b82f6" }}
        onClick={fn()}
        title="ブルー"
      />
      <EventBlock
        event={{ ...timedEvent, color: "#ef4444" }}
        onClick={fn()}
        title="レッド"
      />
      <EventBlock
        event={{ ...timedEvent, color: "#22c55e" }}
        onClick={fn()}
        title="グリーン"
      />
      <EventBlock
        event={{ ...timedEvent, color: "#f59e0b" }}
        onClick={fn()}
        title="アンバー"
      />
      <EventBlock
        event={{ ...timedEvent, color: "#8b5cf6" }}
        onClick={fn()}
        title="バイオレット"
      />
      <EventBlock
        event={{ ...timedEvent, color: "#ec4899" }}
        onClick={fn()}
        title="ピンク"
      />
    </div>
  ),
};

/**
 * 時間指定 vs 終日
 * 時間指定イベントと終日イベントの視覚的な違い
 */
export const TimedVsAllDay: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-muted-foreground text-sm">時間指定イベント:</p>
        <EventBlock
          event={timedEvent}
          onClick={fn()}
          showTime
          title={timedEvent.title}
        />
      </div>
      <div>
        <p className="mb-2 text-muted-foreground text-sm">終日イベント:</p>
        <EventBlock
          event={allDayEvent}
          onClick={fn()}
          title={allDayEvent.title}
        />
      </div>
    </div>
  ),
};

/**
 * フォーカス状態
 * キーボードフォーカス時のスタイル確認
 */
export const FocusState: Story = {
  args: {
    event: timedEvent,
    title: timedEvent.title,
    showTime: false,
    onClick: fn(),
  },
  parameters: {
    pseudo: { focus: true },
  },
};

/**
 * ツールチップ表示 (Task 8.1)
 * ホバー時にネイティブツールチップを表示
 * - 時間指定イベント: タイトルと時間
 * - 終日イベント: タイトルと「終日」
 */
export const WithTooltip: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-muted-foreground text-sm">
          時間指定イベント（ホバーで「チームミーティング (10:00 -
          11:00)」と表示）:
        </p>
        <EventBlock
          event={timedEvent}
          onClick={fn()}
          title={timedEvent.title}
        />
      </div>
      <div>
        <p className="mb-2 text-muted-foreground text-sm">
          終日イベント（ホバーで「祝日 (終日)」と表示）:
        </p>
        <EventBlock
          event={allDayEvent}
          onClick={fn()}
          title={allDayEvent.title}
        />
      </div>
    </div>
  ),
};
