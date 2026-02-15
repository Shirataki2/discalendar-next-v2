/**
 * EventForm Stories
 *
 * タスク5.1: 予定入力フォームコンポーネントを作成する
 * - 初期値あり/なしのストーリーを定義
 * - バリデーションエラー状態のストーリーを定義
 * - ローディング状態のストーリーを定義
 * - 終日イベント用フォームのストーリーを定義
 *
 * Requirements: 1.3, 1.6, 3.2, 3.5
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { EventForm } from "./event-form";

const meta: Meta<typeof EventForm> = {
  title: "Calendar/EventForm",
  component: EventForm,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    defaultValues: {
      control: "object",
      description: "フォームの初期値",
    },
    isSubmitting: {
      control: "boolean",
      description: "送信中かどうか",
    },
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: "400px", padding: "1rem" }}>
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト状態
 * 初期値なしの空のフォーム
 */
export const Default: Story = {
  args: {
    onSubmit: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
};

/**
 * 初期値あり
 * 既存の予定データが設定されたフォーム（編集モード）
 */
export const WithDefaultValues: Story = {
  args: {
    defaultValues: {
      title: "チームミーティング",
      startAt: new Date(2025, 11, 10, 10, 0),
      endAt: new Date(2025, 11, 10, 11, 0),
      description: "週次の進捗確認ミーティング",
      isAllDay: false,
      color: "#3B82F6",
      location: "会議室A",
    },
    onSubmit: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
};

/**
 * 終日イベント
 * 終日フラグがオンの状態のフォーム
 */
export const AllDayEvent: Story = {
  args: {
    defaultValues: {
      title: "休暇",
      startAt: new Date(2025, 11, 25),
      endAt: new Date(2025, 11, 26),
      description: "年末休暇",
      isAllDay: true,
      color: "#22C55E",
      location: "",
    },
    onSubmit: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
};

/**
 * ローディング状態
 * 送信中のフォーム（全フィールドと保存ボタンが無効化）
 */
export const Submitting: Story = {
  args: {
    defaultValues: {
      title: "保存中のイベント",
      startAt: new Date(2025, 11, 15, 14, 0),
      endAt: new Date(2025, 11, 15, 15, 0),
      description: "保存処理中...",
      isAllDay: false,
      color: "#F59E0B",
      location: "オフィス",
    },
    onSubmit: fn(),
    onCancel: fn(),
    isSubmitting: true,
  },
};

/**
 * カラーバリエーション
 * 異なる色が設定されたフォーム
 */
export const CustomColor: Story = {
  args: {
    defaultValues: {
      title: "重要なミーティング",
      startAt: new Date(2025, 11, 20, 9, 0),
      endAt: new Date(2025, 11, 20, 10, 30),
      description: "四半期レビュー会議",
      isAllDay: false,
      color: "#EF4444",
      location: "本社ビル 5F",
    },
    onSubmit: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
};

/**
 * 最小入力状態
 * タイトルのみが入力された状態
 */
export const MinimalInput: Story = {
  args: {
    defaultValues: {
      title: "簡単な予定",
    },
    onSubmit: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
};

/**
 * 長いテキスト
 * 長いタイトルと説明が設定されたフォーム
 */
export const LongText: Story = {
  args: {
    defaultValues: {
      title:
        "これは非常に長いタイトルのイベントです。表示がどのように処理されるかを確認するためのテストです。",
      startAt: new Date(2025, 11, 10, 10, 0),
      endAt: new Date(2025, 11, 10, 12, 0),
      description:
        "これは長い説明文のテストです。複数行にわたる説明文がどのように表示されるかを確認します。イベントの詳細情報として、参加者への注意事項や持ち物リスト、アジェンダなどを記載することができます。この説明文は実際のユースケースを想定した長さになっています。",
      isAllDay: false,
      color: "#8B5CF6",
      location: "東京都渋谷区神南1-1-1 渋谷ビル 10階 大会議室",
    },
    onSubmit: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
};

/**
 * 通知設定付き
 * 複数の通知タイミングが設定された編集モードのフォーム
 */
export const WithNotifications: Story = {
  args: {
    defaultValues: {
      title: "週次ミーティング",
      startAt: new Date(2025, 11, 10, 10, 0),
      endAt: new Date(2025, 11, 10, 11, 0),
      description: "チーム定例会議",
      isAllDay: false,
      color: "#3B82F6",
      location: "会議室B",
      notifications: [
        { key: "n1", num: 10, unit: "minutes" },
        { key: "n2", num: 1, unit: "hours" },
        { key: "n3", num: 1, unit: "days" },
      ],
    },
    onSubmit: fn(),
    onCancel: fn(),
    isSubmitting: false,
  },
};
