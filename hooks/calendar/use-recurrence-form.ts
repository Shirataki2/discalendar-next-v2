"use client";

/**
 * 繰り返し設定フォームの状態管理フック
 *
 * タスク5.1: 繰り返し設定のフォーム状態管理フックを実装する
 * - 繰り返しの有効/無効、頻度、間隔、曜日、月次モード、終了条件のフォーム状態を管理する
 * - バリデーション: interval>=1, count>=1, until>=dtstart, weeklyでbyDay>=1
 * - 現在のフォーム状態からRRULE文字列を生成する
 * - 既存のuseEventFormフックと並行使用できる
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.5, 3.6
 * Contracts: useRecurrenceForm
 */
import { useCallback, useMemo, useState } from "react";
import {
  type EndCondition,
  type MonthlyMode,
  type RecurrenceFrequency,
  type Weekday,
  buildRruleString,
} from "@discalendar/rrule-utils";

/**
 * 繰り返しフォームデータの型定義
 */
export interface RecurrenceFormData {
  /** 繰り返しの有効/無効 */
  isRecurring: boolean;
  /** 繰り返し頻度 */
  frequency: RecurrenceFrequency;
  /** 繰り返し間隔 */
  interval: number;
  /** 曜日リスト（週次の場合） */
  byDay: Weekday[];
  /** 月次モード */
  monthlyMode: MonthlyMode;
  /** 終了条件 */
  endCondition: EndCondition;
}

/**
 * 繰り返しバリデーションエラーの型定義
 */
export interface RecurrenceValidationErrors {
  interval?: string;
  count?: string;
  until?: string;
  byDay?: string;
}

/** タッチ状態のフィールド名 */
type TouchField = "interval" | "byDay" | "count" | "until";

/**
 * useRecurrenceFormフックの戻り値の型
 */
export interface UseRecurrenceFormReturn {
  /** フォームの現在の値 */
  values: RecurrenceFormData;
  /** バリデーションエラー */
  errors: RecurrenceValidationErrors;
  /** フィールドがタッチされたかどうか */
  touched: Record<TouchField, boolean>;
  /** フォーム全体が有効かどうか */
  isValid: boolean;
  /** フィールドの値を変更する */
  handleChange: <F extends keyof RecurrenceFormData>(field: F, value: RecurrenceFormData[F]) => void;
  /** フィールドのフォーカスが外れたときに呼び出す */
  handleBlur: (field: TouchField) => void;
  /** フォーム全体をバリデーションする（dtstartはuntilバリデーションに使用） */
  validate: (dtstart?: Date) => boolean;
  /** フォームの状態をリセットする */
  reset: (values?: Partial<RecurrenceFormData>) => void;
  /** 現在の設定からRRULE文字列を生成する */
  toRruleString: (dtstart: Date) => string;
}

/**
 * デフォルトのフォーム値
 */
const DEFAULT_FORM_VALUES: RecurrenceFormData = {
  isRecurring: false,
  frequency: "weekly",
  interval: 1,
  byDay: [],
  monthlyMode: { type: "dayOfMonth", day: 1 },
  endCondition: { type: "never" },
};

const DEFAULT_TOUCHED: Record<TouchField, boolean> = {
  interval: false,
  byDay: false,
  count: false,
  until: false,
};

/**
 * フォーム全体をバリデーションする
 */
function validateForm(
  values: RecurrenceFormData,
  dtstart?: Date,
): RecurrenceValidationErrors {
  // 繰り返し無効の場合はバリデーション不要
  if (!values.isRecurring) {
    return {};
  }

  const errors: RecurrenceValidationErrors = {};

  // interval >= 1
  if (values.interval < 1) {
    errors.interval = "間隔は1以上を指定してください";
  }

  // 週次の場合 byDay >= 1
  if (values.frequency === "weekly" && values.byDay.length === 0) {
    errors.byDay = "曜日を1つ以上選択してください";
  }

  // count >= 1
  if (values.endCondition.type === "count" && values.endCondition.count < 1) {
    errors.count = "回数は1以上を指定してください";
  }

  // until >= dtstart
  if (values.endCondition.type === "until" && dtstart) {
    if (values.endCondition.until < dtstart) {
      errors.until = "終了日はイベント開始日以降を指定してください";
    }
  }

  return errors;
}

