"use client";

/**
 * RecurrenceSettingsControl - 繰り返し設定入力コンポーネント
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

import {
  type EndCondition,
  isWeekday,
  type MonthlyMode,
  type RecurrenceFrequency,
  type Weekday,
} from "@discalendar/rrule-utils";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { UseRecurrenceFormReturn } from "@/hooks/calendar/use-recurrence-form";
import { cn } from "@/lib/utils";

export type RecurrenceSettingsControlProps = {
  form: UseRecurrenceFormReturn;
  disabled?: boolean;
};

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" },
  { value: "monthly", label: "毎月" },
  { value: "yearly", label: "毎年" },
];

const FREQUENCY_UNIT_LABELS: Record<RecurrenceFrequency, string> = {
  daily: "日",
  weekly: "週",
  monthly: "ヶ月",
  yearly: "年",
};

const WEEKDAY_MAP: { value: Weekday; label: string }[] = [
  { value: "MO", label: "月" },
  { value: "TU", label: "火" },
  { value: "WE", label: "水" },
  { value: "TH", label: "木" },
  { value: "FR", label: "金" },
  { value: "SA", label: "土" },
  { value: "SU", label: "日" },
];

const NTH_OPTIONS = [
  { value: "1", label: "第1" },
  { value: "2", label: "第2" },
  { value: "3", label: "第3" },
  { value: "4", label: "第4" },
  { value: "-1", label: "最終" },
];

const WEEKDAY_SELECT_OPTIONS: { value: Weekday; label: string }[] = [
  { value: "MO", label: "月曜日" },
  { value: "TU", label: "火曜日" },
  { value: "WE", label: "水曜日" },
  { value: "TH", label: "木曜日" },
  { value: "FR", label: "金曜日" },
  { value: "SA", label: "土曜日" },
  { value: "SU", label: "日曜日" },
];

const END_CONDITION_OPTIONS = [
  { value: "never", label: "無期限" },
  { value: "count", label: "回数指定" },
  { value: "until", label: "日付指定" },
];

const ERROR_IDS = {
  interval: "recurrence-interval-error",
  byDay: "recurrence-byDay-error",
  count: "recurrence-count-error",
  until: "recurrence-until-error",
} as const;

const DAYS_IN_YEAR = 365;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_MINUTE = 60;
const MS_IN_SECOND = 1000;
const MS_IN_YEAR =
  DAYS_IN_YEAR *
  HOURS_IN_DAY *
  MINUTES_IN_HOUR *
  SECONDS_IN_MINUTE *
  MS_IN_SECOND;

/**
 * 曜日トグルボタン
 */
