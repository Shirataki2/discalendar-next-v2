/**
 * IcsFeedUrlSection - ICSフィードURL管理セクション
 *
 * Task 5.1, 5.2: ギルド設定画面内に配置されるICSフィードURL表示・管理パネル
 * - フィードURLの表示 + コピーボタン
 * - 非公開ギルド: トークン再生成ボタン + 確認ダイアログ
 * - 公開ギルド: トークンなしURL表示
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { regenerateIcsFeedToken } from "@/app/dashboard/actions";
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

export type IcsFeedUrlSectionProps = {
  guildId: string;
  isPublic: boolean;
  feedUrl: string;
};

/** コピー完了フィードバックの表示時間（ミリ秒） */
const COPY_FEEDBACK_DURATION_MS = 2000;

export function IcsFeedUrlSection({
  guildId,
  isPublic,
  feedUrl: initialFeedUrl,
}: IcsFeedUrlSectionProps) {
  const [feedUrl, setFeedUrl] = useState(initialFeedUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!feedUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    } catch {
      setError("URLのコピーに失敗しました。");
    }
  }, [feedUrl]);

  const handleRegenerate = useCallback(() => {
    setRegenerateDialogOpen(true);
  }, []);

  const handleRegenerateConfirm = useCallback(() => {
    setRegenerateDialogOpen(false);
    setError(null);

    startTransition(async () => {
      const result = await regenerateIcsFeedToken(guildId);

      if (result.success) {
        setFeedUrl(result.data.feedUrl);
      } else {
        setError(result.error.message);
      }
    });
  }, [guildId]);

  if (!feedUrl) {
    return (
      <p className="text-muted-foreground text-sm">
        フィードURLの取得に失敗しました。ページを再読み込みしてください。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">
          {feedUrl}
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

      {isPublic ? null : (
        <Button
          disabled={isPending}
          onClick={handleRegenerate}
          size="sm"
          variant="ghost"
        >
          <RefreshCw className="mr-1 h-4 w-4" />
          トークンを再生成
        </Button>
      )}

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}

      {/* トークン再生成確認ダイアログ */}
      <AlertDialog
        onOpenChange={setRegenerateDialogOpen}
        open={regenerateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>トークンを再生成しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              現在のトークンは無効になり、新しいトークンが発行されます。既存のICSフィードURLは使用できなくなります。
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
