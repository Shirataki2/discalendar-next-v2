"use client";

/**
 * NotificationField - 通知設定UIコンポーネント
 *
 * タスク2.1: 通知設定 UI の構築とアクセシビリティ対応
 * - 数値入力（1〜99）と単位選択で通知タイミングを入力
 * - チップ（バッジ）形式で表示・削除
 * - 10件上限制御
 * - バリデーション（範囲外・重複）
 * - ARIA属性・ライブリージョン・キーボード操作
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 5.1
 */

import { Bell, Plus, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NOTIFICATION_UNIT_LABELS,
  type NotificationSetting,
  type NotificationUnit,
} from "@/lib/calendar/types";

const DEFAULT_MAX_NOTIFICATIONS = 10;
const MIN_NOTIFICATION_NUM = 1;
const MAX_NOTIFICATION_NUM = 99;
const DEFAULT_NUM = 10;
const DEFAULT_UNIT: NotificationUnit = "minutes";

const UNIT_OPTIONS: { value: NotificationUnit; label: string }[] = [
  { value: "minutes", label: "分前" },
  { value: "hours", label: "時間前" },
  { value: "days", label: "日前" },
  { value: "weeks", label: "週間前" },
];

export type NotificationFieldProps = {
  notifications: NotificationSetting[];
  onAdd: (notification: Omit<NotificationSetting, "key">) => void;
  onRemove: (key: string) => void;
  maxNotifications?: number;
  error?: string;
};

function formatNotificationLabel(num: number, unit: NotificationUnit): string {
  return `${num}${NOTIFICATION_UNIT_LABELS[unit]}`;
}

export function NotificationField({
  notifications,
  onAdd,
  onRemove,
  maxNotifications = DEFAULT_MAX_NOTIFICATIONS,
  error,
}: NotificationFieldProps) {
  const [inputNum, setInputNum] = useState(DEFAULT_NUM);
  const [inputUnit, setInputUnit] = useState<NotificationUnit>(DEFAULT_UNIT);
  const [validationError, setValidationError] = useState<string>("");
  const [liveMessage, setLiveMessage] = useState("");

  const isAtLimit = notifications.length >= maxNotifications;

  function validateNotification(
    num: number,
    unit: NotificationUnit
  ): string | null {
    if (num < MIN_NOTIFICATION_NUM || num > MAX_NOTIFICATION_NUM) {
      return `数値は${MIN_NOTIFICATION_NUM}以上${MAX_NOTIFICATION_NUM}以下で入力してください`;
    }
    const isDuplicate = notifications.some(
      (n) => n.num === num && n.unit === unit
    );
    if (isDuplicate) {
      return "同じ通知設定が既に存在します";
    }
    return null;
  }

  function handleAdd() {
    const validationResult = validateNotification(inputNum, inputUnit);
    if (validationResult) {
      setValidationError(validationResult);
      return;
    }

    setValidationError("");
    onAdd({ num: inputNum, unit: inputUnit });
    setInputNum(DEFAULT_NUM);
    setLiveMessage(
      `${formatNotificationLabel(inputNum, inputUnit)}の通知を追加しました`
    );
  }

  function handleRemove(key: string, label: string) {
    onRemove(key);
    setLiveMessage(`${label}の通知を削除しました`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isAtLimit) {
        handleAdd();
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <Label>通知設定</Label>
      </div>

      {/* Input row */}
      <div className="flex items-start gap-2">
        <div className="space-y-1">
          <Input
            aria-label="通知の数値"
            className="w-20"
            max={MAX_NOTIFICATION_NUM}
            min={MIN_NOTIFICATION_NUM}
            onChange={(e) => {
              setInputNum(Number(e.target.value));
              setValidationError("");
            }}
            onKeyDown={handleKeyDown}
            type="number"
            value={inputNum}
          />
        </div>

        <Select
          onValueChange={(value) => {
            setInputUnit(value as NotificationUnit);
            setValidationError("");
          }}
          value={inputUnit}
        >
          <SelectTrigger aria-label="通知の単位" className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          aria-label="追加"
          disabled={isAtLimit}
          onClick={handleAdd}
          size="icon"
          type="button"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Validation error */}
      {validationError ? (
        <p className="text-destructive text-sm">{validationError}</p>
      ) : null}

      {/* External error */}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {/* Limit message */}
      {isAtLimit ? (
        <p className="text-muted-foreground text-sm">
          通知は最大{maxNotifications}件まで設定できます
        </p>
      ) : null}

      {/* Count info (Req 4.3) */}
      <p className="sr-only" id="notification-count">
        {notifications.length}件 / {maxNotifications}件
      </p>

      {/* Notification chips */}
      {notifications.length > 0 ? (
        <ul
          aria-describedby="notification-count"
          className="flex flex-wrap gap-2"
        >
          {notifications.map((notification) => {
            const label = formatNotificationLabel(
              notification.num,
              notification.unit
            );
            return (
              <li key={notification.key}>
                <Badge className="gap-1 pr-1" variant="secondary">
                  {label}
                  <button
                    aria-label={`${label}の通知を削除`}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring"
                    onClick={() => handleRemove(notification.key, label)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Live region for screen readers (Req 4.4) */}
      <output aria-live="polite" className="sr-only">
        {liveMessage}
      </output>
    </div>
  );
}