function WeekdayToggle({
  form,
  disabled,
}: {
  form: UseRecurrenceFormReturn;
  disabled?: boolean;
}) {
  const { byDay } = form.values;
  const hasError = Boolean(form.touched.byDay && form.errors.byDay);

  function handleToggle(weekday: Weekday) {
    if (byDay.includes(weekday)) {
      form.handleChange(
        "byDay",
        byDay.filter((d) => d !== weekday)
      );
    } else {
      form.handleChange("byDay", [...byDay, weekday]);
    }
  }

  return (
    <div className="space-y-2">
      <Label>曜日</Label>
      <fieldset
        aria-label="繰り返す曜日"
        className="flex gap-1 border-none p-0"
      >
        {WEEKDAY_MAP.map(({ value, label }) => {
          const isSelected = byDay.includes(value);
          const selectedClassName = isSelected
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : null;
          return (
            <Button
              aria-pressed={isSelected}
              className={cn("h-8 w-8 p-0", selectedClassName)}
              disabled={disabled}
              key={value}
              onClick={() => handleToggle(value)}
              size="sm"
              type="button"
              variant={isSelected ? "default" : "outline"}
            >
              {label}
            </Button>
          );
        })}
      </fieldset>
      {hasError ? (
        <p className="text-destructive text-sm" id={ERROR_IDS.byDay}>
          {form.errors.byDay}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 月次モード選択
 */
function MonthlyModeSelector({
  form,
  disabled,
}: {
  form: UseRecurrenceFormReturn;
  disabled?: boolean;
}) {
  const { monthlyMode } = form.values;

  function handleModeChange(mode: MonthlyMode["type"]) {
    if (mode === "dayOfMonth") {
      form.handleChange("monthlyMode", {
        type: "dayOfMonth",
        day: monthlyMode.type === "dayOfMonth" ? monthlyMode.day : 1,
      } satisfies MonthlyMode);
    } else {
      form.handleChange("monthlyMode", {
        type: "nthWeekday",
        n: monthlyMode.type === "nthWeekday" ? monthlyMode.n : 1,
        weekday: monthlyMode.type === "nthWeekday" ? monthlyMode.weekday : "MO",
      } satisfies MonthlyMode);
    }
  }

  function handleDayChange(day: number) {
    form.handleChange("monthlyMode", {
      type: "dayOfMonth",
      day,
    } satisfies MonthlyMode);
  }

  function handleNthChange(n: string) {
    if (monthlyMode.type !== "nthWeekday") {
      return;
    }
    form.handleChange("monthlyMode", {
      type: "nthWeekday",
      n: Number(n),
      weekday: monthlyMode.weekday,
    } satisfies MonthlyMode);
  }

  function handleWeekdayChange(weekday: string) {
    if (monthlyMode.type !== "nthWeekday") {
      return;
    }
    if (!isWeekday(weekday)) {
      return;
    }
    form.handleChange("monthlyMode", {
      type: "nthWeekday",
      n: monthlyMode.n,
      weekday,
    } satisfies MonthlyMode);
  }

  return (
    <fieldset className="space-y-3 border-none p-0">
      <legend className="font-medium text-sm leading-none">月次モード</legend>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            checked={monthlyMode.type === "dayOfMonth"}
            disabled={disabled}
            name="monthlyMode"
            onChange={() => handleModeChange("dayOfMonth")}
            type="radio"
            value="dayOfMonth"
          />
          <span className="text-sm">日付指定</span>
        </label>
        {monthlyMode.type === "dayOfMonth" ? (
          <div className="flex items-center gap-2 pl-6">
            <Input
              aria-label="日"
              className="w-20"
              disabled={disabled}
              max={31}
              min={1}
              onChange={(e) => handleDayChange(Number(e.target.value))}
              type="number"
              value={monthlyMode.day}
            />
            <span className="text-sm">日</span>
          </div>
        ) : null}

        <label className="flex items-center gap-2">
          <input
            checked={monthlyMode.type === "nthWeekday"}
            disabled={disabled}
            name="monthlyMode"
            onChange={() => handleModeChange("nthWeekday")}
            type="radio"
            value="nthWeekday"
          />
          <span className="text-sm">曜日指定</span>
        </label>
        {monthlyMode.type === "nthWeekday" ? (
          <div className="flex items-center gap-2 pl-6">
            <Select
              disabled={disabled}
              onValueChange={handleNthChange}
              value={String(monthlyMode.n)}
            >
              <SelectTrigger aria-label="第n週" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NTH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              disabled={disabled}
              onValueChange={handleWeekdayChange}
              value={monthlyMode.weekday}
            >
              <SelectTrigger aria-label="曜日" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAY_SELECT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

/**
 * 終了条件の型変更に対応する新しいEndConditionを生成する
 */
function buildEndCondition(type: string, current: EndCondition): EndCondition {
  if (type === "count") {
    return {
      type: "count",
      count: current.type === "count" ? current.count : 10,
    };
  }
  if (type === "until") {
    return {
      type: "until",
      until:
        current.type === "until"
          ? current.until
          : new Date(Date.now() + MS_IN_YEAR),
    };
  }
  return { type: "never" };
}

/**
 * 終了条件の回数入力
 */
function CountInput({
  count,
  hasError,
  disabled,
  form,
}: {
  count: number;
  hasError: boolean;
  disabled?: boolean;
  form: UseRecurrenceFormReturn;
}) {
  const ariaDescribedBy = hasError ? ERROR_IDS.count : undefined;
  const errorClassName = hasError ? "border-destructive" : undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          aria-describedby={ariaDescribedBy}
          aria-invalid={hasError}
          aria-label="回数"
          className={cn("w-24", errorClassName)}
          disabled={disabled}
          min={1}
          onBlur={() => form.handleBlur("count")}
          onChange={(e) =>
            form.handleChange("endCondition", {
              type: "count",
              count: Number(e.target.value),
            } satisfies EndCondition)
          }
          type="number"
          value={count}
        />
        <span className="text-sm">回</span>
      </div>
      {hasError ? (
        <p className="text-destructive text-sm" id={ERROR_IDS.count}>
          {form.errors.count}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 終了条件の日付入力
 */
function UntilInput({
  until,
  hasError,
  disabled,
  form,
}: {
  until: Date;
  hasError: boolean;
  disabled?: boolean;
  form: UseRecurrenceFormReturn;
}) {
  const ariaDescribedBy = hasError ? ERROR_IDS.until : undefined;

  function handleChange(date: Date | undefined) {
    if (!date) {
      return;
    }
    form.handleChange("endCondition", {
      type: "until",
      until: date,
    } satisfies EndCondition);
  }

  return (
    <div className="space-y-1">
      <DatePicker
        aria-describedby={ariaDescribedBy}
        aria-invalid={hasError}
        aria-label="終了日"
        disabled={disabled}
        hasError={hasError}
        onBlur={() => form.handleBlur("until")}
        onChange={handleChange}
        value={until}
      />
      {hasError ? (
        <p className="text-destructive text-sm" id={ERROR_IDS.until}>
          {form.errors.until}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 終了条件選択
 */
function EndConditionSelector({
  form,
  disabled,
}: {
  form: UseRecurrenceFormReturn;
  disabled?: boolean;
}) {
  const { endCondition } = form.values;
  const hasCountError = Boolean(form.touched.count && form.errors.count);
  const hasUntilError = Boolean(form.touched.until && form.errors.until);

  function handleTypeChange(type: string) {
    form.handleChange("endCondition", buildEndCondition(type, endCondition));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="endCondition">終了条件</Label>
      <Select
        disabled={disabled}
        onValueChange={handleTypeChange}
        value={endCondition.type}
      >
        <SelectTrigger
          aria-label="終了条件"
          className="w-full"
          id="endCondition"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {END_CONDITION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {endCondition.type === "count" ? (
        <CountInput
          count={endCondition.count}
          disabled={disabled}
          form={form}
          hasError={hasCountError}
        />
      ) : null}

      {endCondition.type === "until" ? (
        <UntilInput
          disabled={disabled}
          form={form}
          hasError={hasUntilError}
          until={endCondition.until}
        />
      ) : null}
    </div>
  );
}

/**
 * 繰り返し設定入力コンポーネント
 */
export function RecurrenceSettingsControl({
  form,
  disabled,
}: RecurrenceSettingsControlProps) {
  const { values } = form;
  const hasIntervalError = Boolean(
    form.touched.interval && form.errors.interval
  );
  const intervalAriaDescribedBy = hasIntervalError
    ? ERROR_IDS.interval
    : undefined;
  const intervalErrorClassName = hasIntervalError
    ? "border-destructive"
    : undefined;

  return (
    <div className="space-y-4">
      {/* 繰り返しトグル */}
      <div className="flex items-center gap-2">
        <Repeat className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="isRecurring">繰り返し</Label>
        <Switch
          checked={values.isRecurring}
          disabled={disabled}
          id="isRecurring"
          onCheckedChange={(checked) =>
            form.handleChange("isRecurring", checked)
          }
        />
      </div>

      {values.isRecurring ? (
        <div className="space-y-4 border-muted border-l-2 pl-4">
          {/* 頻度選択 + 間隔 */}
          <div className="flex items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="frequency">頻度</Label>
              <Select
                disabled={disabled}
                onValueChange={(value) =>
                  form.handleChange("frequency", value as RecurrenceFrequency)
                }
                value={values.frequency}
              >
                <SelectTrigger
                  aria-label="頻度"
                  className="w-32"
                  id="frequency"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">間隔</Label>
              <div className="flex items-center gap-2">
                <Input
                  aria-describedby={intervalAriaDescribedBy}
                  aria-invalid={hasIntervalError}
                  aria-label="間隔"
                  className={cn("w-20", intervalErrorClassName)}
                  disabled={disabled}
                  id="interval"
                  min={1}
                  onBlur={() => form.handleBlur("interval")}
                  onChange={(e) =>
                    form.handleChange("interval", Number(e.target.value))
                  }
                  type="number"
                  value={values.interval}
                />
                <span className="text-muted-foreground text-sm">
                  {FREQUENCY_UNIT_LABELS[values.frequency]}ごと
                </span>
              </div>
            </div>
          </div>
          {hasIntervalError ? (
            <p className="text-destructive text-sm" id={ERROR_IDS.interval}>
              {form.errors.interval}
            </p>
          ) : null}

          {/* 曜日選択（毎週時） */}
          {values.frequency === "weekly" ? (
            <WeekdayToggle disabled={disabled} form={form} />
          ) : null}

          {/* 月次モード選択（毎月時） */}
          {values.frequency === "monthly" ? (
            <MonthlyModeSelector disabled={disabled} form={form} />
          ) : null}

          {/* 終了条件 */}
          <EndConditionSelector disabled={disabled} form={form} />
        </div>
      ) : null}
    </div>
  );
}
