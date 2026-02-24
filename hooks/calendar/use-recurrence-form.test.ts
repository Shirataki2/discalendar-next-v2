/**
 * useRecurrenceFormのユニットテスト
 *
 * タスク5.1: 繰り返し設定のフォーム状態管理フックのテスト
 * - フォーム状態（isRecurring, frequency, interval, byDay, monthlyMode, endCondition）の管理
 * - バリデーション（interval>=1, count>=1, until>=dtstart, weeklyでbyDay>=1）
 * - RRULE文字列生成
 * - useEventFormとの並行使用
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.5, 3.6
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRecurrenceForm } from "./use-recurrence-form";

describe("useRecurrenceForm", () => {
  describe("初期状態", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      expect(result.current.values.isRecurring).toBe(false);
      expect(result.current.values.frequency).toBe("weekly");
      expect(result.current.values.interval).toBe(1);
      expect(result.current.values.byDay).toEqual([]);
      expect(result.current.values.monthlyMode).toEqual({
        type: "dayOfMonth",
        day: 1,
      });
      expect(result.current.values.endCondition).toEqual({ type: "never" });
    });

    it("should initialize with provided initial values", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "daily",
          interval: 2,
          endCondition: { type: "count", count: 10 },
        }),
      );

      expect(result.current.values.isRecurring).toBe(true);
      expect(result.current.values.frequency).toBe("daily");
      expect(result.current.values.interval).toBe(2);
      expect(result.current.values.endCondition).toEqual({
        type: "count",
        count: 10,
      });
    });

    it("should initialize with no errors", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      expect(result.current.errors).toEqual({});
    });

    it("should initialize with all fields not touched", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      expect(result.current.touched.interval).toBeFalsy();
      expect(result.current.touched.byDay).toBeFalsy();
      expect(result.current.touched.count).toBeFalsy();
      expect(result.current.touched.until).toBeFalsy();
    });

    it("should initialize with isValid as true", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      expect(result.current.isValid).toBe(true);
    });
  });

  describe("handleChange - フィールド変更 (Req 1.1, 2.1, 2.2, 2.3)", () => {
    it("should update isRecurring", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      act(() => {
        result.current.handleChange("isRecurring", true);
      });

      expect(result.current.values.isRecurring).toBe(true);
    });

    it("should update frequency", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      act(() => {
        result.current.handleChange("frequency", "daily");
      });

      expect(result.current.values.frequency).toBe("daily");
    });

    it("should update interval", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      act(() => {
        result.current.handleChange("interval", 3);
      });

      expect(result.current.values.interval).toBe(3);
    });

    it("should update byDay", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      act(() => {
        result.current.handleChange("byDay", ["MO", "WE", "FR"]);
      });

      expect(result.current.values.byDay).toEqual(["MO", "WE", "FR"]);
    });

    it("should update monthlyMode", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      act(() => {
        result.current.handleChange("monthlyMode", {
          type: "nthWeekday",
          n: 2,
          weekday: "WE",
        });
      });

      expect(result.current.values.monthlyMode).toEqual({
        type: "nthWeekday",
        n: 2,
        weekday: "WE",
      });
    });

    it("should update endCondition to count", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      act(() => {
        result.current.handleChange("endCondition", {
          type: "count",
          count: 5,
        });
      });

      expect(result.current.values.endCondition).toEqual({
        type: "count",
        count: 5,
      });
    });

    it("should update endCondition to until", () => {
      const { result } = renderHook(() => useRecurrenceForm());
      const untilDate = new Date("2026-12-31T00:00:00Z");

      act(() => {
        result.current.handleChange("endCondition", {
          type: "until",
          until: untilDate,
        });
      });

      expect(result.current.values.endCondition).toEqual({
        type: "until",
        until: untilDate,
      });
    });
  });

  describe("handleBlur - フィールドフォーカスアウト", () => {
    it("should mark field as touched on blur", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      act(() => {
        result.current.handleBlur("interval");
      });

      expect(result.current.touched.interval).toBe(true);
    });

    it("should trigger validation on blur", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({ isRecurring: true, interval: 0 }),
      );

      act(() => {
        result.current.handleBlur("interval");
      });

      expect(result.current.errors.interval).toBeDefined();
    });
  });

  describe("intervalバリデーション (Req 3.5)", () => {
    it("should show error when interval is 0", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({ isRecurring: true, interval: 0 }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.interval).toBe(
        "間隔は1以上を指定してください",
      );
    });

    it("should show error when interval is negative", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({ isRecurring: true, interval: -1 }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.interval).toBe(
        "間隔は1以上を指定してください",
      );
    });

    it("should not show error when interval is 1", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({ isRecurring: true, interval: 1 }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.interval).toBeUndefined();
    });

    it("should not show error when interval is greater than 1", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({ isRecurring: true, interval: 5 }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.interval).toBeUndefined();
    });
  });

  describe("countバリデーション (Req 3.5)", () => {
    it("should show error when count is 0", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          endCondition: { type: "count", count: 0 },
        }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.count).toBe(
        "回数は1以上を指定してください",
      );
    });

    it("should show error when count is negative", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          endCondition: { type: "count", count: -5 },
        }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.count).toBe(
        "回数は1以上を指定してください",
      );
    });

    it("should not show error when count is 1", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          endCondition: { type: "count", count: 1 },
        }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.count).toBeUndefined();
    });

    it("should not validate count when endCondition is not count", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          endCondition: { type: "never" },
        }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.count).toBeUndefined();
    });
  });

  describe("untilバリデーション (Req 3.6)", () => {
    it("should show error when until is before dtstart", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          endCondition: {
            type: "until",
            until: new Date("2026-01-01T00:00:00Z"),
          },
        }),
      );

      // dtstart が until より後の場合
      act(() => {
        result.current.validate(new Date("2026-06-01T00:00:00Z"));
      });

      expect(result.current.errors.until).toBe(
        "終了日はイベント開始日以降を指定してください",
      );
    });

    it("should not show error when until equals dtstart", () => {
      const date = new Date("2026-06-01T00:00:00Z");
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          endCondition: { type: "until", until: date },
        }),
      );

      act(() => {
        result.current.validate(date);
      });

      expect(result.current.errors.until).toBeUndefined();
    });

    it("should not show error when until is after dtstart", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          endCondition: {
            type: "until",
            until: new Date("2026-12-31T00:00:00Z"),
          },
        }),
      );

      act(() => {
        result.current.validate(new Date("2026-01-01T00:00:00Z"));
      });

      expect(result.current.errors.until).toBeUndefined();
    });

    it("should not validate until when endCondition is not until", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          endCondition: { type: "never" },
        }),
      );

      act(() => {
        result.current.validate(new Date("2026-01-01T00:00:00Z"));
      });

      expect(result.current.errors.until).toBeUndefined();
    });
  });

  describe("byDayバリデーション (週次の曜日選択)", () => {
    it("should show error when weekly frequency has no days selected", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "weekly",
          byDay: [],
        }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.byDay).toBe(
        "曜日を1つ以上選択してください",
      );
    });

    it("should not show error when weekly frequency has days selected", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "weekly",
          byDay: ["MO"],
        }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.byDay).toBeUndefined();
    });

    it("should not validate byDay for non-weekly frequency", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "daily",
          byDay: [],
        }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.byDay).toBeUndefined();
    });
  });

  describe("isRecurring=falseの場合のバリデーション", () => {
    it("should skip all validation when isRecurring is false", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: false,
          interval: 0,
          frequency: "weekly",
          byDay: [],
          endCondition: { type: "count", count: 0 },
        }),
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
    });
  });

  describe("validate - フォーム全体バリデーション", () => {
    it("should return true when form is valid", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "daily",
          interval: 1,
          endCondition: { type: "never" },
        }),
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it("should return false when form has errors", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "weekly",
          interval: 0,
          byDay: [],
          endCondition: { type: "count", count: 0 },
        }),
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.interval).toBeDefined();
      expect(result.current.errors.byDay).toBeDefined();
      expect(result.current.errors.count).toBeDefined();
    });

    it("should mark all fields as touched after validation", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({ isRecurring: true }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.touched.interval).toBe(true);
      expect(result.current.touched.byDay).toBe(true);
      expect(result.current.touched.count).toBe(true);
      expect(result.current.touched.until).toBe(true);
    });
  });

  describe("reset - フォームリセット", () => {
    it("should reset to default values", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "daily",
          interval: 3,
        }),
      );

      act(() => {
        result.current.reset();
      });

      expect(result.current.values.isRecurring).toBe(false);
      expect(result.current.values.frequency).toBe("weekly");
      expect(result.current.values.interval).toBe(1);
      expect(result.current.values.byDay).toEqual([]);
      expect(result.current.values.endCondition).toEqual({ type: "never" });
    });

    it("should reset to provided values", () => {
      const { result } = renderHook(() => useRecurrenceForm());

      act(() => {
        result.current.reset({
          isRecurring: true,
          frequency: "monthly",
          interval: 2,
        });
      });

      expect(result.current.values.isRecurring).toBe(true);
      expect(result.current.values.frequency).toBe("monthly");
      expect(result.current.values.interval).toBe(2);
    });

    it("should clear errors and touched state", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({ isRecurring: true, interval: 0 }),
      );

      act(() => {
        result.current.validate();
      });
      expect(result.current.errors.interval).toBeDefined();
      expect(result.current.touched.interval).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.touched.interval).toBeFalsy();
    });
  });

  describe("toRruleString - RRULE文字列生成 (Req 1.2)", () => {
    it("should generate daily RRULE", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "daily",
          interval: 1,
          endCondition: { type: "never" },
        }),
      );

      const rrule = result.current.toRruleString(
        new Date("2026-01-01T10:00:00Z"),
      );

      expect(rrule).toContain("FREQ=DAILY");
      expect(rrule).toContain("INTERVAL=1");
    });

    it("should generate weekly RRULE with byDay", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "weekly",
          interval: 1,
          byDay: ["TU", "TH"],
          endCondition: { type: "never" },
        }),
      );

      const rrule = result.current.toRruleString(
        new Date("2026-01-01T10:00:00Z"),
      );

      expect(rrule).toContain("FREQ=WEEKLY");
      expect(rrule).toContain("BYDAY=TU,TH");
    });

    it("should generate monthly RRULE with dayOfMonth", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "monthly",
          interval: 1,
          monthlyMode: { type: "dayOfMonth", day: 15 },
          endCondition: { type: "never" },
        }),
      );

      const rrule = result.current.toRruleString(
        new Date("2026-01-15T10:00:00Z"),
      );

      expect(rrule).toContain("FREQ=MONTHLY");
      expect(rrule).toContain("BYMONTHDAY=15");
    });

    it("should generate monthly RRULE with nthWeekday", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "monthly",
          interval: 1,
          monthlyMode: { type: "nthWeekday", n: 2, weekday: "WE" },
          endCondition: { type: "never" },
        }),
      );

      const rrule = result.current.toRruleString(
        new Date("2026-01-14T10:00:00Z"),
      );

      expect(rrule).toContain("FREQ=MONTHLY");
      expect(rrule).toContain("BYDAY=+2WE");
    });

    it("should generate RRULE with count", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "daily",
          interval: 1,
          endCondition: { type: "count", count: 10 },
        }),
      );

      const rrule = result.current.toRruleString(
        new Date("2026-01-01T10:00:00Z"),
      );

      expect(rrule).toContain("COUNT=10");
    });

    it("should generate RRULE with until", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "daily",
          interval: 1,
          endCondition: {
            type: "until",
            until: new Date("2026-12-31T00:00:00Z"),
          },
        }),
      );

      const rrule = result.current.toRruleString(
        new Date("2026-01-01T10:00:00Z"),
      );

      expect(rrule).toContain("UNTIL=");
    });

    it("should generate RRULE with interval > 1", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "weekly",
          interval: 2,
          byDay: ["MO"],
          endCondition: { type: "never" },
        }),
      );

      const rrule = result.current.toRruleString(
        new Date("2026-01-01T10:00:00Z"),
      );

      expect(rrule).toContain("INTERVAL=2");
    });

    it("should generate yearly RRULE", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "yearly",
          interval: 1,
          endCondition: { type: "never" },
        }),
      );

      const rrule = result.current.toRruleString(
        new Date("2026-01-01T10:00:00Z"),
      );

      expect(rrule).toContain("FREQ=YEARLY");
    });
  });

  describe("リアルタイムバリデーション", () => {
    it("should re-validate touched field on change", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({ isRecurring: true, interval: 0 }),
      );

      // フィールドをタッチしてエラーを発生させる
      act(() => {
        result.current.handleBlur("interval");
      });
      expect(result.current.errors.interval).toBeDefined();

      // 有効な値に変更するとエラーがクリアされる
      act(() => {
        result.current.handleChange("interval", 2);
      });
      expect(result.current.errors.interval).toBeUndefined();
    });

    it("should not validate untouched field on change", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({ isRecurring: true }),
      );

      act(() => {
        result.current.handleChange("interval", 0);
      });

      expect(result.current.errors.interval).toBeUndefined();
    });
  });

  describe("isValid プロパティ", () => {
    it("should be true when no errors exist", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          frequency: "daily",
          interval: 1,
          endCondition: { type: "never" },
        }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValid).toBe(true);
    });

    it("should be false when errors exist", () => {
      const { result } = renderHook(() =>
        useRecurrenceForm({
          isRecurring: true,
          interval: 0,
        }),
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValid).toBe(false);
    });
  });
});
