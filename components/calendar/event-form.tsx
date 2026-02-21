"use client";

/**
 * EventForm - 予定入力フォームコンポーネント
 *
 * タスク5.1: 予定入力フォームコンポーネントを作成する
 * - タイトル、開始日時、終了日時、説明、終日フラグ、色、場所を入力できるフォームを実装する
 * - HTML5のdatetime-local入力を使用して日時選択を提供する
 * - バリデーションエラーをフィールドごとに表示する
 * - 保存中のローディング状態とキャンセルボタンを提供する
 * - useEventFormフックを使用してフォーム状態を管理する
 *
 * Requirements: 1.3, 1.6, 3.2, 3.5
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import {
  type EventFormData,
  type UseEventFormReturn,
  useEventForm,
} from "@/hooks/calendar/use-event-form";
import { cn } from "@/lib/utils";
import { NotificationField } from "./notification-field";

/**
 * EventFormコンポーネントのProps
 */
export type EventFormProps = {
  /** フォームの初期値 */
  defaultValues?: Partial<EventFormData>;
  /** フォーム送信時のコールバック */
  onSubmit: (data: EventFormData) => void;
  /** 送信中かどうか */
  isSubmitting: boolean;
  /** キャンセル時のコールバック */
  onCancel: () => void;
};

// エラーメッセージのID（aria-describedby用）
const ERROR_IDS = {
  title: "title-error",
  startAt: "startAt-error",
  endAt: "endAt-error",
  description: "description-error",
} as const;

type FormFieldProps = {
  form: UseEventFormReturn;
  isSubmitting: boolean;
};

/**
 * タイトルフィールド
 */
