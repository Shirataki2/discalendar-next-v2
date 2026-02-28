"use client";

/**
 * ColorPicker - カラーパレット選択コンポーネント
 *
 * タスク1.1: プリセットカラーパレットと選択インタラクションを実装する
 * - プリセット9色のカラースウォッチをグリッド表示
 * - value / onChange / disabled propsによるControlled Component
 * - 選択中スウォッチにチェックマーク＋リング表示
 * - キーボード操作（Enter/Space）
 * - ARIA属性（role="radiogroup"/"radio", aria-checked, aria-label）
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 4.5, 5.1, 5.2, 5.3, 5.4
 */

import { Check } from "lucide-react";
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

export type ColorPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
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

  return (
    <div
      aria-label="カラーパレット"
      className="grid grid-cols-9 gap-2"
      role="radiogroup"
    >
      {PRESET_COLORS.map((preset) => {
        const isSelected = value.toUpperCase() === preset.value.toUpperCase();

        // biome-ignore lint/nursery/noLeakedRender: 変数代入のみでJSXレンダリングなし
        const selectedClass = isSelected
          ? "ring-2 ring-ring ring-offset-2"
          : undefined;
        // biome-ignore lint/nursery/noLeakedRender: 変数代入のみでJSXレンダリングなし
        const disabledClass = disabled
          ? "cursor-not-allowed opacity-50"
          : undefined;

        return (
          // biome-ignore lint/a11y/useSemanticElements: カラースウォッチはinput[type=radio]では視覚表現が困難
          <button
            aria-checked={isSelected}
            aria-label={`${preset.label} (${preset.value})`}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-full transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selectedClass,
              disabledClass
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
  );
}
