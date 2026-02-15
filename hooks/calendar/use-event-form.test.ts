/**
 * useEventFormのユニットテスト
 *
 * タスク9.1: useEventFormのユニットテストを作成する
 * - バリデーションロジックの正常系・異常系をテストする
 * - 状態遷移（入力、エラー、リセット）をテストする
 * - 初期値設定とフィールド変更をテストする
 *
 * Requirements: 1.6, 3.5
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NotificationSetting } from "@/lib/calendar/types";
import { useEventForm } from "./use-event-form";

describe("useEventForm", () => {
  describe("初期状態", () => {
    it("should initialize with default values when no initial values provided", () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.values.title).toBe("");
      expect(result.current.values.description).toBe("");
      expect(result.current.values.isAllDay).toBe(false);
      expect(result.current.values.color).toBe("#3B82F6");
      expect(result.current.values.location).toBe("");
      expect(result.current.values.startAt).toBeInstanceOf(Date);
      expect(result.current.values.endAt).toBeInstanceOf(Date);
    });

    it("should initialize with provided initial values", () => {
      const initialValues = {
        title: "初期タイトル",
        description: "初期説明",
        startAt: new Date("2025-12-15T10:00:00Z"),
        endAt: new Date("2025-12-15T12:00:00Z"),
        isAllDay: true,
        color: "#FF5733",
        location: "東京",
      };

      const { result } = renderHook(() => useEventForm(initialValues));

      expect(result.current.values.title).toBe("初期タイトル");
      expect(result.current.values.description).toBe("初期説明");
      expect(result.current.values.startAt).toEqual(new Date("2025-12-15T10:00:00Z"));
      expect(result.current.values.endAt).toEqual(new Date("2025-12-15T12:00:00Z"));
      expect(result.current.values.isAllDay).toBe(true);
      expect(result.current.values.color).toBe("#FF5733");
      expect(result.current.values.location).toBe("東京");
    });

    it("should initialize with partial initial values", () => {
      const initialValues = {
        title: "部分的な初期値",
      };

      const { result } = renderHook(() => useEventForm(initialValues));

      expect(result.current.values.title).toBe("部分的な初期値");
      expect(result.current.values.description).toBe("");
      expect(result.current.values.isAllDay).toBe(false);
    });

    it("should initialize with no errors", () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.errors).toEqual({});
    });

    it("should initialize with all fields not touched", () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.touched.title).toBe(false);
      expect(result.current.touched.startAt).toBe(false);
      expect(result.current.touched.endAt).toBe(false);
      expect(result.current.touched.description).toBe(false);
    });

    it("should initialize with isValid as true (no errors yet)", () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.isValid).toBe(true);
    });
  });

  describe("handleChange - フィールド変更 (Req 1.6, 3.5)", () => {
    it("should update title field", () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.handleChange("title", "新しいタイトル");
      });

      expect(result.current.values.title).toBe("新しいタイトル");
    });

    it("should update description field", () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.handleChange("description", "新しい説明");
      });

      expect(result.current.values.description).toBe("新しい説明");
    });

    it("should update startAt field with Date object", () => {
      const { result } = renderHook(() => useEventForm());
      const newDate = new Date("2025-12-20T10:00:00Z");

      act(() => {
        result.current.handleChange("startAt", newDate);
      });

      expect(result.current.values.startAt).toEqual(newDate);
    });

    it("should update startAt field with date string", () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.handleChange("startAt", "2025-12-20T10:00:00Z");
      });

      expect(result.current.values.startAt).toEqual(new Date("2025-12-20T10:00:00Z"));
    });

    it("should update endAt field", () => {
      const { result } = renderHook(() => useEventForm());
      const newDate = new Date("2025-12-20T12:00:00Z");

      act(() => {
        result.current.handleChange("endAt", newDate);
      });

      expect(result.current.values.endAt).toEqual(newDate);
    });

    it("should update isAllDay field", () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.handleChange("isAllDay", true);
      });

      expect(result.current.values.isAllDay).toBe(true);
    });

    it("should update color field", () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.handleChange("color", "#FF0000");
      });

      expect(result.current.values.color).toBe("#FF0000");
    });

    it("should update location field", () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.handleChange("location", "大阪");
      });

      expect(result.current.values.location).toBe("大阪");
    });

    it("should handle null value for string fields", () => {
      const { result } = renderHook(() => useEventForm({ title: "初期値" }));

      act(() => {
        result.current.handleChange("title", null);
      });

      expect(result.current.values.title).toBe("");
    });

    it("should handle undefined value for string fields", () => {
      const { result } = renderHook(() => useEventForm({ title: "初期値" }));

      act(() => {
        result.current.handleChange("title", undefined);
      });

      expect(result.current.values.title).toBe("");
    });
  });

  describe("handleBlur - フィールドフォーカスアウト", () => {
    it("should mark field as touched on blur", () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.touched.title).toBe(false);

      act(() => {
        result.current.handleBlur("title");
      });

      expect(result.current.touched.title).toBe(true);
    });

    it("should trigger validation on blur", () => {
      const { result } = renderHook(() => useEventForm({ title: "" }));

      act(() => {
        result.current.handleBlur("title");
      });

      expect(result.current.errors.title).toBe("タイトルは必須です");
    });

    it("should not show validation error for untouched fields", () => {
      const { result } = renderHook(() => useEventForm({ title: "" }));

      // blurしていない場合、errorsにはエラーがない（まだ表示されない）
      expect(result.current.errors.title).toBeUndefined();
    });
  });

  describe("タイトルバリデーション (Req 1.6, 3.5)", () => {
    it("should show error when title is empty", () => {
      const { result } = renderHook(() => useEventForm({ title: "" }));

      act(() => {
        result.current.handleBlur("title");
      });

      expect(result.current.errors.title).toBe("タイトルは必須です");
    });

    it("should show error when title is only whitespace", () => {
      const { result } = renderHook(() => useEventForm({ title: "   " }));

      act(() => {
        result.current.handleBlur("title");
      });

      expect(result.current.errors.title).toBe("タイトルは必須です");
    });

    it("should show error when title exceeds 255 characters", () => {
      const longTitle = "a".repeat(256);
      const { result } = renderHook(() => useEventForm({ title: longTitle }));

      act(() => {
        result.current.handleBlur("title");
      });

      expect(result.current.errors.title).toBe("タイトルは255文字以内で入力してください");
    });

    it("should not show error for valid title", () => {
      const { result } = renderHook(() => useEventForm({ title: "有効なタイトル" }));

      act(() => {
        result.current.handleBlur("title");
      });

      expect(result.current.errors.title).toBeUndefined();
    });

    it("should accept title with exactly 255 characters", () => {
      const maxTitle = "a".repeat(255);
      const { result } = renderHook(() => useEventForm({ title: maxTitle }));

      act(() => {
        result.current.handleBlur("title");
      });

      expect(result.current.errors.title).toBeUndefined();
    });

    it("should validate title via validate() method", () => {
      const longTitle = "a".repeat(256);
      const { result } = renderHook(() =>
        useEventForm({
          title: longTitle,
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        })
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.title).toBe("タイトルは255文字以内で入力してください");
    });
  });

  describe("開始日時バリデーション (Req 1.6, 3.5)", () => {
    it("should convert null startAt to default date on initialization", () => {
      // The hook normalizes null values to default Date
      const { result } = renderHook(() =>
        useEventForm({
          title: "テスト",
          startAt: null as unknown as Date,
          endAt: new Date("2025-12-15T12:00:00Z"),
        })
      );

      // null is converted to default Date, so it's valid
      expect(result.current.values.startAt).toBeInstanceOf(Date);
    });

    it("should show error for invalid date via validate()", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "テスト",
          startAt: new Date("invalid"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        })
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.startAt).toBe("有効な日時を入力してください");
    });

    it("should not show error for valid startAt", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "テスト",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        })
      );

      act(() => {
        result.current.handleBlur("startAt");
      });

      expect(result.current.errors.startAt).toBeUndefined();
    });
  });

  describe("終了日時バリデーション (Req 1.6, 3.5)", () => {
    it("should convert null endAt to default date on initialization", () => {
      // The hook normalizes null values to default Date
      const { result } = renderHook(() =>
        useEventForm({
          title: "テスト",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: null as unknown as Date,
        })
      );

      // null is converted to default Date, so it's valid
      expect(result.current.values.endAt).toBeInstanceOf(Date);
    });

    it("should show error when endAt is before startAt", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "テスト",
          startAt: new Date("2025-12-15T12:00:00Z"),
          endAt: new Date("2025-12-15T10:00:00Z"),
        })
      );

      act(() => {
        result.current.handleBlur("endAt");
      });

      expect(result.current.errors.endAt).toBe("終了日時は開始日時以降である必要があります");
    });

    it("should not show error when endAt equals startAt", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "テスト",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T10:00:00Z"),
        })
      );

      act(() => {
        result.current.handleBlur("endAt");
      });

      expect(result.current.errors.endAt).toBeUndefined();
    });

    it("should not show error for valid endAt", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "テスト",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        })
      );

      act(() => {
        result.current.handleBlur("endAt");
      });

      expect(result.current.errors.endAt).toBeUndefined();
    });
  });

  describe("説明バリデーション (Req 1.6, 3.5)", () => {
    it("should show error when description exceeds 5000 characters via validate()", () => {
      const longDescription = "a".repeat(5001);
      const { result } = renderHook(() =>
        useEventForm({
          title: "テスト",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
          description: longDescription,
        })
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.description).toBe("説明は5000文字以内で入力してください");
    });

    it("should not show error for description with exactly 5000 characters", () => {
      const maxDescription = "a".repeat(5000);
      const { result } = renderHook(() =>
        useEventForm({
          title: "テスト",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
          description: maxDescription,
        })
      );

      act(() => {
        result.current.handleBlur("description");
      });

      expect(result.current.errors.description).toBeUndefined();
    });

    it("should allow empty description", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "テスト",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
          description: "",
        })
      );

      act(() => {
        result.current.handleBlur("description");
      });

      expect(result.current.errors.description).toBeUndefined();
    });
  });

  describe("validate - フォーム全体バリデーション (Req 1.6, 3.5)", () => {
    it("should return true when form is valid", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "有効なタイトル",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
          description: "説明",
        })
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it("should return false when form has validation errors", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "",
          startAt: new Date("2025-12-15T12:00:00Z"),
          endAt: new Date("2025-12-15T10:00:00Z"),
        })
      );

      let isValid: boolean;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.title).toBe("タイトルは必須です");
      expect(result.current.errors.endAt).toBe("終了日時は開始日時以降である必要があります");
    });

    it("should mark all fields as touched after validation", () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.validate();
      });

      expect(result.current.touched.title).toBe(true);
      expect(result.current.touched.startAt).toBe(true);
      expect(result.current.touched.endAt).toBe(true);
      expect(result.current.touched.description).toBe(true);
      expect(result.current.touched.isAllDay).toBe(true);
      expect(result.current.touched.color).toBe(true);
      expect(result.current.touched.location).toBe(true);
    });

    it("should update isValid state after validation", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "",
        })
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValid).toBe(false);
    });
  });

  describe("reset - フォームリセット", () => {
    it("should reset to default values without arguments", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "変更されたタイトル",
        })
      );

      act(() => {
        result.current.handleChange("title", "新しいタイトル");
        result.current.handleBlur("title");
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.values.title).toBe("");
      expect(result.current.touched.title).toBe(false);
      expect(result.current.errors).toEqual({});
    });

    it("should reset to provided values", () => {
      const { result } = renderHook(() => useEventForm());
      const newValues = {
        title: "リセット後のタイトル",
        description: "リセット後の説明",
      };

      act(() => {
        result.current.reset(newValues);
      });

      expect(result.current.values.title).toBe("リセット後のタイトル");
      expect(result.current.values.description).toBe("リセット後の説明");
    });

    it("should clear all errors on reset", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "",
        })
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.title).toBeDefined();

      act(() => {
        result.current.reset({ title: "新しいタイトル" });
      });

      expect(result.current.errors).toEqual({});
    });

    it("should clear all touched states on reset", () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.handleBlur("title");
        result.current.handleBlur("startAt");
      });

      expect(result.current.touched.title).toBe(true);
      expect(result.current.touched.startAt).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.touched.title).toBe(false);
      expect(result.current.touched.startAt).toBe(false);
    });

    it("should handle Date values in reset", () => {
      const { result } = renderHook(() => useEventForm());
      const newStartAt = new Date("2025-12-20T10:00:00Z");
      const newEndAt = new Date("2025-12-20T12:00:00Z");

      act(() => {
        result.current.reset({
          startAt: newStartAt,
          endAt: newEndAt,
        });
      });

      expect(result.current.values.startAt).toEqual(newStartAt);
      expect(result.current.values.endAt).toEqual(newEndAt);
    });
  });

  describe("isValid プロパティ", () => {
    it("should be true when no errors exist", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "有効なタイトル",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        })
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValid).toBe(true);
    });

    it("should be false when errors exist", () => {
      const { result } = renderHook(() =>
        useEventForm({
          title: "",
        })
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValid).toBe(false);
    });
  });

  describe("リアルタイムバリデーション", () => {
    it("should re-validate touched field on change", () => {
      const { result } = renderHook(() => useEventForm({ title: "" }));

      // まずフィールドをタッチしてエラーを発生させる
      act(() => {
        result.current.handleBlur("title");
      });
      expect(result.current.errors.title).toBe("タイトルは必須です");

      // 有効な値を入力するとエラーがクリアされる
      act(() => {
        result.current.handleChange("title", "有効なタイトル");
      });
      expect(result.current.errors.title).toBeUndefined();
    });

    it("should not validate untouched field on change", () => {
      const { result } = renderHook(() => useEventForm());

      // フィールドをタッチせずに変更
      act(() => {
        result.current.handleChange("title", "");
      });

      // エラーは表示されない（フィールドがタッチされていないため）
      expect(result.current.errors.title).toBeUndefined();
    });
  });

  describe("エッジケース", () => {
    it("should handle string date conversion for startAt", () => {
      const { result } = renderHook(() =>
        useEventForm({
          // @ts-expect-error - Testing string to Date conversion
          startAt: "2025-12-15T10:00:00Z",
        })
      );

      expect(result.current.values.startAt).toBeInstanceOf(Date);
      expect(result.current.values.startAt.toISOString()).toBe("2025-12-15T10:00:00.000Z");
    });

    it("should handle string date conversion for endAt", () => {
      const { result } = renderHook(() =>
        useEventForm({
          // @ts-expect-error - Testing string to Date conversion
          endAt: "2025-12-15T12:00:00Z",
        })
      );

      expect(result.current.values.endAt).toBeInstanceOf(Date);
      expect(result.current.values.endAt.toISOString()).toBe("2025-12-15T12:00:00.000Z");
    });

    it("should preserve isValid when re-rendering without changes", () => {
      const { result, rerender } = renderHook(() =>
        useEventForm({
          title: "タイトル",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        })
      );

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValid).toBe(true);

      rerender();

      expect(result.current.isValid).toBe(true);
    });
  });

  describe("通知設定 - 初期状態 (Req 1.2, 2.2)", () => {
    it("should initialize notifications as empty array by default", () => {
      const { result } = renderHook(() => useEventForm());

      expect(result.current.values.notifications).toEqual([]);
    });

    it("should initialize with provided notifications", () => {
      const notifications: NotificationSetting[] = [
        { key: "a1", num: 10, unit: "minutes" },
        { key: "b2", num: 1, unit: "hours" },
      ];
      const { result } = renderHook(() => useEventForm({ notifications }));

      expect(result.current.values.notifications).toEqual(notifications);
    });
  });

  describe("addNotification - 通知追加 (Req 1.2, 1.6, 5.1)", () => {
    it("should add a notification with auto-generated key", () => {
      vi.spyOn(crypto, "randomUUID").mockReturnValue("mock-uuid-1" as `${string}-${string}-${string}-${string}-${string}`);
      const { result } = renderHook(() => useEventForm());

      let success: boolean;
      act(() => {
        success = result.current.addNotification({ num: 10, unit: "minutes" });
      });

      expect(success!).toBe(true);
      expect(result.current.values.notifications).toHaveLength(1);
      expect(result.current.values.notifications[0]).toEqual({
        key: "mock-uuid-1",
        num: 10,
        unit: "minutes",
      });

      vi.restoreAllMocks();
    });

    it("should reject duplicate notification (same num and unit)", () => {
      const { result } = renderHook(() =>
        useEventForm({
          notifications: [{ key: "a1", num: 10, unit: "minutes" }],
        })
      );

      let success: boolean;
      act(() => {
        success = result.current.addNotification({ num: 10, unit: "minutes" });
      });

      expect(success!).toBe(false);
      expect(result.current.values.notifications).toHaveLength(1);
    });

    it("should allow same num with different unit", () => {
      const { result } = renderHook(() =>
        useEventForm({
          notifications: [{ key: "a1", num: 10, unit: "minutes" }],
        })
      );

      let success: boolean;
      act(() => {
        success = result.current.addNotification({ num: 10, unit: "hours" });
      });

      expect(success!).toBe(true);
      expect(result.current.values.notifications).toHaveLength(2);
    });

    it("should reject when at max limit (10)", () => {
      const notifications: NotificationSetting[] = Array.from({ length: 10 }, (_, i) => ({
        key: `key-${i}`,
        num: i + 1,
        unit: "minutes" as const,
      }));
      const { result } = renderHook(() => useEventForm({ notifications }));

      let success: boolean;
      act(() => {
        success = result.current.addNotification({ num: 30, unit: "hours" });
      });

      expect(success!).toBe(false);
      expect(result.current.values.notifications).toHaveLength(10);
    });

    it("should add multiple different notifications", () => {
      const { result } = renderHook(() => useEventForm());

      act(() => {
        result.current.addNotification({ num: 10, unit: "minutes" });
      });
      act(() => {
        result.current.addNotification({ num: 1, unit: "hours" });
      });
      act(() => {
        result.current.addNotification({ num: 3, unit: "days" });
      });

      expect(result.current.values.notifications).toHaveLength(3);
    });
  });

  describe("removeNotification - 通知削除 (Req 1.4)", () => {
    it("should remove notification by key", () => {
      const notifications: NotificationSetting[] = [
        { key: "a1", num: 10, unit: "minutes" },
        { key: "b2", num: 1, unit: "hours" },
      ];
      const { result } = renderHook(() => useEventForm({ notifications }));

      act(() => {
        result.current.removeNotification("a1");
      });

      expect(result.current.values.notifications).toHaveLength(1);
      expect(result.current.values.notifications[0].key).toBe("b2");
    });

    it("should do nothing when key does not exist", () => {
      const notifications: NotificationSetting[] = [
        { key: "a1", num: 10, unit: "minutes" },
      ];
      const { result } = renderHook(() => useEventForm({ notifications }));

      act(() => {
        result.current.removeNotification("nonexistent");
      });

      expect(result.current.values.notifications).toHaveLength(1);
    });

    it("should allow adding after removing below limit", () => {
      const notifications: NotificationSetting[] = Array.from({ length: 10 }, (_, i) => ({
        key: `key-${i}`,
        num: i + 1,
        unit: "minutes" as const,
      }));
      const { result } = renderHook(() => useEventForm({ notifications }));

      act(() => {
        result.current.removeNotification("key-0");
      });

      let success: boolean;
      act(() => {
        success = result.current.addNotification({ num: 30, unit: "hours" });
      });

      expect(success!).toBe(true);
      expect(result.current.values.notifications).toHaveLength(10);
    });
  });

  describe("reset - 通知リセット", () => {
    it("should reset notifications to empty array", () => {
      const { result } = renderHook(() =>
        useEventForm({
          notifications: [{ key: "a1", num: 10, unit: "minutes" }],
        })
      );

      act(() => {
        result.current.reset();
      });

      expect(result.current.values.notifications).toEqual([]);
    });

    it("should reset notifications to provided values", () => {
      const { result } = renderHook(() => useEventForm());

      const newNotifications: NotificationSetting[] = [
        { key: "c3", num: 5, unit: "days" },
      ];

      act(() => {
        result.current.reset({ notifications: newNotifications });
      });

      expect(result.current.values.notifications).toEqual(newNotifications);
    });
  });
});
