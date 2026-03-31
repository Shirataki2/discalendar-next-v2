"use client";

/**
 * useAttachmentUrls - 添付ファイルのSigned URL解決フック
 *
 * Task 6.2: EventPopoverからServer Actionを呼び出してSigned URLを取得する
 *
 * Requirements: 3.1, 3.2, 6.1, 6.2
 */

import { useEffect, useState } from "react";
import type { AttachmentMeta } from "@/lib/calendar/attachment-types";

/** Signed URL付き添付ファイル（attachment-display の AttachmentWithUrl と同等） */
export type AttachmentWithUrl = AttachmentMeta & {
  signedUrl: string;
};

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

  useEffect(() => {
    if (!enabled || !guildId || !attachments || attachments.length === 0) {
      setAttachmentsWithUrls([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchUrls({ guildId, attachments }).then((result) => {
      if (cancelled) return;

      if (result.success) {
        const urlMap = new Map(
          result.data.map((r) => [r.path, r.signedUrl])
        );
        const resolved = attachments
          .map((a) => ({
            ...a,
            signedUrl: urlMap.get(a.path) ?? "",
          }))
          .filter((a) => a.signedUrl !== "");
        setAttachmentsWithUrls(resolved);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, guildId, attachments, fetchUrls]);

  return { attachmentsWithUrls, isLoading };
}
