/**
 * ConfirmDialog Stories
 *
 * タスク5.3: 削除確認ダイアログコンポーネントを作成する
 * - デフォルト状態のストーリーを定義
 * - ローディング状態のストーリーを定義
 * - 長いイベント名のストーリーを定義
 *
 * Requirements: 4.1, 4.4
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { ConfirmDialog } from "./confirm-dialog";

const meta: Meta<typeof ConfirmDialog> = {
  title: "Calendar/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    open: {
      control: "boolean",
      description: "ダイアログの開閉状態",
    },
    eventTitle: {
      control: "text",
      description: "削除対象のイベントタイトル",
    },
    isLoading: {
      control: "boolean",
      description: "削除処理中かどうか",
    },
    onOpenChange: {
      action: "onOpenChange",
      description: "ダイアログの開閉状態変更コールバック",
    },
    onConfirm: {
      action: "onConfirm",
      description: "削除確認時のコールバック",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト状態
 * 標準的な削除確認ダイアログ
 */
export const Default: Story = {
  args: {
    open: true,
    eventTitle: "チームミーティング",
    isLoading: false,
    onOpenChange: fn(),
    onConfirm: fn(),
  },
};

/**
 * ローディング状態
 * 削除処理中の状態
 */
export const Loading: Story = {
  args: {
    open: true,
    eventTitle: "チームミーティング",
    isLoading: true,
    onOpenChange: fn(),
    onConfirm: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "削除処理中の状態。確認ボタンとキャンセルボタンが無効化されます。",
      },
    },
  },
};

/**
 * 長いイベント名
 * 長いタイトルの予定の削除確認
 */
export const LongEventTitle: Story = {
  args: {
    open: true,
    eventTitle:
      "非常に長いイベントタイトル: 2025年度第4四半期全社定例会議 - 業績報告および次年度戦略説明会",
    isLoading: false,
    onOpenChange: fn(),
    onConfirm: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: "長いイベント名が適切に表示されるかを確認するためのストーリー。",
      },
    },
  },
};

/**
 * 短いイベント名
 * 短いタイトルの予定の削除確認
 */
export const ShortEventTitle: Story = {
  args: {
    open: true,
    eventTitle: "会議",
    isLoading: false,
    onOpenChange: fn(),
    onConfirm: fn(),
  },
};

/**
 * 閉じた状態
 * open=falseの状態（ダイアログは表示されない）
 */
export const Closed: Story = {
  args: {
    open: false,
    eventTitle: "チームミーティング",
    isLoading: false,
    onOpenChange: fn(),
    onConfirm: fn(),
  },
};
