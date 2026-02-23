/**
 * RecurrenceSettingsControl - テスト
 *
 * タスク5.2: 繰り返し設定入力コンポーネントを実装する
 * - 繰り返しの有効/無効トグル
 * - 頻度選択（毎日・毎週・毎月・毎年）
 * - 曜日複数選択（毎週時）
 * - 月次モード選択（毎月時）
 * - 間隔入力
 * - 終了条件選択（無期限・回数・日付）
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 3.1
 * Contracts: RecurrenceSettingsControl
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UseRecurrenceFormReturn } from "@/hooks/calendar/use-recurrence-form";
import { RecurrenceSettingsControl } from "./recurrence-settings-control";

// トップレベル正規表現定数
const RECURRENCE_PATTERN = /繰り返し/i;
const FREQUENCY_PATTERN = /頻度/i;
const INTERVAL_PATTERN = /間隔/i;
const COUNT_PATTERN = /回数/i;
const UNTIL_PATTERN = /終了日/i;
const END_CONDITION_PATTERN = /終了条件/i;
const DAY_OF_MONTH_PATTERN = /日付指定/i;
const NTH_WEEKDAY_PATTERN = /曜日指定/i;
const DAY_INPUT_PATTERN = /日$/;
const NTH_WEEK_PATTERN = /第.*週/i;
const WEEKDAY_SELECT_PATTERN = /曜日$/i;
const MON_BUTTON_PATTERN = /^月$/;
const TUE_BUTTON_PATTERN = /^火$/;
const WED_BUTTON_PATTERN = /^水$/;

// 曜日ラベル
const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

/**
 * テスト用のモックフォームを作成する
 */
function createMockForm(
  overrides: Partial<UseRecurrenceFormReturn> = {}
): UseRecurrenceFormReturn {
  return {
    values: {
      isRecurring: false,
      frequency: "weekly",
      interval: 1,
      byDay: [],
      monthlyMode: { type: "dayOfMonth", day: 1 },
      endCondition: { type: "never" },
    },
    errors: {},
    touched: {},
    isValid: true,
    handleChange: vi.fn(),
    handleBlur: vi.fn(),
    validate: vi.fn().mockReturnValue(true),
    reset: vi.fn(),
    toRruleString: vi.fn().mockReturnValue("RRULE:FREQ=WEEKLY"),
    ...overrides,
  };
}

