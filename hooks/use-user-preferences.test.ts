/**
 * ユーザープリファレンス管理フックのテスト
 *
 * Task 1.1: カレンダーデフォルトビューを管理するカスタムフック
 * - デフォルト値として月ビューを返す
 * - 値の更新と localStorage への永続化
 * - 不正な値が保存されていた場合のフォールバック
 * - localStorage 書き込み失敗時もセッション中は動作継続
 *
 * Requirements: 3.3, 5.1, 5.2, 5.3, 5.5
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUserPreferences } from "./use-user-preferences";

// localStorage のモック
const store = new Map<string, string>();

const localStorageMock = {
	getItem: vi.fn((key: string) => store.get(key) ?? null),
	setItem: vi.fn((key: string, value: string) => {
		store.set(key, value);
	}),
	removeItem: vi.fn((key: string) => {
		store.delete(key);
	}),
	clear: vi.fn(() => {
		store.clear();
	}),
	get length() {
		return store.size;
	},
	key: vi.fn((_index: number) => null),
};

Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
	writable: true,
});

const STORAGE_KEY = "discalendar:default-calendar-view";

describe("useUserPreferences", () => {
	beforeEach(() => {
		store.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		store.clear();
	});

	describe("デフォルト値 (Req 5.5)", () => {
		it("should return month as default calendar view when no value is stored", () => {
			const { result } = renderHook(() => useUserPreferences());

			expect(result.current.defaultCalendarView).toBe("month");
		});
	});

	describe("値の読み取りと復元 (Req 5.2)", () => {
		it("should restore stored calendar view from localStorage", () => {
			store.set(STORAGE_KEY, JSON.stringify("week"));

			const { result } = renderHook(() => useUserPreferences());

			expect(result.current.defaultCalendarView).toBe("week");
		});

		it("should restore day view from localStorage", () => {
			store.set(STORAGE_KEY, JSON.stringify("day"));

			const { result } = renderHook(() => useUserPreferences());

			expect(result.current.defaultCalendarView).toBe("day");
		});
	});

	describe("値の更新と永続化 (Req 3.3, 5.1)", () => {
		it("should update calendar view and persist to localStorage", () => {
			const { result } = renderHook(() => useUserPreferences());

			act(() => {
				result.current.setDefaultCalendarView("week");
			});

			expect(result.current.defaultCalendarView).toBe("week");
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				STORAGE_KEY,
				JSON.stringify("week"),
			);
		});

		it("should update to day view", () => {
			const { result } = renderHook(() => useUserPreferences());

			act(() => {
				result.current.setDefaultCalendarView("day");
			});

			expect(result.current.defaultCalendarView).toBe("day");
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				STORAGE_KEY,
				JSON.stringify("day"),
			);
		});

		it("should update back to month view", () => {
			store.set(STORAGE_KEY, JSON.stringify("week"));
			const { result } = renderHook(() => useUserPreferences());

			act(() => {
				result.current.setDefaultCalendarView("month");
			});

			expect(result.current.defaultCalendarView).toBe("month");
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				STORAGE_KEY,
				JSON.stringify("month"),
			);
		});
	});

	describe("不正な値のフォールバック (Req 5.5)", () => {
		it("should fallback to month when stored value is invalid JSON", () => {
			store.set(STORAGE_KEY, "not-valid-json");

			const { result } = renderHook(() => useUserPreferences());

			expect(result.current.defaultCalendarView).toBe("month");
		});

		it("should fallback to month when stored value is not a valid view mode", () => {
			store.set(STORAGE_KEY, JSON.stringify("invalid-view"));

			const { result } = renderHook(() => useUserPreferences());

			expect(result.current.defaultCalendarView).toBe("month");
		});

		it("should fallback to month when stored value is a number", () => {
			store.set(STORAGE_KEY, JSON.stringify(42));

			const { result } = renderHook(() => useUserPreferences());

			expect(result.current.defaultCalendarView).toBe("month");
		});

		it("should fallback to month when stored value is null", () => {
			store.set(STORAGE_KEY, JSON.stringify(null));

			const { result } = renderHook(() => useUserPreferences());

			expect(result.current.defaultCalendarView).toBe("month");
		});

		it("should fallback to month when stored value is an empty string", () => {
			store.set(STORAGE_KEY, JSON.stringify(""));

			const { result } = renderHook(() => useUserPreferences());

			expect(result.current.defaultCalendarView).toBe("month");
		});
	});

	describe("localStorage 書き込み失敗時の動作 (Req 5.4, 5.5)", () => {
		it("should still update React state when localStorage.setItem fails", () => {
			localStorageMock.setItem.mockImplementationOnce(() => {
				throw new Error("QuotaExceededError");
			});

			const { result } = renderHook(() => useUserPreferences());

			// useLocalStorage がエラーを飲み込み、React state のみ更新する
			// セッション中は新しい値が使用でき、リロード時にデフォルトにフォールバックする
			act(() => {
				result.current.setDefaultCalendarView("week");
			});

			expect(result.current.defaultCalendarView).toBe("week");
		});
	});

	describe("型安全性 (Req 5.3)", () => {
		it("should expose CalendarViewMode type through defaultCalendarView", () => {
			const { result } = renderHook(() => useUserPreferences());

			// 型チェック: defaultCalendarView は "month" | "week" | "day" のいずれか
			const view = result.current.defaultCalendarView;
			expect(["month", "week", "day"]).toContain(view);
		});

		it("should expose setDefaultCalendarView as a function", () => {
			const { result } = renderHook(() => useUserPreferences());

			expect(typeof result.current.setDefaultCalendarView).toBe("function");
		});
	});

	describe("拡張性", () => {
		it("should return an object with named properties (not tuple)", () => {
			const { result } = renderHook(() => useUserPreferences());

			// オブジェクト形式で返されること（将来の設定項目追加に対応）
			expect(result.current).toHaveProperty("defaultCalendarView");
			expect(result.current).toHaveProperty("setDefaultCalendarView");
		});
	});
});
