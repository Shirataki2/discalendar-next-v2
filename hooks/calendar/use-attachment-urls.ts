"use client";

/**
 * useAttachmentUrls - 添付ファイルのSigned URL解決フック
 *
 * Task 6.2: EventPopoverからServer Actionを呼び出してSigned URLを取得する
 *
 * Requirements: 3.1, 3.2, 6.1, 6.2
 */

import { useEffect, useMemo, useState } from "react";
import type { AttachmentMeta, AttachmentWithUrl } from "@/lib/calendar/attachment-types";

/** Signed URL取得結果 */
type SignedUrlItem = {
  path: string;
  signedUrl: string;
};

/** fetchUrls の成功/失敗結果 */
type FetchResult =
  | { success: true; data: SignedUrlItem[] }
  | { success: false; error: { code: string; message: string } };

/** Server Action の型シグネチャ */
type FetchUrlsFn = (input: {
  guildId: string;
  attachments: AttachmentMeta[];
}) => Promise<FetchResult>;

export interface UseAttachmentUrlsOptions {
  attachments: AttachmentMeta[] | undefined;
  guildId: string | null | undefined;
  enabled: boolean;
  fetchUrls: FetchUrlsFn;
}

interface UseAttachmentUrlsReturn {
  attachmentsWithUrls: AttachmentWithUrl[];
  isLoading: boolean;
  error: string | null;
}

export function useAttachmentUrls({
  attachments,
  guildId,
  enabled,
  fetchUrls,
}: UseAttachmentUrlsOptions): UseAttachmentUrlsReturn {
  const [attachmentsWithUrls, setAttachmentsWithUrls] = useState<
    AttachmentWithUrl[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachmentsKey = useMemo(
    () => (attachments ? JSON.stringify(attachments.map((a) => a.path)) : ""),
    [attachments]
  );

  useEffect(() => {
    if (!enabled || !guildId || !attachments || attachments.length === 0) {
      setAttachmentsWithUrls([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const currentGuildId = guildId;
    const currentAttachments = attachments;
    let cancelled = false;
    setIsLoading(true);
    setAttachmentsWithUrls([]);
    setError(null);

    async function load() {
      try {
        const result = await fetchUrls({ guildId: currentGuildId, attachments: currentAttachments });
        if (cancelled) return;

        if (result.success) {
          const urlMap = new Map(
            result.data.map((r) => [r.path, r.signedUrl])
          );
          const resolved = currentAttachments
            .map((a) => ({
              ...a,
              signedUrl: urlMap.get(a.path) ?? "",
            }))
            .filter((a) => a.signedUrl !== "");
          setAttachmentsWithUrls(resolved);
        } else {
          setError(result.error.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- attachmentsKeyでメモ化してオブジェクト参照変更による不要な再フェッチを防止
  }, [enabled, guildId, attachmentsKey, fetchUrls]);

  return { attachmentsWithUrls, isLoading, error };
}
