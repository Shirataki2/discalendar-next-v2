/**
 * 添付ファイル型定義・バリデーション定数
 *
 * Task 2.1: AttachmentMeta型、UploadingFile型、ATTACHMENT_LIMITS定数の定義
 *
 * Requirements: 1.1, 1.2, 5.1, 5.2, 5.3
 */

/** 添付ファイルメタデータ（DB JSONB要素に対応） */
export interface AttachmentMeta {
  /** 元のファイル名 */
  name: string;
  /** Storageパス: {guild_id}/{event_id}/{uuid}_{filename} */
  path: string;
  /** MIMEタイプ */
  type: string;
  /** バイト数 */
  size: number;
}

/** アップロード中のファイル状態 */
export interface UploadingFile {
  /** クライアント生成UUID */
  id: string;
  /** Fileオブジェクト */
  file: File;
  /** 0-100 */
  progress: number;
  /** アップロードステータス */
  status: "pending" | "uploading" | "completed" | "error";
  /** エラーメッセージ */
  error?: string;
  /** アップロード完了後に設定されるメタデータ */
  meta?: AttachmentMeta;
}

/** バリデーション定数 */
export const ATTACHMENT_LIMITS = {
  /** ファイルサイズ上限（10MB） */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  /** 1イベントあたりの添付ファイル上限 */
  MAX_FILES_PER_EVENT: 5,
  /** 許可MIMEタイプ */
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ] as const,
} as const;

/** 許可MIMEタイプの型 */
export type AllowedMimeType =
  (typeof ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES)[number];

/** MIMEタイプが画像かどうか判定する */
export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/** MIMEタイプが許可リストに含まれるか判定する */
export function isAllowedMimeType(mimeType: string): boolean {
  return (ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(
    mimeType,
  );
}

/** Signed URL付き添付ファイル */
export type AttachmentWithUrl = AttachmentMeta & {
  signedUrl: string;
};

/** バイト数を人間可読な文字列に変換する */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
