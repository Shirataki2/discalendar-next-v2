/**
 * GuildSettingsPanel - ギルド設定パネルコンポーネント
 *
 * Task 7.1: ギルド設定パネルコンポーネントを作成する
 * - 管理権限のあるユーザーにのみ表示
 * - shadcn/ui の Switch で restricted フラグのトグルを提供
 * - ローディング状態とエラーフィードバックを提供
 *
 * Requirements: 5.3, 5.4
 */
"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { updateGuildConfig } from "@/app/dashboard/actions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type GuildSettingsPanelProps = {
  /** ギルドID */
  guildId: string;
  /** 現在の restricted フラグ */
  restricted: boolean;
  /** タイトル・border・paddingを非表示にする（Dialog内で使用時） */
  hideTitle?: boolean;
  /** restricted フラグの更新成功時に親へ通知するコールバック */
  onRestrictedChange?: (restricted: boolean) => void;
};

/**
 * ギルド設定パネル
 *
 * 管理権限のあるユーザー向けに restricted トグルを提供する。
 * トグル変更時に Server Action を呼び出してギルド設定を更新する。
 * 権限チェックはサーバー側で実施される（クライアント入力を信頼しない）。
 */
export function GuildSettingsPanel({
  guildId,
  restricted,
  hideTitle,
  onRestrictedChange,
}: GuildSettingsPanelProps) {
  const [isRestricted, setIsRestricted] = useState(restricted);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ギルド切替時に props 変更を state に同期する
  // biome-ignore lint/correctness/useExhaustiveDependencies: guildId は effect 内で直接使用されないが、ギルド切替時にエラーをリセットするために依存配列に含める
  useEffect(() => {
    setIsRestricted(restricted);
    setError(null);
  }, [guildId, restricted]);

  const handleToggle = useCallback(
    (checked: boolean) => {
      setError(null);
      const previousValue = isRestricted;
      setIsRestricted(checked);

      startTransition(async () => {
        const result = await updateGuildConfig({
          guildId,
          restricted: checked,
        });

        if (result.success) {
          onRestrictedChange?.(checked);
        } else {
          setIsRestricted(previousValue);
          setError(result.error.message);
        }
      });
    },
    [guildId, isRestricted, onRestrictedChange]
  );

  return (
    <div
      className={hideTitle ? "space-y-3" : "space-y-3 rounded-lg border p-4"}
    >
      {hideTitle ? null : <h4 className="font-semibold text-sm">ギルド設定</h4>}
      <div className="flex items-center justify-between gap-4">
        <Label className="cursor-pointer text-sm" htmlFor="restricted-toggle">
          イベント編集を管理者のみに制限
        </Label>
        <Switch
          checked={isRestricted}
          disabled={isPending}
          id="restricted-toggle"
          onCheckedChange={handleToggle}
        />
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
