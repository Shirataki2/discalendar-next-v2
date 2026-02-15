/**
 * NotificationField Stories
 *
 * タスク2.2: Storybook ストーリーの作成
 * - 通知なしの初期状態
 * - 複数通知が設定済みの状態
 * - 10件上限に達した状態
 * - CSF3 形式、autodocs タグ設定
 *
 * Requirements: 1.1, 1.3, 1.5
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import type { NotificationSetting } from "@/lib/calendar/types";
import { NotificationField } from "./notification-field";

function createNotification(
  num: number,
  unit: NotificationSetting["unit"],
  key = `key-${num}-${unit}`
): NotificationSetting {
  return { key, num, unit };
}

const meta: Meta<typeof NotificationField> = {
  title: "Calendar/NotificationField",
  component: NotificationField,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    notifications: {
      control: "object",
      description: "設定済みの通知リスト",
    },
    maxNotifications: {
      control: "number",
      description: "通知の最大件数",
    },
    error: {
      control: "text",
      description: "外部エラーメッセージ",
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
 * 通知なしの初期状態 (Req 1.1)
 */
export const Default: Story = {
  args: {
    notifications: [],
    onAdd: fn(),
    onRemove: fn(),
  },
};

/**
 * 通知設定済み
 * 複数の通知タイミングがチップとして表示される状態 (Req 1.3)
 */
export const WithNotifications: Story = {
  args: {
    notifications: [
      createNotification(10, "minutes"),
      createNotification(1, "hours"),
      createNotification(1, "days"),
    ],
    onAdd: fn(),
    onRemove: fn(),
  },
};

/**
 * 上限到達
 * 10件の通知が設定済みで追加が無効化された状態 (Req 1.5)
 */
export const MaxNotifications: Story = {
  args: {
    notifications: [
      createNotification(5, "minutes"),
      createNotification(10, "minutes"),
      createNotification(15, "minutes"),
      createNotification(30, "minutes"),
      createNotification(1, "hours"),
      createNotification(2, "hours"),
      createNotification(6, "hours"),
      createNotification(1, "days"),
      createNotification(3, "days"),
      createNotification(1, "weeks"),
    ],
    onAdd: fn(),
    onRemove: fn(),
  },
};

/**
 * エラー表示
 * 外部エラーメッセージが表示された状態
 */
export const WithError: Story = {
  args: {
    notifications: [createNotification(1, "hours")],
    onAdd: fn(),
    onRemove: fn(),
    error: "通知設定の保存に失敗しました",
  },
};
