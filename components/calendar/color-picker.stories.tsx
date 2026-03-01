/**
 * ColorPicker Stories
 *
 * タスク3.2: Storybookストーリーを作成する
 * - Default: デフォルトカラー（Blue）が選択された状態
 * - WithCustomColor: プリセット外の色が設定された状態（カスタム入力自動展開）
 * - CustomInputExpanded: カスタム入力が展開された状態
 * - Disabled: 無効化状態
 * - AllColors: 各プリセットカラーが選択された状態のギャラリー
 *
 * Requirements: 1.1, 1.2, 2.2, 2.3, 3.1
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, within } from "storybook/test";
import { ColorPicker, PRESET_COLORS } from "./color-picker";

const CUSTOM_BUTTON_PATTERN = /カスタム/i;

const meta: Meta<typeof ColorPicker> = {
  title: "Calendar/ColorPicker",
  component: ColorPicker,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    value: {
      control: "color",
      description: "選択中のカラー値（#RRGGBB形式）",
    },
    onChange: {
      action: "onChange",
      description: "色が変更された時のコールバック",
    },
    disabled: {
      control: "boolean",
      description: "無効化状態",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト状態
 * Blue (#3B82F6) が選択された初期状態
 */
export const Default: Story = {
  args: {
    value: "#3B82F6",
    onChange: fn(),
  },
};

/**
 * カスタムカラー
 * プリセット外の色が設定された状態。カスタム入力が自動展開される
 */
export const WithCustomColor: Story = {
  args: {
    value: "#FF00FF",
    onChange: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "プリセットに含まれない色が設定された状態。カスタムHEX入力フィールドが自動的に展開されます。",
      },
    },
  },
};

/**
 * カスタム入力展開
 * プリセットカラーが選択された状態でカスタム入力を手動展開
 */
export const CustomInputExpanded: Story = {
  args: {
    value: "#3B82F6",
    onChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggleButton = canvas.getByRole("button", {
      name: CUSTOM_BUTTON_PATTERN,
    });
    await userEvent.click(toggleButton);
  },
  parameters: {
    docs: {
      description: {
        story:
          "プリセットカラーが選択された状態で、カスタムボタンをクリックしてHEX入力を展開した状態。",
      },
    },
  },
};

/**
 * 無効化状態
 * 全てのインタラクションが無効化された状態
 */
export const Disabled: Story = {
  args: {
    value: "#3B82F6",
    onChange: fn(),
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "disabled propsが設定された状態。スウォッチのクリック、カスタム入力トグルが全て無効化されます。",
      },
    },
  },
};

/**
 * 全カラーギャラリー
 * 各プリセットカラーが選択された状態を並べて表示
 */
export const AllColors: Story = {
  args: {
    value: "#3B82F6",
    onChange: fn(),
  },
  render: (args) => (
    <div className="flex flex-col gap-6">
      {PRESET_COLORS.map((color) => (
        <div className="space-y-1" key={color.value}>
          <p className="font-medium text-sm">
            {color.label} ({color.value})
          </p>
          <ColorPicker {...args} value={color.value} />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "プリセット9色それぞれが選択された状態を一覧表示するギャラリー。チェックマークとリングインジケータの視覚的確認用。",
      },
    },
  },
};