function TitleField({ form, isSubmitting }: FormFieldProps) {
  const hasError = Boolean(form.touched.title && form.errors.title);
  const ariaDescribedBy = hasError ? ERROR_IDS.title : undefined;
  const errorClassName = hasError ? "border-destructive" : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor="title">
        タイトル<span className="text-destructive">*</span>
      </Label>
      <Input
        aria-describedby={ariaDescribedBy}
        aria-invalid={hasError}
        aria-required="true"
        className={cn(errorClassName)}
        disabled={isSubmitting}
        id="title"
        name="title"
        onBlur={() => form.handleBlur("title")}
        onChange={(e) => form.handleChange("title", e.target.value)}
        type="text"
        value={form.values.title}
      />
      {hasError ? (
        <p className="text-destructive text-sm" id={ERROR_IDS.title}>
          {form.errors.title}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 終日チェックボックス
 */
function AllDayField({ form, isSubmitting }: FormFieldProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        checked={form.values.isAllDay}
        disabled={isSubmitting}
        id="isAllDay"
        onCheckedChange={(checked) => form.handleChange("isAllDay", checked)}
      />
      <Label htmlFor="isAllDay">終日</Label>
    </div>
  );
}

/**
 * 日時フィールド（DatePicker + TimePicker統合）
 */
function DateTimeField({
  form,
  isSubmitting,
  field,
  label,
  onDateChange,
}: FormFieldProps & {
  field: "startAt" | "endAt";
  label: string;
  onDateChange?: (field: "startAt" | "endAt", date: Date) => void;
}) {
  const hasError = Boolean(form.touched[field] && form.errors[field]);
  const errorId = ERROR_IDS[field];
  const ariaDescribedBy = hasError ? errorId : undefined;
  const dateValue = form.values[field];

  function handleDateSelect(date: Date | undefined) {
    if (!date) {
      return;
    }
    const merged = new Date(dateValue);
    merged.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    form.handleChange(field, merged);
    onDateChange?.(field, merged);
  }

  function handleTimeChange(date: Date) {
    const merged = new Date(dateValue);
    merged.setHours(date.getHours(), date.getMinutes());
    form.handleChange(field, merged);
  }

  return (
    <div className="space-y-2">
      <Label>
        {label}
        <span className="text-destructive">*</span>
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="sm:flex-1">
          <DatePicker
            aria-describedby={ariaDescribedBy}
            aria-label={`${label}の日付`}
            disabled={isSubmitting}
            hasError={hasError}
            onChange={handleDateSelect}
            value={dateValue}
          />
        </div>
        {!form.values.isAllDay && (
          <div className="sm:w-32">
            <TimePicker
              aria-describedby={ariaDescribedBy}
              aria-label={`${label}の時刻`}
              disabled={isSubmitting}
              hasError={hasError}
              onChange={handleTimeChange}
              value={dateValue}
            />
          </div>
        )}
      </div>
      {hasError ? (
        <p className="text-destructive text-sm" id={errorId}>
          {form.errors[field]}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 説明フィールド
 */
function DescriptionField({ form, isSubmitting }: FormFieldProps) {
  const hasError = Boolean(form.touched.description && form.errors.description);
  const ariaDescribedBy = hasError ? ERROR_IDS.description : undefined;
  const errorClassName = hasError ? "border-destructive" : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor="description">説明</Label>
      <textarea
        aria-describedby={ariaDescribedBy}
        aria-invalid={hasError}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          errorClassName
        )}
        disabled={isSubmitting}
        id="description"
        name="description"
        onBlur={() => form.handleBlur("description")}
        onChange={(e) => form.handleChange("description", e.target.value)}
        rows={3}
        value={form.values.description}
      />
      {hasError ? (
        <p className="text-destructive text-sm" id={ERROR_IDS.description}>
          {form.errors.description}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 色選択フィールド
 */
function ColorField({ form, isSubmitting }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="color">色</Label>
      <Input
        className="h-10 w-20 cursor-pointer p-1"
        disabled={isSubmitting}
        id="color"
        name="color"
        onBlur={() => form.handleBlur("color")}
        onChange={(e) => form.handleChange("color", e.target.value)}
        type="color"
        value={form.values.color}
      />
    </div>
  );
}

/**
 * 場所フィールド
 */
function LocationField({ form, isSubmitting }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="location">場所</Label>
      <Input
        disabled={isSubmitting}
        id="location"
        name="location"
        onBlur={() => form.handleBlur("location")}
        onChange={(e) => form.handleChange("location", e.target.value)}
        type="text"
        value={form.values.location}
      />
    </div>
  );
}

/**
 * 予定入力フォームコンポーネント
 */
export function EventForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  onCancel,
}: EventFormProps) {
  const form = useEventForm(defaultValues);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.validate()) {
      onSubmit(form.values);
    }
  }

  /**
   * 開始日変更時の終了日自動調整（Task 4.2）
   * 開始日が終了日より後になった場合、終了日を開始日と同日に調整する
   */
  function handleDateChange(field: "startAt" | "endAt", date: Date) {
    if (field === "startAt" && date > form.values.endAt) {
      const adjusted = new Date(form.values.endAt);
      adjusted.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      form.handleChange("endAt", adjusted);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TitleField form={form} isSubmitting={isSubmitting} />
      <AllDayField form={form} isSubmitting={isSubmitting} />
      <DateTimeField
        field="startAt"
        form={form}
        isSubmitting={isSubmitting}
        label="開始日時"
        onDateChange={handleDateChange}
      />
      <DateTimeField
        field="endAt"
        form={form}
        isSubmitting={isSubmitting}
        label="終了日時"
      />
      <DescriptionField form={form} isSubmitting={isSubmitting} />
      <ColorField form={form} isSubmitting={isSubmitting} />
      <LocationField form={form} isSubmitting={isSubmitting} />
      <NotificationField
        notifications={form.values.notifications}
        onAdd={form.addNotification}
        onRemove={form.removeNotification}
      />

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          disabled={isSubmitting}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          キャンセル
        </Button>
        <Button disabled={isSubmitting} type="submit">
          保存
        </Button>
      </div>
    </form>
  );
}
