/**
 * PublicCalendarUrlSection - 公開カレンダーURL設定セクション
 *
 * Task 5.1, 5.2: ギルド設定画面内に配置される公開カレンダーURL設定パネル
 * - 公開カレンダーの有効・無効トグル
 * - 有効時: 公開URL表示 + コピーボタン + スラッグ再生成ボタン
 * - 無効時: URL生成を促すメッセージ
 * - 無効化時・再生成時に確認ダイアログを表示
 *
 * Requirements: 1.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */
"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  regeneratePublicSlugAction,
  togglePublicCalendar,
} from "@/app/dashboard/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type PublicCalendarUrlSectionProps = {
  guildId: string;
  isPublic: boolean;
  publicSlug: string | null;
};

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

function buildPublicUrl(slug: string): string {
  return `${getBaseUrl()}/cal/${slug}`;
}

export function PublicCalendarUrlSection({
  guildId,
  isPublic: initialIsPublic,
  publicSlug: initialPublicSlug,
}: PublicCalendarUrlSectionProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publicSlug, setPublicSlug] = useState(initialPublicSlug);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: guildId は effect 内で直接使用されないが、ギルド切替時にエラーをリセットするために依存配列に含める
  useEffect(() => {
    setIsPublic(initialIsPublic);
    setPublicSlug(initialPublicSlug);
    setError(null);
  }, [guildId, initialIsPublic, initialPublicSlug]);

  const handleToggle = useCallback(
    (checked: boolean) => {
      setError(null);

      if (!checked && isPublic) {
        setDisableDialogOpen(true);
        return;
      }

      setIsPublic(checked);

      startTransition(async () => {
        const result = await togglePublicCalendar({
          guildId,
          enabled: checked,
        });

        if (result.success) {
          setIsPublic(result.data.isPublic);
          setPublicSlug(result.data.publicSlug);
        } else {
          setIsPublic(!checked);
          setError(result.error.message);
        }
      });
    },
    [guildId, isPublic]
  );

  const handleDisableConfirm = useCallback(() => {
    setDisableDialogOpen(false);
    setIsPublic(false);

    startTransition(async () => {
      const result = await togglePublicCalendar({
        guildId,
        enabled: false,
      });

      if (result.success) {
        setIsPublic(result.data.isPublic);
        setPublicSlug(result.data.publicSlug);
      } else {
        setIsPublic(true);
        setError(result.error.message);
      }
    });
  }, [guildId]);

  const handleRegenerate = useCallback(() => {
    setRegenerateDialogOpen(true);
  }, []);

  const handleRegenerateConfirm = useCallback(() => {
    setRegenerateDialogOpen(false);
    setError(null);

    startTransition(async () => {
      const result = await regeneratePublicSlugAction({ guildId });

      if (result.success) {
        setPublicSlug(result.data.publicSlug);
      } else {
        setError(result.error.message);
      }
    });
  }, [guildId]);

  const handleCopy = useCallback(async () => {
    if (!publicSlug) {
      return;
    }
    try {
      await navigator.clipboard.writeText(buildPublicUrl(publicSlug));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("URLのコピーに失敗しました。");
    }
  }, [publicSlug]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Label
          className="cursor-pointer text-sm"
          htmlFor="public-calendar-toggle"
        >
          カレンダーを公開する
        </Label>
        <Switch
          checked={isPublic}
          disabled={isPending}
          id="public-calendar-toggle"
          onCheckedChange={handleToggle}
        />
      </div>

      {isPublic === true && publicSlug !== null ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">
              {buildPublicUrl(publicSlug)}
            </code>
            <Button
              disabled={isPending}
              onClick={handleCopy}
              size="sm"
              variant="outline"
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  コピーしました
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" />
                  コピー
                </>
              )}
            </Button>
          </div>
          <Button
            disabled={isPending}
            onClick={handleRegenerate}
            size="sm"
            variant="ghost"
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            URLを再生成
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          トグルをオンにすると公開URLが生成されます。
        </p>
      )}

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}

      {/* 無効化確認ダイアログ */}
      <AlertDialog onOpenChange={setDisableDialogOpen} open={disableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              公開カレンダーを無効にしますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              無効にすると、既存の共有URLからアクセスできなくなります。再度有効にすると、同じURLで再公開できます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisableConfirm}>
              無効にする
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* スラッグ再生成確認ダイアログ */}
      <AlertDialog
        onOpenChange={setRegenerateDialogOpen}
        open={regenerateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>URLを再生成しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              現在のURLは無効になり、新しいURLが発行されます。既存の共有リンクは使用できなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerateConfirm}>
              再生成する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
