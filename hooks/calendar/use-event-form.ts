/**
 * 予定入力フォームのバリデーションと状態管理フック
 *
 * タスク3.1: 予定入力フォームのバリデーションと状態管理を行うカスタムフックを作成する
 * - フォームフィールド（タイトル、開始日時、終了日時、説明、終日フラグ）の状態管理を実装する
 * - タイトル必須（1-255文字）、日時必須、終了日時が開始日時以降であることのバリデーションを実装する
 * - フィールドごとのエラー状態とタッチ状態を管理する
 * - 初期値の設定と状態のリセット機能を提供する
 *
 * Requirements: 1.6, 3.5
 */
import { useCallback, useMemo, useState } from "react";
import type { NotificationSetting } from "@/lib/calendar/types";

/**
 * 予定入力フォームデータの型定義
 */
export interface EventFormData {
  /** イベントタイトル */
  title: string;
  /** 開始日時 */
  startAt: Date;
  /** 終了日時 */
  endAt: Date;
  /** イベントの説明 */
  description: string;
  /** 終日フラグ */
  isAllDay: boolean;
  /** イベントカラー (HEXコード) */
  color: string;
  /** 場所情報 */
  location: string;
  /** 通知設定 */
  notifications: NotificationSetting[];
}

/**
 * バリデーションエラーの型定義
 */
export interface ValidationErrors {
  title?: string;
  startAt?: string;
  endAt?: string;
  description?: string;
}

/**
 * useEventFormフックの戻り値の型
 */
export interface UseEventFormReturn {
  /** フォームの現在の値 */
  values: EventFormData;
  /** バリデーションエラー */
  errors: ValidationErrors;
  /** フィールドがタッチ（フォーカス）されたかどうか */
  touched: Record<keyof EventFormData, boolean>;
  /** フォーム全体が有効かどうか */
  isValid: boolean;
  /** フィールドの値を変更する */
  handleChange: (field: keyof EventFormData, value: unknown) => void;
  /** フィールドのフォーカスが外れたときに呼び出す */
  handleBlur: (field: keyof EventFormData) => void;
  /** フォーム全体をバリデーションする */
  validate: () => boolean;
  /** フォームの状態をリセットする */
  reset: (values?: Partial<EventFormData>) => void;
  /** 通知を追加する（重複・上限チェック後にkeyを自動生成） */
  addNotification: (notification: Omit<NotificationSetting, "key">) => boolean;
  /** 通知を削除する */
  removeNotification: (key: string) => void;
}

const MAX_NOTIFICATIONS = 10;

/**
 * デフォルトのフォーム値
 */
const DEFAULT_FORM_VALUES: EventFormData = {
  title: "",
  startAt: new Date(),
  endAt: new Date(),
  description: "",
  isAllDay: false,
  color: "#3B82F6",
  location: "",
  notifications: [],
};

/**
 * タイトルのバリデーション
 *
 * @param title - タイトル
 * @returns エラーメッセージ（エラーがない場合はundefined）
 */
function validateTitle(title: string): string | undefined {
  if (!title || title.trim().length === 0) {
    return "タイトルは必須です";
  }
  if (title.length > 255) {
    return "タイトルは255文字以内で入力してください";
  }
  return undefined;
}

/**
 * 開始日時のバリデーション
 *
 * @param startAt - 開始日時
 * @returns エラーメッセージ（エラーがない場合はundefined）
 */
function validateStartAt(startAt: Date | null | undefined): string | undefined {
  if (!startAt) {
    return "開始日時は必須です";
  }
  if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime())) {
    return "有効な日時を入力してください";
  }
  return undefined;
}

/**
 * 終了日時のバリデーション
 *
 * @param endAt - 終了日時
 * @param startAt - 開始日時（終了日時が開始日時以降であることを確認するため）
 * @returns エラーメッセージ（エラーがない場合はundefined）
 */
