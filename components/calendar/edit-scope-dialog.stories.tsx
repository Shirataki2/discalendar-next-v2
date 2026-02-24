/**
 * EditScopeDialog Stories
 *
 * タスク6.1: 編集スコープ選択ダイアログを実装する
 * - 編集モード・削除モードのストーリーを定義
 * - ローディング状態のストーリーを定義
 * - 長いイベント名のストーリーを定義
 *
 * Requirements: 5.1, 5.3, 6.4
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { EditScopeDialog } from "./edit-scope-dialog";

const meta: Meta<typeof EditScopeDialog> = {
  title: "Calendar/EditScopeDialog",
  component: EditScopeDialog,
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
      options: ["edit", "delete"],
      description: "操作モード（編集 / 削除）",
    },
    eventTitle: {
      control: "text",
      description: "対象イベントのタイトル",
    },
    isLoading: {
      control: "boolean",
      description: "処理中かどうか",
    },
    onOpenChange: {
      action: "onOpenChange",
      description: "ダイアログの開閉状態変更コールバック",
    },
    onSelect: {
      action: "onSelect",
      description: "スコープ選択時のコールバック",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 編集モード（デフォルト）
 * 繰り返しイベントの編集時に表示されるスコープ選択ダイアログ
 */
export const Edit: Story = {
  args: {
    open: true,
    mode: "edit",
    eventTitle: "チームミーティング",
    isLoading: false,
    onOpenChange: fn(),
    onSelect: fn(),
  },
};

/**
 * 削除モード
 * 繰り返しイベントの削除時に表示されるスコープ選択ダイアログ。
 * 確認メッセージが追加で表示される。
 */
export const Delete: Story = {
  args: {
    open: true,
    mode: "delete",
    eventTitle: "チームミーティング",
    isLoading: false,
    onOpenChange: fn(),
    onSelect: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "削除モードでは確認メッセージが表示され、例外リセットチェックボックスは非表示になります。",
      },
    },
  },
};

/**
 * ローディング状態
 * スコープ選択後の処理中状態
 */
export const Loading: Story = {
  args: {
    open: true,
    mode: "edit",
    eventTitle: "チームミーティング",
    isLoading: true,
    onOpenChange: fn(),
    onSelect: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "処理中の状態。すべてのボタンとチェックボックスが無効化されます。",
      },
    },
  },
};

/**
 * 長いイベント名
 * 長いタイトルの予定のスコープ選択
 */
export const LongEventTitle: Story = {
  args: {
    open: true,
    mode: "edit",
    eventTitle:
      "非常に長いイベントタイトル: 2025年度第4四半期全社定例会議 - 業績報告および次年度戦略説明会",
    isLoading: false,
    onOpenChange: fn(),
    onSelect: fn(),
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
 * 閉じた状態
 * open=falseの状態（ダイアログは表示されない）
 */
export const Closed: Story = {
  args: {
    open: false,
    mode: "edit",
    eventTitle: "チームミーティング",
    isLoading: false,
    onOpenChange: fn(),
    onSelect: fn(),
  },
};
