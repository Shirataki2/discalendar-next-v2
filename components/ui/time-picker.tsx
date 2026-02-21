"use client";

import { ClockIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: Date | undefined;
  /** value が undefined の場合、現在日時を基準に新しい Date を生成して返す。DatePicker の onChange と異なり undefined を返さない（時刻クリア操作は不要なため）。 */
  onChange: (date: Date) => void;
  onBlur?: () => void;
  /** 分の刻み幅。60の約数（5, 10, 15, 20, 30）を推奨。0以下または60以上はデフォルト値(5)にフォールバック。 */
  minuteStep?: number;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
}

const HOURS_COUNT = 24;
const MINUTES_IN_HOUR = 60;
const DEFAULT_MINUTE_STEP = 5;

const HOURS = Array.from({ length: HOURS_COUNT }, (_, i) => i);

function generateMinuteOptions(step: number): number[] {
  const safeStep =
    step > 0 && step < MINUTES_IN_HOUR ? step : DEFAULT_MINUTE_STEP;
  return Array.from(
    { length: Math.ceil(MINUTES_IN_HOUR / safeStep) },
    (_, i) => i * safeStep
  );
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function TimePicker({
  value,
  onChange,
  onBlur,
  minuteStep = DEFAULT_MINUTE_STEP,
  placeholder = "時刻を選択",
  disabled = false,
  hasError = false,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
  "aria-invalid": ariaInvalid,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const minuteOptions = useMemo(
    () => generateMinuteOptions(minuteStep),
    [minuteStep]
  );

  const selectedHour = value?.getHours();
  const selectedMinute = value?.getMinutes();

  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  const scrollToSelected = useCallback(
    (listRef: React.RefObject<HTMLDivElement | null>) => {
      const el = listRef.current;
      if (!el) return;
      const selected = el.querySelector('[aria-selected="true"]');
      if (selected instanceof HTMLElement && selected.scrollIntoView) {
        selected.scrollIntoView({ block: "center" });
      }
    },
    []
  );

  useEffect(() => {
    if (!open || selectedHour === undefined) return;
    scrollToSelected(hourListRef);
  }, [open, selectedHour, scrollToSelected]);

  useEffect(() => {
    if (!open || selectedMinute === undefined) return;
    scrollToSelected(minuteListRef);
  }, [open, selectedMinute, scrollToSelected, minuteOptions]);

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      onBlur?.();
    }
  }

  function handleHourSelect(hour: number) {
    const base = value ?? new Date();
    const next = new Date(base);
    next.setHours(hour, next.getMinutes(), 0, 0);
    onChange(next);
  }

  function handleMinuteSelect(minute: number) {
    const base = value ?? new Date();
    const next = new Date(base);
    next.setMinutes(minute, 0, 0);
    onChange(next);
  }

  function handleHourKeyDown(e: React.KeyboardEvent, hour: number) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      handleHourSelect((hour + 1) % HOURS_COUNT);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      handleHourSelect((hour - 1 + HOURS_COUNT) % HOURS_COUNT);
    }
  }

  function handleMinuteKeyDown(e: React.KeyboardEvent, minute: number) {
    const currentIndex = minuteOptions.indexOf(minute);
    if (currentIndex < 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % minuteOptions.length;
      handleMinuteSelect(minuteOptions[nextIndex]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex =
        (currentIndex - 1 + minuteOptions.length) % minuteOptions.length;
      handleMinuteSelect(minuteOptions[nextIndex]);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-required={ariaRequired}
          aria-invalid={ariaInvalid}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            hasError && "border-destructive"
          )}
        >
          <ClockIcon className="mr-2 size-4" />
          {value ? formatTime(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x">
          <div
            ref={hourListRef}
            className="h-[220px] w-[72px] overflow-y-auto overscroll-contain"
            role="listbox"
            aria-label="時"
            onWheel={(e) => e.stopPropagation()}
          >
            {HOURS.map((hour) => (
              <button
                key={hour}
                type="button"
                role="option"
                aria-selected={selectedHour === hour}
                className={cn(
                  "flex w-full items-center justify-center text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  "min-h-[44px]",
                  selectedHour === hour &&
                    "bg-primary text-primary-foreground"
                )}
                onClick={() => handleHourSelect(hour)}
                onKeyDown={(e) => handleHourKeyDown(e, hour)}
              >
                {hour.toString().padStart(2, "0")}
              </button>
            ))}
          </div>
          <div
            ref={minuteListRef}
            className="h-[220px] w-[72px] overflow-y-auto overscroll-contain"
            role="listbox"
            aria-label="分"
            onWheel={(e) => e.stopPropagation()}
          >
            {minuteOptions.map((minute) => (
              <button
                key={minute}
                type="button"
                role="option"
                aria-selected={selectedMinute === minute}
                className={cn(
                  "flex w-full items-center justify-center text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                  "min-h-[44px]",
                  selectedMinute === minute &&
                    "bg-primary text-primary-foreground"
                )}
                onClick={() => handleMinuteSelect(minute)}
                onKeyDown={(e) => handleMinuteKeyDown(e, minute)}
              >
                {minute.toString().padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { TimePicker };
export type { TimePickerProps };