function validateEndAt(
  endAt: Date | null | undefined,
  startAt: Date | null | undefined
): string | undefined {
  if (!endAt) {
    return "終了日時は必須です";
  }
  if (!(endAt instanceof Date) || Number.isNaN(endAt.getTime())) {
    return "有効な日時を入力してください";
  }
  if (startAt && endAt < startAt) {
    return "終了日時は開始日時以降である必要があります";
  }
  return undefined;
}

/**
 * 説明のバリデーション
 *
 * @param description - 説明
 * @returns エラーメッセージ（エラーがない場合はundefined）
 */
function validateDescription(description: string): string | undefined {
  if (description.length > 5000) {
    return "説明は5000文字以内で入力してください";
  }
  return undefined;
}

/**
 * フォーム全体をバリデーションする
 *
 * @param values - フォームの値
 * @returns バリデーションエラー
 */
function validateForm(values: EventFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  const titleError = validateTitle(values.title);
  if (titleError) {
    errors.title = titleError;
  }

  const startAtError = validateStartAt(values.startAt);
  if (startAtError) {
    errors.startAt = startAtError;
  }

  const endAtError = validateEndAt(values.endAt, values.startAt);
  if (endAtError) {
    errors.endAt = endAtError;
  }

  const descriptionError = validateDescription(values.description);
  if (descriptionError) {
    errors.description = descriptionError;
  }

  return errors;
}

/**
 * 予定入力フォームのバリデーションと状態管理フック
 *
 * @param initialValues - 初期値（オプション）
 * @returns フォーム状態と操作メソッド
 *
 * @example
 * ```tsx
 * const form = useEventForm({
 *   title: "会議",
 *   startAt: new Date("2025-12-10T10:00:00"),
 *   endAt: new Date("2025-12-10T11:00:00"),
 * });
 *
 * // フィールドの値を変更
 * form.handleChange("title", "新しいタイトル");
 *
 * // バリデーション実行
 * if (form.validate()) {
 *   // フォームが有効
 *   onSubmit(form.values);
 * }
 * ```
 */
