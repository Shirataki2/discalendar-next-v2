/**
 * Task 3.1: useFileUpload フックのユニットテスト
 *
 * TDD RED: バリデーション・状態管理・アップロード操作を検証する
 *
 * Requirements:
 * - 4.3: ファイル選択時のプレビュー表示
 * - 4.4: アップロード進捗表示
 * - 4.5: アップロード完了後に一覧追加
 * - 5.1: ファイルサイズ上限（10MB）
 * - 5.2: MIMEタイプ制限
 * - 5.3: 1イベント最大5件
 * - 5.4: 上限到達時の無効化
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttachmentMeta } from "@/lib/calendar/attachment-types";
import { ATTACHMENT_LIMITS } from "@/lib/calendar/attachment-types";

// Supabase client mock
const mockUpload = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  }),
}));

// crypto.randomUUID mock
vi.stubGlobal("crypto", {
  ...globalThis.crypto,
  randomUUID: () => "test-uuid-1234",
});

function createFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("Task 3.1: useFileUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ data: { path: "mock-path" }, error: null });
  });

  describe("初期状態", () => {
    it("初期状態では空の添付ファイルとアップロード中ファイルを返す", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      const { result } = renderHook(() => useFileUpload({ guildId: "g1" }));

      expect(result.current.attachments).toEqual([]);
      expect(result.current.uploadingFiles).toEqual([]);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.isAtLimit).toBe(false);
      expect(result.current.errors).toEqual([]);
      expect(result.current.pendingDeletions).toEqual([]);
    });

    it("既存添付ファイルを初期値として設定できる", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      const existing: AttachmentMeta[] = [
        {
          name: "img.jpg",
          path: "g1/e1/uuid_img.jpg",
          type: "image/jpeg",
          size: 1024,
        },
      ];

      const { result } = renderHook(() =>
        useFileUpload({
          guildId: "g1",
          eventId: "e1",
          existingAttachments: existing,
        })
      );

      expect(result.current.attachments).toEqual(existing);
    });
  });

  describe("Req 5.1: ファイルサイズバリデーション", () => {
    it("10MBを超えるファイルを拒否する", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      const { result } = renderHook(() => useFileUpload({ guildId: "g1" }));

      const oversizedFile = createFile(
        "big.jpg",
        ATTACHMENT_LIMITS.MAX_FILE_SIZE + 1,
        "image/jpeg"
      );

      act(() => {
        result.current.addFiles([oversizedFile]);
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.errors[0]).toContain("10MB");
      expect(result.current.uploadingFiles).toHaveLength(0);
    });

    it("10MB以下のファイルは受け付ける", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      const { result } = renderHook(() =>
        useFileUpload({ guildId: "g1", eventId: "e1" })
      );

      const validFile = createFile("ok.jpg", 1024, "image/jpeg");

      act(() => {
        result.current.addFiles([validFile]);
      });

      expect(result.current.errors).toEqual([]);
      expect(result.current.uploadingFiles.length).toBeGreaterThan(0);
    });
  });

  describe("Req 5.2: MIMEタイプバリデーション", () => {
    it("許可されていないMIMEタイプを拒否する", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      const { result } = renderHook(() => useFileUpload({ guildId: "g1" }));

      const invalidFile = createFile("doc.txt", 100, "text/plain");

      act(() => {
        result.current.addFiles([invalidFile]);
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.errors[0]).toContain("対応していないファイル形式");
    });

    for (const mimeType of ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES) {
      it(`${mimeType} を許可する`, async () => {
        const { useFileUpload } = await import(
          "@/hooks/calendar/use-file-upload"
        );
        const { result } = renderHook(() =>
          useFileUpload({ guildId: "g1", eventId: "e1" })
        );

        const file = createFile("file.test", 100, mimeType);

        act(() => {
          result.current.addFiles([file]);
        });

        expect(result.current.errors).toEqual([]);
      });
    }
  });

  describe("Req 5.3: 件数上限バリデーション", () => {
    it("既存+新規で5件を超える場合にエラーを返す", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      const existing: AttachmentMeta[] = Array.from({ length: 4 }, (_, i) => ({
        name: `img${i}.jpg`,
        path: `g1/e1/uuid_img${i}.jpg`,
        type: "image/jpeg",
        size: 100,
      }));

      const { result } = renderHook(() =>
        useFileUpload({
          guildId: "g1",
          eventId: "e1",
          existingAttachments: existing,
        })
      );

      const files = [
        createFile("new1.jpg", 100, "image/jpeg"),
        createFile("new2.jpg", 100, "image/jpeg"),
      ];

      act(() => {
        result.current.addFiles(files);
      });

      expect(result.current.errors.length).toBeGreaterThan(0);
      expect(result.current.errors[0]).toContain("最大5件");
    });
  });

  describe("Req 5.4: 件数上限到達判定", () => {
    it("5件に達するとisAtLimitがtrueになる", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      const existing: AttachmentMeta[] = Array.from({ length: 5 }, (_, i) => ({
        name: `img${i}.jpg`,
        path: `g1/e1/uuid_img${i}.jpg`,
        type: "image/jpeg",
        size: 100,
      }));

      const { result } = renderHook(() =>
        useFileUpload({
          guildId: "g1",
          eventId: "e1",
          existingAttachments: existing,
        })
      );

      expect(result.current.isAtLimit).toBe(true);
    });
  });

  describe("Req 4.3-4.5: アップロード処理", () => {
    it("ファイル追加後にuploadingFilesにpending状態で追加される", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      // アップロードを遅延させる（resolveしないPromise）
      mockUpload.mockReturnValue(
        new Promise((_resolve) => {
          /* 意図的に未解決 */
        })
      );

      const { result } = renderHook(() =>
        useFileUpload({ guildId: "g1", eventId: "e1" })
      );

      const file = createFile("photo.jpg", 500, "image/jpeg");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(result.current.uploadingFiles).toHaveLength(1);
      expect(result.current.uploadingFiles[0].file).toBe(file);
      expect(result.current.uploadingFiles[0].status).toMatch(
        /pending|uploading/
      );
    });

    it("アップロード成功後にattachmentsにメタデータが追加される", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      mockUpload.mockResolvedValue({
        data: { path: "g1/e1/test-uuid-1234_photo.jpg" },
        error: null,
      });

      const { result } = renderHook(() =>
        useFileUpload({ guildId: "g1", eventId: "e1" })
      );

      const file = createFile("photo.jpg", 500, "image/jpeg");

      // biome-ignore lint/suspicious/useAwait: act内の状態更新を待機するためasyncが必要
      await act(async () => {
        result.current.addFiles([file]);
      });

      expect(result.current.attachments).toHaveLength(1);
      expect(result.current.attachments[0].name).toBe("photo.jpg");
      expect(result.current.attachments[0].type).toBe("image/jpeg");
      expect(result.current.attachments[0].size).toBe(500);
    });

    it("アップロード失敗時にerror状態になる", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: "Upload failed" },
      });

      const { result } = renderHook(() =>
        useFileUpload({ guildId: "g1", eventId: "e1" })
      );

      const file = createFile("fail.jpg", 500, "image/jpeg");

      // biome-ignore lint/suspicious/useAwait: act内の状態更新を待機するためasyncが必要
      await act(async () => {
        result.current.addFiles([file]);
      });

      const failedFile = result.current.uploadingFiles.find(
        (f) => f.status === "error"
      );
      expect(failedFile).toBeDefined();
      expect(failedFile?.error).toBeDefined();
    });

    it("アップロード中はisUploadingがtrueになる", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      let resolveUpload: ((value: unknown) => void) | undefined;
      mockUpload.mockReturnValue(
        new Promise((resolve) => {
          resolveUpload = resolve;
        })
      );

      const { result } = renderHook(() =>
        useFileUpload({ guildId: "g1", eventId: "e1" })
      );

      const file = createFile("photo.jpg", 500, "image/jpeg");

      act(() => {
        result.current.addFiles([file]);
      });

      expect(result.current.isUploading).toBe(true);

      // biome-ignore lint/suspicious/useAwait: act内でPromise解決を待機するためasyncが必要
      await act(async () => {
        resolveUpload?.({
          data: { path: "g1/e1/test-uuid-1234_photo.jpg" },
          error: null,
        });
      });

      expect(result.current.isUploading).toBe(false);
    });
  });

  describe("Req 7.1: 添付ファイル削除", () => {
    it("removeAttachmentでattachmentsから除外される", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      const existing: AttachmentMeta[] = [
        {
          name: "a.jpg",
          path: "g1/e1/uuid_a.jpg",
          type: "image/jpeg",
          size: 100,
        },
        {
          name: "b.pdf",
          path: "g1/e1/uuid_b.pdf",
          type: "application/pdf",
          size: 200,
        },
      ];

      const { result } = renderHook(() =>
        useFileUpload({
          guildId: "g1",
          eventId: "e1",
          existingAttachments: existing,
        })
      );

      act(() => {
        result.current.removeAttachment("g1/e1/uuid_a.jpg");
      });

      expect(result.current.attachments).toHaveLength(1);
      expect(result.current.attachments[0].name).toBe("b.pdf");
    });

    it("削除されたパスがpendingDeletionsに記録される", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      const existing: AttachmentMeta[] = [
        {
          name: "a.jpg",
          path: "g1/e1/uuid_a.jpg",
          type: "image/jpeg",
          size: 100,
        },
      ];

      const { result } = renderHook(() =>
        useFileUpload({
          guildId: "g1",
          eventId: "e1",
          existingAttachments: existing,
        })
      );

      act(() => {
        result.current.removeAttachment("g1/e1/uuid_a.jpg");
      });

      expect(result.current.pendingDeletions).toContain("g1/e1/uuid_a.jpg");
    });

    it("削除後にisAtLimitが更新される", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      const existing: AttachmentMeta[] = Array.from({ length: 5 }, (_, i) => ({
        name: `img${i}.jpg`,
        path: `g1/e1/uuid_img${i}.jpg`,
        type: "image/jpeg",
        size: 100,
      }));

      const { result } = renderHook(() =>
        useFileUpload({
          guildId: "g1",
          eventId: "e1",
          existingAttachments: existing,
        })
      );

      expect(result.current.isAtLimit).toBe(true);

      act(() => {
        result.current.removeAttachment("g1/e1/uuid_img0.jpg");
      });

      expect(result.current.isAtLimit).toBe(false);
    });
  });

  describe("複合バリデーション", () => {
    it("有効なファイルと無効なファイルを同時に追加した場合、有効なもののみ処理する", async () => {
      const { useFileUpload } = await import(
        "@/hooks/calendar/use-file-upload"
      );
      mockUpload.mockResolvedValue({
        data: { path: "g1/e1/test-uuid-1234_ok.jpg" },
        error: null,
      });

      const { result } = renderHook(() =>
        useFileUpload({ guildId: "g1", eventId: "e1" })
      );

      const validFile = createFile("ok.jpg", 100, "image/jpeg");
      const invalidFile = createFile("bad.txt", 100, "text/plain");

      // biome-ignore lint/suspicious/useAwait: act内の状態更新を待機するためasyncが必要
      await act(async () => {
        result.current.addFiles([validFile, invalidFile]);
      });

      // 有効なファイルはアップロードされる
      expect(result.current.attachments.length).toBeGreaterThanOrEqual(1);
      // エラーメッセージが表示される
      expect(result.current.errors.length).toBeGreaterThan(0);
    });
  });
});
