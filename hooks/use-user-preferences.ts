"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./use-local-storage";

/**
 * カレンダーのビューモード型
 */
export type CalendarViewMode = "month" | "week" | "day";

/**
 * useUserPreferences フックの戻り値
 */
export interface UseUserPreferencesReturn {
	/** カレンダーデフォルトビュー */
	defaultCalendarView: CalendarViewMode;
	/** カレンダーデフォルトビューを更新 */
	setDefaultCalendarView: (view: CalendarViewMode) => void;
}

/** localStorage キー */
const STORAGE_KEY = "discalendar:default-calendar-view";

/** デフォルトのカレンダービューモード */
const DEFAULT_VIEW: CalendarViewMode = "month";

/** 有効なビューモード */
const VALID_VIEW_MODES: readonly CalendarViewMode[] = [
	"month",
	"week",
	"day",
];

/**
 * 値が有効な CalendarViewMode かどうかを検証する
 */
function isValidCalendarViewMode(value: unknown): value is CalendarViewMode {
	return (
		typeof value === "string" &&
		(VALID_VIEW_MODES as readonly string[]).includes(value)
	);
}

/**
 * ユーザープリファレンス管理フック
 *
 * カレンダーデフォルトビュー（月/週/日）の読み書きを型安全に一元管理する。
 * 既存の `useLocalStorage` フックを利用し、localStorage への永続化を行う。
 *
 * - デフォルト値: 月ビュー ("month")
 * - 不正な値が保存されていた場合は月ビューにフォールバック
 * - localStorage への書き込み失敗時もセッション中は state で値を保持
 * - 将来の設定項目追加に対応可能なオブジェクト形式の戻り値
 *
 * @example
 * ```tsx
 * function SettingsPanel() {
 *   const { defaultCalendarView, setDefaultCalendarView } = useUserPreferences();
 *
 *   return (
 *     <select
 *       value={defaultCalendarView}
 *       onChange={(e) => setDefaultCalendarView(e.target.value as CalendarViewMode)}
 *     >
 *       <option value="month">月</option>
 *       <option value="week">週</option>
 *       <option value="day">日</option>
 *     </select>
 *   );
 * }
 * ```
 */
export function useUserPreferences(): UseUserPreferencesReturn {
	const [storedView, setStoredView] = useLocalStorage<string>(
		STORAGE_KEY,
		DEFAULT_VIEW,
	);

	// 保存された値が有効なビューモードかを検証し、不正な場合はフォールバック
	const defaultCalendarView: CalendarViewMode = useMemo(() => {
		if (isValidCalendarViewMode(storedView)) {
			return storedView;
		}
		return DEFAULT_VIEW;
	}, [storedView]);

	const setDefaultCalendarView = useCallback(
		(view: CalendarViewMode) => {
			setStoredView(view);
			// useLocalStorage はエラーを飲み込みローカル state のみ更新するため、
			// 実際に永続化されたかを検証し、失敗時は呼び出し元にエラーを伝播する
			let stored: string | null;
			try {
				stored = window.localStorage.getItem(STORAGE_KEY);
			} catch {
				throw new Error("Failed to persist calendar view preference");
			}
			if (stored !== JSON.stringify(view)) {
				throw new Error("Failed to persist calendar view preference");
			}
		},
		[setStoredView],
	);

	return {
		defaultCalendarView,
		setDefaultCalendarView,
	};
}
