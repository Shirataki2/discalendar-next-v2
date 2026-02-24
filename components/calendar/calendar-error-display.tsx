/**
 * CalendarErrorDisplay - カレンダーエラー表示コンポーネント
 *
 * エラーメッセージとリトライボタンを表示する。
 * 開発環境ではエラー詳細も表示する。
 */

export function CalendarErrorDisplay({
  error,
  onRetry,
}: {
  error: { message: string; details?: string };
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex flex-col items-center gap-2">
        <div className="text-destructive">{error.message}</div>
        {process.env.NODE_ENV === "development" && error.details && (
          <div className="text-muted-foreground text-xs">
            詳細: {error.details}
          </div>
        )}
      </div>
      <button
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        onClick={onRetry}
        type="button"
      >
        再試行
      </button>
    </div>
  );
}
