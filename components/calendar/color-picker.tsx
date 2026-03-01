"use client";

/**
 * ColorPicker - カラーパレット選択コンポーネント
 *
 * タスク1.1: プリセットカラーパレットと選択インタラクション
 * タスク1.2: カスタムカラーHEX入力機能
 *
 * Requirements: 1.1-1.3, 2.1-2.5, 3.1-3.5, 4.5, 5.1-5.4
 */

import { Check, Palette } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PresetColor = {
  readonly label: string;
  readonly value: string;
};

export const PRESET_COLORS: readonly PresetColor[] = [
  { label: "Blue", value: "#3B82F6" },
  { label: "Green", value: "#22C55E" },
  { label: "Amber", value: "#F59E0B" },
  { label: "Red", value: "#EF4444" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Orange", value: "#F97316" },
  { label: "Pink", value: "#EC4899" },
  { label: "Cyan", value: "#06B6D4" },
  { label: "Gray", value: "#6B7280" },
] as const;

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function isPresetColor(hex: string): boolean {
  return PRESET_COLORS.some((p) => p.value.toUpperCase() === hex.toUpperCase());
}

function isValidHex(hex: string): boolean {
  return HEX_PATTERN.test(hex);
}

export type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  const isCustomValue = !isPresetColor(value);
  const [showCustomInput, setShowCustomInput] = useState(isCustomValue);
  const [customInputValue, setCustomInputValue] = useState(
    isCustomValue ? value : ""
  );

  function handleSelect(color: string) {
    if (disabled) {
      return;
    }
    onChange(color);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    color: string
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(color);
    }
  }

  function handleCustomInputChange(inputValue: string) {
    setCustomInputValue(inputValue);
    if (isValidHex(inputValue)) {
      onChange(inputValue);
    }
  }

  return (
    <div className="space-y-2">
      <div
        aria-label="カラーパレット"
        className="grid grid-cols-9 gap-2"
        role="radiogroup"
      >
        {PRESET_COLORS.map((preset) => {
          const isSelected = value.toUpperCase() === preset.value.toUpperCase();

          return (
            // biome-ignore lint/a11y/useSemanticElements: カラースウォッチはinput[type=radio]では視覚表現が困難
            <button
              aria-checked={isSelected}
              aria-label={`${preset.label} (${preset.value})`}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                // biome-ignore lint/nursery/noLeakedRender: cn()内の条件付きクラス名
                isSelected ? "ring-2 ring-ring ring-offset-2" : undefined,
                // biome-ignore lint/nursery/noLeakedRender: cn()内の条件付きクラス名
                disabled ? "cursor-not-allowed opacity-50" : undefined
              )}
              disabled={disabled}
              key={preset.value}
              onClick={() => handleSelect(preset.value)}
              onKeyDown={(e) => handleKeyDown(e, preset.value)}
              role="radio"
              style={{ backgroundColor: preset.value }}
              tabIndex={0}
              type="button"
            >
              {isSelected ? (
                <Check
                  className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                  strokeWidth={3}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <Button
        disabled={disabled}
        onClick={() => setShowCustomInput((prev) => !prev)}
        size="sm"
        type="button"
        variant="outline"
      >
        <Palette className="h-4 w-4" />
        カスタム
      </Button>

      {showCustomInput ? (
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 shrink-0 rounded-full border"
            data-testid="color-preview"
            style={{ backgroundColor: value }}
          />
          <Input
            disabled={disabled}
            maxLength={7}
            onChange={(e) => handleCustomInputChange(e.target.value)}
            placeholder="#RRGGBB"
            type="text"
            value={customInputValue}
          />
        </div>
      ) : null}
    </div>
  );
}