/**
 * 繰り返し設定フォームの状態管理フック
 *
 * @param initialValues - 初期値（オプション）
 * @returns フォーム状態と操作メソッド
 *
 * @example
 * ```tsx
 * const recurrence = useRecurrenceForm({ isRecurring: true, frequency: "weekly" });
 * const event = useEventForm({ title: "定例会議" });
 *
 * // 繰り返しの設定変更
 * recurrence.handleChange("frequency", "daily");
 *
 * // RRULE生成
 * const rrule = recurrence.toRruleString(event.values.startAt);
 * ```
 */
export function useRecurrenceForm(
  initialValues?: Partial<RecurrenceFormData>,
): UseRecurrenceFormReturn {
  const mergedInitialValues = useMemo<RecurrenceFormData>(
    () => ({
      ...DEFAULT_FORM_VALUES,
      ...initialValues,
    }),
    [initialValues],
  );

  const [values, setValues] = useState<RecurrenceFormData>(mergedInitialValues);
  const [touched, setTouched] =
    useState<Record<TouchField, boolean>>(DEFAULT_TOUCHED);
  const [errors, setErrors] = useState<RecurrenceValidationErrors>({});
  // dtstart を保持（validate時に渡された値を再バリデーションで使用）
  const [lastDtstart, setLastDtstart] = useState<Date | undefined>();

  const handleChange = useCallback(
    <F extends keyof RecurrenceFormData>(field: F, value: RecurrenceFormData[F]) => {
      setValues((prev) => {
        const newValues = { ...prev, [field]: value };

        // タッチ済みフィールドの再バリデーション
        const touchedFields = Object.keys(touched).filter(
          (k) => touched[k as TouchField],
        );
        if (touchedFields.length > 0) {
          const newErrors = validateForm(newValues, lastDtstart);
          setErrors(newErrors);
        }

        return newValues;
      });
    },
    [touched, lastDtstart],
  );

  const handleBlur = useCallback(
    (field: TouchField) => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      const newErrors = validateForm(values, lastDtstart);
      setErrors(newErrors);
    },
    [values, lastDtstart],
  );

  const validate = useCallback(
    (dtstart?: Date): boolean => {
      if (dtstart) {
        setLastDtstart(dtstart);
      }

      const newErrors = validateForm(values, dtstart ?? lastDtstart);
      setErrors(newErrors);

      // すべてのフィールドをタッチ済みにする
      setTouched({
        interval: true,
        byDay: true,
        count: true,
        until: true,
      });

      return Object.keys(newErrors).length === 0;
    },
    [values, lastDtstart],
  );

  const reset = useCallback((newValues?: Partial<RecurrenceFormData>) => {
    setValues({
      ...DEFAULT_FORM_VALUES,
      ...newValues,
    });
    setErrors({});
    setTouched({ ...DEFAULT_TOUCHED });
    setLastDtstart(undefined);
  }, []);

  const toRruleString = useCallback(
    (dtstart: Date): string => {
      return buildRruleString({
        frequency: values.frequency,
        interval: values.interval,
        byDay: values.byDay.length > 0 ? values.byDay : undefined,
        monthlyMode:
          values.frequency === "monthly" ? values.monthlyMode : undefined,
        endCondition: values.endCondition,
        dtstart,
      });
    },
    [values],
  );

  const isValid = useMemo(
    () => Object.keys(errors).length === 0,
    [errors],
  );

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    validate,
    reset,
    toRruleString,
  };
}
