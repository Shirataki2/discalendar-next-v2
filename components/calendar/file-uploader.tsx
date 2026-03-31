"use client";

/**
 * FileUploader - ファイルアップロードコンポーネント
 *
 * Task 3.2: FileUploaderコンポーネントの実装
 * - ドラッグ&ドロップゾーンとファイル選択ボタン
 * - アップロード中のプログレスバー表示
 * - アップロード済みファイルのサムネイル/名前と削除ボタン
 * - 件数上限到達時のUI無効化
 * - 削除確認UI
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 7.1, 7.3
 */

import {
  FileIcon,
  ImageIcon,
  Paperclip,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFileUpload } from "@/hooks/calendar/use-file-upload";
import type {
  AttachmentMeta,
  UploadingFile,
} from "@/lib/calendar/attachment-types";
import {
  ATTACHMENT_LIMITS,
  formatFileSize,
  isImageType,
} from "@/lib/calendar/attachment-types";

export type FileUploaderProps = {
  guildId: string;
  eventId?: string;
  existingAttachments?: AttachmentMeta[];
  onAttachmentsChange: (attachments: AttachmentMeta[]) => void;
  onPendingDeletionsChange: (paths: string[]) => void;
  onCleanupReady?: (cleanup: () => Promise<void>) => void;
  disabled?: boolean;
};

export function FileUploader({
  guildId,
  eventId,
  existingAttachments,
  onAttachmentsChange,
  onPendingDeletionsChange,
  onCleanupReady,
  disabled = false,
}: FileUploaderProps) {
  const {
    attachments,
    uploadingFiles,
    addFiles,
    removeAttachment,
    cleanup,
    pendingDeletions,
    isAtLimit,
    errors,
  } = useFileUpload({ guildId, eventId, existingAttachments });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(
    null
  );

  useEffect(() => {
    onAttachmentsChange(attachments);
  }, [attachments, onAttachmentsChange]);

  useEffect(() => {
    onPendingDeletionsChange(pendingDeletions);
  }, [pendingDeletions, onPendingDeletionsChange]);

  useEffect(() => {
    onCleanupReady?.(cleanup);
  }, [cleanup, onCleanupReady]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [addFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!(disabled || isAtLimit)) {
        setIsDragging(true);
      }
    },
    [disabled, isAtLimit]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!(disabled || isAtLimit) && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [disabled, isAtLimit, addFiles]
  );

  const handleDeleteClick = useCallback((path: string) => {
    setConfirmDeletePath(path);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (confirmDeletePath) {
      removeAttachment(confirmDeletePath);
      setConfirmDeletePath(null);
    }
  }, [confirmDeletePath, removeAttachment]);

  const handleDeleteCancel = useCallback(() => {
    setConfirmDeletePath(null);
  }, []);

  const isDropzoneDisabled = disabled || isAtLimit;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <Label>添付ファイル</Label>
      </div>

      {isAtLimit ? (
        <p className="text-muted-foreground text-sm">
          添付ファイルは最大{ATTACHMENT_LIMITS.MAX_FILES_PER_EVENT}件までです
        </p>
      ) : (
        <DropZone
          disabled={isDropzoneDisabled}
          fileInputRef={fileInputRef}
          isDragging={isDragging}
          onChange={handleFileChange}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      )}

      {errors.map((error) => (
        <p className="text-destructive text-sm" key={error}>
          {error}
        </p>
      ))}

      {uploadingFiles.length > 0 && (
        <ul className="space-y-2">
          {uploadingFiles.map((file) => (
            <UploadingFileItem file={file} key={file.id} />
          ))}
        </ul>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <AttachmentItem
              attachment={attachment}
              confirmDeletePath={confirmDeletePath}
              key={attachment.path}
              onDeleteCancel={handleDeleteCancel}
              onDeleteClick={handleDeleteClick}
              onDeleteConfirm={handleDeleteConfirm}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DropZone({
  isDragging,
  disabled,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onChange,
}: {
  isDragging: boolean;
  disabled: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const acceptTypes = ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES.join(",");

  function getClassName() {
    if (isDragging) {
      return "border-primary bg-primary/5";
    }
    if (disabled) {
      return "cursor-not-allowed border-muted bg-muted/50 opacity-60";
    }
    return "cursor-pointer border-muted-foreground/25 hover:border-primary/50";
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ドロップゾーンにはdragイベントハンドラが必要
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: ドロップゾーンのdrag操作
    <div
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${getClassName()}`}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
      <p className="text-center text-muted-foreground text-sm">
        ドラッグ&ドロップまたは
        <button
          className="mx-1 font-medium text-primary underline-offset-4 hover:underline"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          ファイルを選択
        </button>
      </p>
      <p className="mt-1 text-muted-foreground/70 text-xs">
        JPG, PNG, GIF, WebP, PDF（最大10MB）
      </p>
      <input
        accept={acceptTypes}
        className="hidden"
        disabled={disabled}
        multiple
        onChange={onChange}
        ref={fileInputRef}
        type="file"
      />
    </div>
  );
}

function UploadingFileItem({ file }: { file: UploadingFile }) {
  const icon = isImageType(file.file.type) ? (
    <ImageIcon className="h-4 w-4 text-muted-foreground" />
  ) : (
    <FileIcon className="h-4 w-4 text-muted-foreground" />
  );

  const isPending = file.status === "uploading" || file.status === "pending";

  return (
    <li className="flex items-center gap-3 rounded-md border p-2">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{file.file.name}</p>
        {isPending ? (
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
        ) : null}
        {file.status === "error" ? (
          <p className="text-destructive text-xs">{file.error}</p>
        ) : null}
      </div>
      {isPending ? (
        <span className="text-muted-foreground text-xs">アップロード中...</span>
      ) : null}
    </li>
  );
}

function AttachmentItem({
  attachment,
  confirmDeletePath,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  attachment: AttachmentMeta;
  confirmDeletePath: string | null;
  onDeleteClick: (path: string) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const isConfirming = confirmDeletePath === attachment.path;
  const icon = isImageType(attachment.type) ? (
    <ImageIcon className="h-4 w-4 text-muted-foreground" />
  ) : (
    <FileIcon className="h-4 w-4 text-muted-foreground" />
  );

  return (
    <li className="flex items-center gap-3 rounded-md border p-2">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{attachment.name}</p>
        <p className="text-muted-foreground text-xs">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      {isConfirming ? (
        <div className="flex items-center gap-1">
          <span className="text-destructive text-xs">削除しますか？</span>
          <Button
            aria-label="はい"
            onClick={onDeleteConfirm}
            size="sm"
            type="button"
            variant="destructive"
          >
            はい
          </Button>
          <Button
            aria-label="キャンセル"
            onClick={onDeleteCancel}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          aria-label={`${attachment.name}を削除`}
          onClick={() => onDeleteClick(attachment.path)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </li>
  );
}