describe("RecurrenceSettingsControl", () => {
  // 基本レンダリング
  describe("基本レンダリング", () => {
    it("繰り返しの有効/無効を切り替えるスイッチが表示される (Req 1.1)", () => {
      const form = createMockForm();
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByRole("switch", { name: RECURRENCE_PATTERN })
      ).toBeInTheDocument();
    });

    it("繰り返しが無効の場合、設定項目が表示されない (Req 1.1)", () => {
      const form = createMockForm();
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.queryByRole("combobox", { name: FREQUENCY_PATTERN })
      ).toBeNull();
    });

    it("繰り返しが有効の場合、設定項目が表示される (Req 1.1)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: [],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByRole("combobox", { name: FREQUENCY_PATTERN })
      ).toBeInTheDocument();
    });
  });

  // トグル操作
  describe("トグル操作", () => {
    it("スイッチをクリックするとhandleChangeが呼ばれる (Req 1.1)", async () => {
      const user = userEvent.setup();
      const form = createMockForm();
      render(<RecurrenceSettingsControl form={form} />);

      const toggle = screen.getByRole("switch", { name: RECURRENCE_PATTERN });
      await user.click(toggle);

      expect(form.handleChange).toHaveBeenCalledWith("isRecurring", true);
    });
  });

  // 頻度選択
  describe("頻度選択", () => {
    it("頻度選択のドロップダウンが表示される (Req 1.1)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "daily",
          interval: 1,
          byDay: [],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      const select = screen.getByRole("combobox", { name: FREQUENCY_PATTERN });
      expect(select).toBeInTheDocument();
    });
  });

  // 曜日選択（毎週）
  describe("曜日選択（毎週）", () => {
    it("毎週選択時に曜日ボタンが表示される (Req 2.1)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: [],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      for (const label of WEEKDAY_LABELS) {
        expect(
          screen.getByRole("button", { name: new RegExp(`^${label}$`) })
        ).toBeInTheDocument();
      }
    });

    it("毎日選択時に曜日ボタンが表示されない", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "daily",
          interval: 1,
          byDay: [],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.queryByRole("button", { name: MON_BUTTON_PATTERN })
      ).toBeNull();
    });

    it("選択中の曜日ボタンが視覚的に区別される (Req 2.1)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["MO", "WE"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      const monButton = screen.getByRole("button", {
        name: MON_BUTTON_PATTERN,
      });
      expect(monButton).toHaveAttribute("aria-pressed", "true");

      const tueButton = screen.getByRole("button", {
        name: TUE_BUTTON_PATTERN,
      });
      expect(tueButton).toHaveAttribute("aria-pressed", "false");
    });

    it("曜日ボタンをクリックするとhandleChangeが呼ばれる (Req 2.1)", async () => {
      const user = userEvent.setup();
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["MO"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      const wedButton = screen.getByRole("button", {
        name: WED_BUTTON_PATTERN,
      });
      await user.click(wedButton);

      expect(form.handleChange).toHaveBeenCalledWith("byDay", ["MO", "WE"]);
    });

    it("選択済みの曜日をクリックすると解除される (Req 2.1)", async () => {
      const user = userEvent.setup();
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["MO", "WE"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      const monButton = screen.getByRole("button", {
        name: MON_BUTTON_PATTERN,
      });
      await user.click(monButton);

      expect(form.handleChange).toHaveBeenCalledWith("byDay", ["WE"]);
    });

    it("曜日バリデーションエラーが表示される", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: [],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
        errors: { byDay: "曜日を1つ以上選択してください" },
        touched: { byDay: true },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByText("曜日を1つ以上選択してください")
      ).toBeInTheDocument();
    });
  });

  // 月次モード選択（毎月）
  describe("月次モード選択（毎月）", () => {
    it("毎月選択時に月次モード選択が表示される (Req 2.2)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "monthly",
          interval: 1,
          byDay: [],
          monthlyMode: { type: "dayOfMonth", day: 15 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByRole("radio", { name: DAY_OF_MONTH_PATTERN })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: NTH_WEEKDAY_PATTERN })
      ).toBeInTheDocument();
    });

    it("毎週選択時に月次モード選択が表示されない", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: [],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.queryByRole("radio", { name: DAY_OF_MONTH_PATTERN })
      ).toBeNull();
    });

    it("日付指定モードでは日数入力が表示される (Req 2.2)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "monthly",
          interval: 1,
          byDay: [],
          monthlyMode: { type: "dayOfMonth", day: 15 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByRole("spinbutton", { name: DAY_INPUT_PATTERN })
      ).toBeInTheDocument();
    });

    it("曜日指定モードではn番目と曜日の選択が表示される (Req 2.2)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "monthly",
          interval: 1,
          byDay: [],
          monthlyMode: { type: "nthWeekday", n: 2, weekday: "WE" },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByRole("combobox", { name: NTH_WEEK_PATTERN })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("combobox", { name: WEEKDAY_SELECT_PATTERN })
      ).toBeInTheDocument();
    });
  });

  // 間隔入力
  describe("間隔入力", () => {
    it("間隔入力フィールドが表示される (Req 2.3)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 2,
          byDay: ["MO"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      const input = screen.getByRole("spinbutton", { name: INTERVAL_PATTERN });
      expect(input).toHaveValue(2);
    });

    it("間隔を変更するとhandleChangeが呼ばれる (Req 2.3)", async () => {
      const user = userEvent.setup();
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["MO"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      const input = screen.getByRole("spinbutton", { name: INTERVAL_PATTERN });
      await user.clear(input);

      expect(form.handleChange).toHaveBeenCalledWith(
        "interval",
        expect.any(Number)
      );
    });

    it("間隔バリデーションエラーが表示される", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 0,
          byDay: ["MO"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
        errors: { interval: "間隔は1以上を指定してください" },
        touched: { interval: true },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByText("間隔は1以上を指定してください")
      ).toBeInTheDocument();
    });
  });

  // 終了条件
  describe("終了条件", () => {
    it("終了条件の選択UIが表示される (Req 3.1)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["MO"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByRole("combobox", { name: END_CONDITION_PATTERN })
      ).toBeInTheDocument();
    });

    it("回数指定選択時に回数入力が表示される (Req 3.1)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["MO"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "count", count: 10 },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      const input = screen.getByRole("spinbutton", { name: COUNT_PATTERN });
      expect(input).toHaveValue(10);
    });

    it("日付指定選択時に日付ピッカーが表示される (Req 3.1)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["MO"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "until", until: new Date("2026-12-31") },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByRole("button", { name: UNTIL_PATTERN })
      ).toBeInTheDocument();
    });

    it("無期限選択時に追加入力が表示されない (Req 3.1)", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["MO"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "never" },
        },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.queryByRole("spinbutton", { name: COUNT_PATTERN })
      ).toBeNull();
      expect(screen.queryByRole("button", { name: UNTIL_PATTERN })).toBeNull();
    });

    it("回数バリデーションエラーが表示される", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["MO"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "count", count: 0 },
        },
        errors: { count: "回数は1以上を指定してください" },
        touched: { count: true },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByText("回数は1以上を指定してください")
      ).toBeInTheDocument();
    });

    it("終了日バリデーションエラーが表示される", () => {
      const form = createMockForm({
        values: {
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["MO"],
          monthlyMode: { type: "dayOfMonth", day: 1 },
          endCondition: { type: "until", until: new Date("2026-01-01") },
        },
        errors: { until: "終了日はイベント開始日以降を指定してください" },
        touched: { until: true },
      });
      render(<RecurrenceSettingsControl form={form} />);

      expect(
        screen.getByText("終了日はイベント開始日以降を指定してください")
      ).toBeInTheDocument();
    });
  });

  // 無効状態
  describe("無効状態", () => {
    it("disabled=trueの場合、スイッチが無効化される", () => {
      const form = createMockForm();
      render(<RecurrenceSettingsControl disabled form={form} />);

      expect(
        screen.getByRole("switch", { name: RECURRENCE_PATTERN })
      ).toBeDisabled();
    });
  });
});
