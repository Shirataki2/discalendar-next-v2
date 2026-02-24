/**
 * RecurrenceSettingsControl Stories
 *
 * タスク5.2: Storybookストーリーの作成
 * - 繰り返し無効の初期状態
 * - 毎週（曜日選択あり）
 * - 毎月（日付指定）
 * - 毎月（曜日指定）
 * - 回数指定の終了条件
 * - 日付指定の終了条件
 * - バリデーションエラー表示
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 3.1
 */

import type { Meta, StoryObj } from "@storybook/react";
import { useRecurrenceForm } from "@/hooks/calendar/use-recurrence-form";
import { RecurrenceSettingsControl } from "./recurrence-settings-control";

function RecurrenceSettingsWrapper(
  props: Parameters<typeof RecurrenceSettingsControl>[0] & {
    initialValues?: Parameters<typeof useRecurrenceForm>[0];
  }
) {
  const form = useRecurrenceForm(props.initialValues);
  return <RecurrenceSettingsControl disabled={props.disabled} form={form} />;
}

const meta: Meta<typeof RecurrenceSettingsWrapper> = {
  title: "Calendar/RecurrenceSettingsControl",
  component: RecurrenceSettingsWrapper,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: "420px", padding: "1rem" }}>
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト状態
 * 繰り返しが無効の初期状態
 */
export const Default: Story = {
  args: {},
};

/**
 * 毎週（曜日選択あり）
 * 毎週火・木の繰り返し設定 (Req 2.1)
 */
export const WeeklyWithDays: Story = {
  args: {
    initialValues: {
      isRecurring: true,
      frequency: "weekly",
      interval: 1,
      byDay: ["TU", "TH"],
    },
  },
};

/**
 * 毎日
 * 毎日の繰り返し設定
 */
export const Daily: Story = {
  args: {
    initialValues: {
      isRecurring: true,
      frequency: "daily",
      interval: 1,
    },
  },
};

/**
 * 2週間ごと
 * 間隔指定の例 (Req 2.3)
 */
export const BiWeekly: Story = {
  args: {
    initialValues: {
      isRecurring: true,
      frequency: "weekly",
      interval: 2,
      byDay: ["MO"],
    },
  },
};

/**
 * 毎月（日付指定）
 * 毎月15日の繰り返し設定 (Req 2.2)
 */
export const MonthlyByDate: Story = {
  args: {
    initialValues: {
      isRecurring: true,
      frequency: "monthly",
      interval: 1,
      monthlyMode: { type: "dayOfMonth", day: 15 },
    },
  },
};

/**
 * 毎月（曜日指定）
 * 毎月第2水曜日の繰り返し設定 (Req 2.2)
 */
export const MonthlyByWeekday: Story = {
  args: {
    initialValues: {
      isRecurring: true,
      frequency: "monthly",
      interval: 1,
      monthlyMode: { type: "nthWeekday", n: 2, weekday: "WE" },
    },
  },
};

/**
 * 毎年
 * 毎年の繰り返し設定
 */
export const Yearly: Story = {
  args: {
    initialValues: {
      isRecurring: true,
      frequency: "yearly",
      interval: 1,
    },
  },
};

/**
 * 回数指定の終了条件
 * 10回で終了する設定 (Req 3.1)
 */
export const WithCountEnd: Story = {
  args: {
    initialValues: {
      isRecurring: true,
      frequency: "weekly",
      interval: 1,
      byDay: ["MO"],
      endCondition: { type: "count", count: 10 },
    },
  },
};

/**
 * 日付指定の終了条件
 * 2026年末で終了する設定 (Req 3.1)
 */
export const WithUntilEnd: Story = {
  args: {
    initialValues: {
      isRecurring: true,
      frequency: "weekly",
      interval: 1,
      byDay: ["MO"],
      endCondition: { type: "until", until: new Date("2026-12-31") },
    },
  },
};

/**
 * 無効状態
 * すべてのコントロールが無効化された状態
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    initialValues: {
      isRecurring: true,
      frequency: "weekly",
      interval: 1,
      byDay: ["MO", "WE", "FR"],
    },
  },
};
