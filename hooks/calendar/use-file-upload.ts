/**
 * useFileUpload - ファイルアップロード状態管理・バリデーションフック
 *
 * Task 3.1: useFileUploadフックの実装
 * - クライアントサイドバリデーション（サイズ・MIMEタイプ・件数上限）
 * - Supabase Storage SDKによるファイルアップロード
 * - 既存添付ファイルの管理（編集時の初期値設定）
 * - 添付ファイル削除の記録（pendingDeletions）
 *
 * Requirements: 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4
 */

import { useCallback, useMemo, useState } from "react";
import type { AttachmentMeta, UploadingFile } from "@/lib/calendar/attachment-types";
import { ATTACHMENT_LIMITS, isAllowedMimeType } from "@/lib/calendar/attachment-types";
import { buildStoragePath } from "@/lib/calendar/attachment-service";
import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "event-attachments";

export interface UseFileUploadOptions {
  guildId: string;
  eventId?: string;
  existingAttachments?: AttachmentMeta[];
}

export interface UseFileUploadReturn {
  attachments: AttachmentMeta[];
  uploadingFiles: UploadingFile[];
  addFiles: (files: FileList | File[]) => void;
  removeAttachment: (path: string) => void;
  pendingDeletions: string[];
  isUploading: boolean;
  isAtLimit: boolean;
  errors: string[];
}

interface FileValidationResult {
  valid: File[];
  errors: string[];
}

function validateFiles(
  files: File[],
  currentCount: number,
): FileValidationResult {
  const valid: File[] = [];
  const errors: string[] = [];

  const remaining = ATTACHMENT_LIMITS.MAX_FILES_PER_EVENT - currentCount;
  if (files.length > remaining) {
    errors.push(
      `添付ファイルは最大${ATTACHMENT_LIMITS.MAX_FILES_PER_EVENT}件までです（残り${remaining}件）`,
    );
    return { valid, errors };
  }

  for (const file of files) {
    if (file.size > ATTACHMENT_LIMITS.MAX_FILE_SIZE) {
      errors.push(
        `「${file.name}」のファイルサイズが10MBを超えています`,
      );
      continue;
    }

    if (!isAllowedMimeType(file.type)) {
      errors.push(
        `「${file.name}」は対応していないファイル形式です（対応: JPG, PNG, GIF, WebP, PDF）`,
      );
      continue;
    }

    valid.push(file);
  }

  return { valid, errors };
}

export function useFileUpload({
  guildId,
  eventId,
  existingAttachments,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [attachments, setAttachments] = useState<AttachmentMeta[]>(
    existingAttachments ?? [],
  );
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const isUploading = useMemo(
    () => uploadingFiles.some((f) => f.status === "pending" || f.status === "uploading"),
    [uploadingFiles],
  );

  const isAtLimit = useMemo(
    () => attachments.length + uploadingFiles.filter(
      (f) => f.status === "pending" || f.status === "uploading",
    ).length >= ATTACHMENT_LIMITS.MAX_FILES_PER_EVENT,
    [attachments, uploadingFiles],
  );

  const uploadFile = useCallback(
    async (file: File, uploadId: string) => {
      const resolvedEventId = eventId ?? "draft";
      const path = buildStoragePath(guildId, resolvedEventId, file.name);

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadId ? { ...f, status: "uploading" as const } : f,
        ),
      );

      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file);

      if (error || !data) {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadId
              ? { ...f, status: "error" as const, error: error?.message ?? "アップロードに失敗しました" }
              : f,
          ),
        );
        return;
      }

      const meta: AttachmentMeta = {
        name: file.name,
        path: data.path,
        type: file.type,
        size: file.size,
      };

      setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
      setAttachments((prev) => [...prev, meta]);
    },
    [guildId, eventId],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const currentCount = attachments.length + uploadingFiles.filter(
        (f) => f.status === "pending" || f.status === "uploading",
      ).length;

      const { valid, errors: validationErrors } = validateFiles(fileArray, currentCount);
      setErrors(validationErrors);

      if (valid.length === 0) {
        return;
      }

      const newUploading: UploadingFile[] = valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploading]);

      for (const uploading of newUploading) {
        uploadFile(uploading.file, uploading.id);
      }
    },
    [attachments, uploadingFiles, uploadFile],
  );

  const removeAttachment = useCallback((path: string) => {
    setAttachments((prev) => prev.filter((a) => a.path !== path));
    setPendingDeletions((prev) => [...prev, path]);
  }, []);

  return {
    attachments,
    uploadingFiles,
    addFiles,
    removeAttachment,
    pendingDeletions,
    isUploading,
    isAtLimit,
    errors,
  };
}
