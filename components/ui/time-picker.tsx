"use client";

import { ClockIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: Date | undefined;
  onChange: (date: Date) => void;
  minuteStep?: number;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ITEM_HEIGHT = 44;

function generateMinuteOptions(step: number): number[] {
  const options: number[] = [];
  for (let m = 0; m < 60; m += step) {
    options.push(m);
  }
  return options;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function TimePicker({
  value,
  onChange,
  minuteStep = 5,
  placeholder = "時刻を選択",
  disabled = false,
  hasError = false,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const minuteOptions = generateMinuteOptions(minuteStep);

  const selectedHour = value?.getHours();
  const selectedMinute = value?.getMinutes();

  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || selectedHour === undefined) return;
    const viewport = hourListRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    );
    if (viewport) {
      viewport.scrollTop = selectedHour * ITEM_HEIGHT;
    }
  }, [open, selectedHour]);

  useEffect(() => {
    if (!open || selectedMinute === undefined) return;
    const viewport = minuteListRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    );
    if (viewport) {
      const index = minuteOptions.indexOf(selectedMinute);
      if (index >= 0) {
        viewport.scrollTop = index * ITEM_HEIGHT;
      }
    }
  }, [open, selectedMinute, minuteOptions]);

  function handleHourSelect(hour: number) {
    const base = value ?? new Date();
    const next = new Date(base);
    next.setHours(hour);
    onChange(next);
  }

  function handleMinuteSelect(minute: number) {
    const base = value ?? new Date();
    const next = new Date(base);
    next.setMinutes(minute);
    onChange(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
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
          <ScrollArea
            ref={hourListRef}
            className="h-[220px] w-[72px]"
          >
            <div role="listbox" aria-label="時">
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
                >
                  {hour}
                </button>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea
            ref={minuteListRef}
            className="h-[220px] w-[72px]"
          >
            <div role="listbox" aria-label="分">
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
                >
                  {minute.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { TimePicker };
export type { TimePickerProps };
