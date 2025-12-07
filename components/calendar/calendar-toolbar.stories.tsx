/**
 * CalendarToolbar Stories
 *
 * Task 4.1: CalendarGrid/CalendarToolbarコンポーネントのストーリー作成
 * - ビューモード切替・日付ナビゲーションのストーリーを定義
 * - onViewChange、onNavigate等のActionsパネル連携を設定
 * - モバイル/デスクトップ両方のビューポートで表示確認
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { CalendarToolbar } from "./calendar-toolbar";

const meta: Meta<typeof CalendarToolbar> = {
  title: "Calendar/CalendarToolbar",
  component: CalendarToolbar,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    viewMode: {
      control: "select",
      options: ["month", "week", "day"],
      description: "現在のビューモード",
    },
    selectedDate: {
      control: "date",
      description: "選択中の日付",
    },
    isMobile: {
      control: "boolean",
      description: "モバイル表示かどうか",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 月ビュー（デスクトップ）
 * デスクトップサイズでの月ビュー表示
 */
export const MonthViewDesktop: Story = {
  args: {
    viewMode: "month",
    selectedDate: new Date(2025, 0, 15),
    onViewChange: fn(),
    onNavigate: fn(),
    isMobile: false,
  },
};

/**
 * 週ビュー（デスクトップ）
 * 週ビューでは日付範囲がラベルに表示される
 */
export const WeekViewDesktop: Story = {
  args: {
    viewMode: "week",
    selectedDate: new Date(2025, 0, 15),
    onViewChange: fn(),
    onNavigate: fn(),
    isMobile: false,
  },
};

/**
 * 日ビュー（デスクトップ）
 * 日ビューでは曜日を含む日付がラベルに表示される
 */
export const DayViewDesktop: Story = {
  args: {
    viewMode: "day",
    selectedDate: new Date(2025, 0, 15),
    onViewChange: fn(),
    onNavigate: fn(),
    isMobile: false,
  },
};

/**
 * 月ビュー（モバイル）
 * モバイルサイズでの縦積みレイアウト
 */
export const MonthViewMobile: Story = {
  args: {
    viewMode: "month",
    selectedDate: new Date(2025, 0, 15),
    onViewChange: fn(),
    onNavigate: fn(),
    isMobile: true,
  },
  parameters: {
    viewport: { defaultViewport: "mobile" },
  },
};

/**
 * 週ビュー（モバイル）
 * モバイルサイズでの週ビュー表示
 */
export const WeekViewMobile: Story = {
  args: {
    viewMode: "week",
    selectedDate: new Date(2025, 0, 15),
    onViewChange: fn(),
    onNavigate: fn(),
    isMobile: true,
  },
  parameters: {
    viewport: { defaultViewport: "mobile" },
  },
};

/**
 * 日ビュー（モバイル）
 * モバイルサイズでの日ビュー表示
 */
export const DayViewMobile: Story = {
  args: {
    viewMode: "day",
    selectedDate: new Date(2025, 0, 15),
    onViewChange: fn(),
    onNavigate: fn(),
    isMobile: true,
  },
  parameters: {
    viewport: { defaultViewport: "mobile" },
  },
};

/**
 * 月をまたぐ週
 * 週ビューで月をまたぐ場合の日付範囲表示
 */
export const WeekAcrossMonths: Story = {
  args: {
    viewMode: "week",
    selectedDate: new Date(2025, 0, 30), // 1月30日（週が月をまたぐ）
    onViewChange: fn(),
    onNavigate: fn(),
    isMobile: false,
  },
};

/**
 * 全ビューモードの比較
 * 各ビューモードを並べて表示
 */
export const AllViewModes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-muted-foreground text-sm">月ビュー:</p>
        <CalendarToolbar
          isMobile={false}
          onNavigate={fn()}
          onViewChange={fn()}
          selectedDate={new Date(2025, 0, 15)}
          viewMode="month"
        />
      </div>
      <div>
        <p className="mb-2 text-muted-foreground text-sm">週ビュー:</p>
        <CalendarToolbar
          isMobile={false}
          onNavigate={fn()}
          onViewChange={fn()}
          selectedDate={new Date(2025, 0, 15)}
          viewMode="week"
        />
      </div>
      <div>
        <p className="mb-2 text-muted-foreground text-sm">日ビュー:</p>
        <CalendarToolbar
          isMobile={false}
          onNavigate={fn()}
          onViewChange={fn()}
          selectedDate={new Date(2025, 0, 15)}
          viewMode="day"
        />
      </div>
    </div>
  ),
};
