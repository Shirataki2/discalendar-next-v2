"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function UpcomingEventsError() {
  const router = useRouter();

  const handleRetry = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive/60" />
      <div className="space-y-1">
        <p className="font-medium text-destructive text-sm">
          予定の取得に失敗しました
        </p>
        <p className="text-muted-foreground text-xs">
          しばらく時間をおいてからもう一度お試しください
        </p>
      </div>
      <button
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90"
        onClick={handleRetry}
        type="button"
      >
        再読み込み
      </button>
    </div>
  );
}
