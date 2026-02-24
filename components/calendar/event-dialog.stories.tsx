/**
 * EventDialog Stories
 *
 * タスク5.2: 予定作成・編集ダイアログコンポーネントを作成する
 * - create/editモードのストーリーを定義
 * - ローディング状態のストーリーを定義
 * - エラー状態のストーリーを定義
 *
 * Requirements: 1.3, 1.5, 1.7, 3.1, 3.2, 3.4, 3.6
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { EventDialog } from "./event-dialog";

const meta: Meta<typeof EventDialog> = {
  title: "Calendar/EventDialog",
  component: EventDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    open: {
      control: "boolean",
      description: "ダイアログの開閉状態",
    },
    mode: {
      control: "radio",
      options: ["create", "edit"],
      description: "ダイアログモード",
    },
    guildId: {
      control: "text",
      description: "ギルドID",
    },
    eventId: {
      control: "text",
      description: "編集時のイベントID",
    },
    initialData: {
      control: "object",
      description: "フォームの初期値",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 新規作成モード
 * 空のフォームで新しい予定を作成
 */
export const CreateMode: Story = {
  args: {
    open: true,
    mode: "create",
    guildId: "guild-123",
    onClose: fn(),
    onSuccess: fn(),
  },
};

/**
 * 新規作成モード（期間選択済み）
 * ドラッグ選択で期間が設定された状態
 */
export const CreateModeWithInitialDates: Story = {
  args: {
    open: true,
    mode: "create",
    guildId: "guild-123",
    initialData: {
      startAt: new Date(2025, 11, 10, 10, 0),
      endAt: new Date(2025, 11, 10, 11, 0),
    },
    onClose: fn(),
    onSuccess: fn(),
  },
};

/**
 * 編集モード
 * 既存の予定データが設定された状態
 */
export const EditMode: Story = {
  args: {
    open: true,
    mode: "edit",
    guildId: "guild-123",
    eventId: "event-123",
    initialData: {
      title: "チームミーティング",
      startAt: new Date(2025, 11, 10, 10, 0),
      endAt: new Date(2025, 11, 10, 11, 0),
      description: "週次の進捗確認ミーティング",
      isAllDay: false,
      color: "#3B82F6",
      location: "会議室A",
    },
    onClose: fn(),
    onSuccess: fn(),
  },
};

/**
 * 編集モード（終日イベント）
 * 終日フラグがオンの予定
 */
export const EditModeAllDay: Story = {
  args: {
    open: true,
    mode: "edit",
    guildId: "guild-123",
    eventId: "event-456",
    initialData: {
      title: "年末休暇",
      startAt: new Date(2025, 11, 28),
      endAt: new Date(2026, 0, 3),
      description: "年末年始の休暇期間",
      isAllDay: true,
      color: "#22C55E",
      location: "",
    },
    onClose: fn(),
    onSuccess: fn(),
  },
};

/**
 * ローディング状態
 * 保存処理中の状態（フォームクリック後に確認可能）
 */
export const Loading: Story = {
  args: {
    open: true,
    mode: "create",
    guildId: "guild-123",
    initialData: {
      title: "テスト予定",
      startAt: new Date(2025, 11, 15, 14, 0),
      endAt: new Date(2025, 11, 15, 15, 0),
    },
    onClose: fn(),
    onSuccess: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "保存ボタンをクリックすると3秒間ローディング状態になります。フォームフィールドとボタンが無効化されます。",
      },
    },
  },
};

/**
 * エラー状態
 * 保存失敗時のエラー表示（保存ボタンクリック後に確認可能）
 */
export const ErrorState: Story = {
  args: {
    open: true,
    mode: "create",
    guildId: "guild-123",
    initialData: {
      title: "エラーテスト",
      startAt: new Date(2025, 11, 20, 10, 0),
      endAt: new Date(2025, 11, 20, 11, 0),
    },
    onClose: fn(),
    onSuccess: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "保存ボタンをクリックするとエラーメッセージが表示されます。ダイアログは開いたままになります。",
      },
    },
  },
};

/**
 * 閉じた状態
 * open=falseの状態（ダイアログは表示されない）
 */
export const Closed: Story = {
  args: {
    open: false,
    mode: "create",
    guildId: "guild-123",
    onClose: fn(),
    onSuccess: fn(),
  },
};
