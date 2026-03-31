"use client";

/**
 * AttachmentDisplay - 添付ファイル表示コンポーネント
 *
 * Task 4.1: AttachmentDisplay・ImageLightboxコンポーネントの実装
 * - 画像ファイルのサムネイルグリッド表示
 * - PDFファイルのダウンロードリンク表示
 * - 画像クリックで拡大表示（ライトボックス）
 * - 添付ファイルなしの場合はセクション非表示
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Download, FileText, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AttachmentMeta } from "@/lib/calendar/attachment-types";
import { formatFileSize, isImageType } from "@/lib/calendar/attachment-types";

/** Signed URL付き添付ファイル */
export type AttachmentWithUrl = AttachmentMeta & {
  signedUrl: string;
};

export type AttachmentDisplayProps = {
  attachments: AttachmentWithUrl[];
};

export function AttachmentDisplay({ attachments }: AttachmentDisplayProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState<string>("");

  if (attachments.length === 0) {
    return null;
  }

  const images = attachments.filter((a) => isImageType(a.type));
  const pdfs = attachments.filter((a) => !isImageType(a.type));

  function handleImageClick(url: string, name: string) {
    setLightboxUrl(url);
    setLightboxName(name);
  }

  function handleCloseLightbox() {
    setLightboxUrl(null);
    setLightboxName("");
  }

  return (
    <div className="space-y-3">
      {/* 画像サムネイルグリッド */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <button
              className="group relative aspect-square overflow-hidden rounded-md border"
              key={img.path}
              onClick={() => handleImageClick(img.signedUrl, img.name)}
              type="button"
            >
              {/* biome-ignore lint/performance/noImgElement: Signed URLの外部画像なのでNext.js Imageは使用不可 */}
              {/* biome-ignore lint/correctness/useImageSize: サムネイルはCSS aspect-squareで制御 */}
              <img
                alt={img.name}
                className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
                src={img.signedUrl}
              />
            </button>
          ))}
        </div>
      )}

      {/* PDFダウンロードリンク */}
      {pdfs.length > 0 && (
        <div className="space-y-1.5">
          {pdfs.map((pdf) => (
            <a
              className="flex items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-muted"
              href={pdf.signedUrl}
              key={pdf.path}
              rel="noopener noreferrer"
              target="_blank"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{pdf.name}</span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {formatFileSize(pdf.size)}
              </span>
              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}

      {/* ライトボックス */}
      <ImageLightbox
        name={lightboxName}
        onClose={handleCloseLightbox}
        open={lightboxUrl !== null}
        url={lightboxUrl ?? ""}
      />
    </div>
  );
}

function ImageLightbox({
  open,
  url,
  name,
  onClose,
}: {
  open: boolean;
  url: string;
  name: string;
  onClose: () => void;
}) {
  return (
    <Dialog onOpenChange={(v) => !v && onClose()} open={open}>
      <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <DialogDescription className="sr-only">
          添付画像の拡大表示
        </DialogDescription>
        <div className="relative">
          <Button
            aria-label="閉じる"
            className="absolute top-2 right-2 z-10 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-5 w-5" />
          </Button>
          {/* biome-ignore lint/performance/noImgElement: Signed URLの外部画像 */}
          {/* biome-ignore lint/correctness/useImageSize: ライトボックスはw-fullで制御 */}
          {url ? (
            <img alt={name} className="w-full rounded-lg" src={url} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
