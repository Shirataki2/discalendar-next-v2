/**
 * SearchInput Stories
 *
 * タスク2.1: SearchInputコンポーネントのStorybookストーリー
 * - Default: デスクトップ、空、matchCount=null
 * - WithQuery: デスクトップ、検索クエリあり、matchCount=3
 * - Mobile: モバイル折りたたみ状態
 * - MobileExpanded: モバイル展開状態（playでトグルクリック）
 * - NoResults: デスクトップ、検索結果0件
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, within } from "storybook/test";
import { SearchInput } from "./search-input";

const meta: Meta<typeof SearchInput> = {
  title: "Calendar/SearchInput",
  component: SearchInput,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    value: {
      control: "text",
      description: "現在の検索クエリ",
    },
    onChange: {
      action: "onChange",
      description: "検索クエリ変更ハンドラー",
    },
    isMobile: {
      control: "boolean",
      description: "モバイル表示かどうか",
    },
    matchCount: {
      control: "number",
      description: "一致件数（nullで非表示）",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト状態
 * デスクトップ表示、空の入力フィールド
 */
export const Default: Story = {
  args: {
    value: "",
    onChange: fn(),
    isMobile: false,
    matchCount: null,
  },
};

/**
 * 検索クエリあり
 * デスクトップ表示、検索クエリ入力済みで一致件数3件
 */
export const WithQuery: Story = {
  args: {
    value: "ミーティング",
    onChange: fn(),
    isMobile: false,
    matchCount: 3,
  },
};

/**
 * モバイル折りたたみ状態
 * アイコンボタンのみ表示
 */
export const Mobile: Story = {
  args: {
    value: "",
    onChange: fn(),
    isMobile: true,
    matchCount: null,
  },
};

/**
 * モバイル展開状態
 * トグルボタンクリックで全幅入力フィールドに展開
 */
export const MobileExpanded: Story = {
  args: {
    value: "",
    onChange: fn(),
    isMobile: true,
    matchCount: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggleButton = canvas.getByTestId("search-toggle-button");
    await userEvent.click(toggleButton);
  },
};

/**
 * 検索結果なし
 * デスクトップ表示、検索クエリ入力済みだが一致件数0件
 */
export const NoResults: Story = {
  args: {
    value: "存在しない",
    onChange: fn(),
    isMobile: false,
    matchCount: 0,
  },
};