export function useEventForm(
  initialValues?: Partial<EventFormData>
): UseEventFormReturn {
  // 初期値のマージ
  const mergedInitialValues = useMemo<EventFormData>(() => {
    return {
      ...DEFAULT_FORM_VALUES,
      ...initialValues,
      // Date型のフィールドは明示的に処理
      startAt:
        initialValues?.startAt instanceof Date
          ? initialValues.startAt
          : initialValues?.startAt
            ? new Date(initialValues.startAt)
            : DEFAULT_FORM_VALUES.startAt,
      endAt:
        initialValues?.endAt instanceof Date
          ? initialValues.endAt
          : initialValues?.endAt
            ? new Date(initialValues.endAt)
            : DEFAULT_FORM_VALUES.endAt,
    };
  }, [initialValues]);

  // フォームの値
  const [values, setValues] = useState<EventFormData>(mergedInitialValues);

  // タッチ状態（フィールドがフォーカスされたかどうか）
  const [touched, setTouched] = useState<Record<keyof EventFormData, boolean>>({
    title: false,
    startAt: false,
    endAt: false,
    description: false,
    isAllDay: false,
    color: false,
    location: false,
    notifications: false,
  });

  // バリデーションエラー
  const [errors, setErrors] = useState<ValidationErrors>({});

  /**
   * フィールドの値を変更する
   */
  const handleChange = useCallback(
    (field: keyof EventFormData, value: unknown) => {
      setValues((prev) => {
        const newValues = { ...prev };

        // 値の型変換
        if (field === "startAt" || field === "endAt") {
          // Date型に変換
          if (value instanceof Date) {
            newValues[field] = value;
          } else if (typeof value === "string") {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
              newValues[field] = date;
            }
          }
        } else if (field === "isAllDay") {
          newValues[field] = Boolean(value);
        } else {
          // 文字列フィールド
          newValues[field] = String(value ?? "");
        }

        // タッチ済みのフィールドで、エラーがある場合は再バリデーション
        if (touched[field]) {
          const newErrors = validateForm(newValues);
          setErrors((prev) => {
            const updated = { ...prev };
            // ValidationErrors に存在するフィールドのみ更新
            if (field in newErrors) {
              // エラーがある場合：設定
              updated[field as keyof ValidationErrors] = newErrors[field as keyof ValidationErrors];
            } else if (field in prev) {
              // エラーがない場合：削除
              delete updated[field as keyof ValidationErrors];
            }
            return updated;
          });
        }

        return newValues;
      });
    },
    [touched]
  );

  /**
   * フィールドのフォーカスが外れたときに呼び出す
   */
  const handleBlur = useCallback(
    (field: keyof EventFormData) => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      // バリデーション実行
      const newErrors = validateForm(values);
      setErrors((prev) => {
        const updated = { ...prev };
        // ValidationErrors に存在するフィールドのみ更新
        if (field in newErrors) {
          // エラーがある場合：設定
          updated[field as keyof ValidationErrors] = newErrors[field as keyof ValidationErrors];
        } else if (field in prev) {
          // エラーがない場合：削除
          delete updated[field as keyof ValidationErrors];
        }
        return updated;
      });
    },
    [values]
  );

  /**
   * フォーム全体をバリデーションする
   *
   * @returns バリデーションが成功した場合true
   */
  const validate = useCallback((): boolean => {
    const newErrors = validateForm(values);
    setErrors(newErrors);

    // すべてのフィールドをタッチ済みにする
    setTouched({
      title: true,
      startAt: true,
      endAt: true,
      description: true,
      isAllDay: true,
      color: true,
      location: true,
      notifications: true,
    });

    return Object.keys(newErrors).length === 0;
  }, [values]);

  /**
   * フォームの状態をリセットする
   */
  const reset = useCallback((newValues?: Partial<EventFormData>) => {
    const resetValues: EventFormData = {
      ...DEFAULT_FORM_VALUES,
      ...newValues,
      // Date型のフィールドは明示的に処理
      startAt:
        newValues?.startAt instanceof Date
          ? newValues.startAt
          : newValues?.startAt
            ? new Date(newValues.startAt)
            : DEFAULT_FORM_VALUES.startAt,
      endAt:
        newValues?.endAt instanceof Date
          ? newValues.endAt
          : newValues?.endAt
            ? new Date(newValues.endAt)
            : DEFAULT_FORM_VALUES.endAt,
    };

    setValues(resetValues);
    setErrors({});
    setTouched({
      title: false,
      startAt: false,
      endAt: false,
      description: false,
      isAllDay: false,
      color: false,
      location: false,
      notifications: false,
    });
  }, []);

  /**
   * 通知を追加する
   * 重複チェック・上限チェック後、keyを自動生成して配列に追加
   *
   * @returns 追加成功時true、失敗時false
   */
  const addNotification = useCallback(
    (notification: Omit<NotificationSetting, "key">): boolean => {
      const current = values.notifications;
      // 上限チェック
      if (current.length >= MAX_NOTIFICATIONS) {
        return false;
      }
      // 重複チェック
      const isDuplicate = current.some(
        (n) => n.num === notification.num && n.unit === notification.unit
      );
      if (isDuplicate) {
        return false;
      }
      setValues((prev) => ({
        ...prev,
        notifications: [
          ...prev.notifications,
          { ...notification, key: crypto.randomUUID() },
        ],
      }));
      return true;
    },
    [values.notifications]
  );

  /**
   * 通知を削除する
   *
   * @param key - 削除する通知の一意キー
   */
  const removeNotification = useCallback((key: string) => {
    setValues((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.key !== key),
    }));
  }, []);

  // フォーム全体が有効かどうか（エラーがない場合）
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    validate,
    reset,
    addNotification,
    removeNotification,
  };
}
