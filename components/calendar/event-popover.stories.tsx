/**
 * EventPopover Stories
 *
 * Task 4.2: EventBlock/EventPopoverコンポーネントのストーリー作成
 * - モックイベントデータを定義
 * - ポップオーバー開閉状態のストーリーを定義
 * - イベント詳細表示（タイトル、時間、説明）のストーリーを定義
 * - onClose等のActionsパネル連携を設定
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import type { CalendarEvent } from "@/lib/calendar/types";
import { EventPopover } from "./event-popover";

// モックイベントデータ
const basicEvent: CalendarEvent = {
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
  title: "成人の日",
  start: new Date(2025, 0, 13, 0, 0),
  end: new Date(2025, 0, 13, 23, 59),
  allDay: true,
  color: "#ef4444",
  description: "国民の祝日",
};

const multiDayEvent: CalendarEvent = {
  id: "3",
  title: "年次休暇",
  start: new Date(2025, 0, 22, 0, 0),
  end: new Date(2025, 0, 24, 23, 59),
  allDay: true,
  color: "#f59e0b",
  description: "休暇取得予定",
};

const eventWithLocation: CalendarEvent = {
  id: "4",
  title: "プロジェクトレビュー",
  start: new Date(2025, 0, 20, 14, 0),
  end: new Date(2025, 0, 20, 16, 0),
  allDay: false,
  color: "#22c55e",
  description: "Q1プロジェクトの中間レビュー会議。各チームから進捗報告を行う。",
  location: "会議室A（3階）",
};

const eventWithChannel: CalendarEvent = {
  id: "5",
  title: "Discord配信",
  start: new Date(2025, 0, 18, 20, 0),
  end: new Date(2025, 0, 18, 22, 0),
  allDay: false,
  color: "#8b5cf6",
  description: "コミュニティ向けのゲーム配信イベント",
  channel: { id: "123456789", name: "general" },
};

const fullEvent: CalendarEvent = {
  id: "6",
  title: "チームビルディングイベント",
  start: new Date(2025, 0, 25, 13, 0),
  end: new Date(2025, 0, 25, 18, 0),
  allDay: false,
  color: "#06b6d4",
  description:
    "チーム全員参加のビルディングイベント。ランチからスタートし、アクティビティを行います。",
  location: "オフィス カフェテリア",
  channel: { id: "987654321", name: "team-building" },
};

const minimalEvent: CalendarEvent = {
  id: "7",
  title: "簡単なミーティング",
  start: new Date(2025, 0, 15, 9, 0),
  end: new Date(2025, 0, 15, 9, 30),
  allDay: false,
  color: "#64748b",
};

const meta: Meta<typeof EventPopover> = {
  title: "Calendar/EventPopover",
  component: EventPopover,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    event: {
      control: "object",
      description: "表示対象のイベント",
    },
    open: {
      control: "boolean",
      description: "ポップオーバーの開閉状態",
    },
  },
  decorators: [
    (StoryFn) => (
      <div style={{ minHeight: "400px", padding: "2rem" }}>
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 基本イベント（開いた状態）
 * 時間指定イベントの基本的な表示
 */
export const BasicEventOpen: Story = {
  args: {
    event: basicEvent,
    open: true,
    onClose: fn(),
  },
};

/**
 * 閉じた状態
 * ポップオーバーが閉じている状態（何も表示されない）
 */
export const Closed: Story = {
  args: {
    event: basicEvent,
    open: false,
    onClose: fn(),
  },
};

/**
 * 終日イベント
 * allDay: true のイベント表示
 */
export const AllDayEvent: Story = {
  args: {
    event: allDayEvent,
    open: true,
    onClose: fn(),
  },
};

/**
 * 複数日イベント
 * 複数日にまたがる終日イベント
 */
export const MultiDayEvent: Story = {
  args: {
    event: multiDayEvent,
    open: true,
    onClose: fn(),
  },
};

/**
 * 場所情報付き
 * location フィールドを含むイベント
 */
export const WithLocation: Story = {
  args: {
    event: eventWithLocation,
    open: true,
    onClose: fn(),
  },
};

/**
 * Discordチャンネル付き
 * channel フィールドを含むイベント
 */
export const WithChannel: Story = {
  args: {
    event: eventWithChannel,
    open: true,
    onClose: fn(),
  },
};

/**
 * 全情報表示
 * 全てのフィールド（説明、場所、チャンネル）を含むイベント
 */
export const FullEvent: Story = {
  args: {
    event: fullEvent,
    open: true,
    onClose: fn(),
  },
};

/**
 * 最小情報
 * タイトルと日時のみのシンプルなイベント
 */
export const MinimalEvent: Story = {
  args: {
    event: minimalEvent,
    open: true,
    onClose: fn(),
  },
};

/**
 * イベントなし
 * event が null の場合（何も表示されない）
 */
export const NoEvent: Story = {
  args: {
    event: null,
    open: true,
    onClose: fn(),
  },
};

/**
 * 異なる日をまたぐ時間指定イベント
 * 日付をまたぐイベントの表示
 */
export const CrossDayTimedEvent: Story = {
  args: {
    event: {
      id: "8",
      title: "深夜作業",
      start: new Date(2025, 0, 15, 22, 0),
      end: new Date(2025, 0, 16, 2, 0),
      allDay: false,
      color: "#1e293b",
      description: "メンテナンス作業",
    } as CalendarEvent,
    open: true,
    onClose: fn(),
  },
};

/**
 * カラーバリエーション
 * 異なるカラーのイベント表示を比較
 */
export const ColorVariations: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <EventPopover
        event={{ ...basicEvent, color: "#3b82f6" }}
        onClose={fn()}
        open
      />
      <EventPopover
        event={{ ...basicEvent, color: "#ef4444", title: "重要会議" }}
        onClose={fn()}
        open
      />
      <EventPopover
        event={{ ...basicEvent, color: "#22c55e", title: "完了タスク" }}
        onClose={fn()}
        open
      />
    </div>
  ),
};

/**
 * 編集・削除ボタン付き (Task 6.1)
 * onEdit と onDelete コールバックを持つイベント
 */
export const WithEditDeleteButtons: Story = {
  args: {
    event: basicEvent,
    open: true,
    onClose: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
};

/**
 * 編集ボタンのみ (Task 6.1)
 * onEdit のみ提供されている場合
 */
export const WithEditButtonOnly: Story = {
  args: {
    event: fullEvent,
    open: true,
    onClose: fn(),
    onEdit: fn(),
  },
};

/**
 * 削除ボタンのみ (Task 6.1)
 * onDelete のみ提供されている場合
 */
export const WithDeleteButtonOnly: Story = {
  args: {
    event: eventWithLocation,
    open: true,
    onClose: fn(),
    onDelete: fn(),
  },
};
