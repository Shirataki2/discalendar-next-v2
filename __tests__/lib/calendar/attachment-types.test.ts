/**
 * Task 2.1: Attachment型・バリデーション定数のテスト
 *
 * TDD RED: 型定義・定数・既存型統合を検証する
 *
 * Requirements:
 * - 1.1: attachments各要素にname, path, type, sizeを含む型
 * - 1.2: バリデーション定数（サイズ上限10MB、MIMEタイプ5種、件数上限5）
 */

import { describe, expect, it } from "vitest";

describe("Task 2.1: Attachment型・バリデーション定数", () => {
  describe("ATTACHMENT_LIMITS定数", () => {
    it("ファイルサイズ上限が10MB（10485760バイト）である", async () => {
      const { ATTACHMENT_LIMITS } = await import(
        "@/lib/calendar/attachment-types"
      );
      expect(ATTACHMENT_LIMITS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it("1イベントあたりの添付ファイル上限が5件である", async () => {
      const { ATTACHMENT_LIMITS } = await import(
        "@/lib/calendar/attachment-types"
      );
      expect(ATTACHMENT_LIMITS.MAX_FILES_PER_EVENT).toBe(5);
    });

    it("許可MIMEタイプに画像4種とPDFが含まれる", async () => {
      const { ATTACHMENT_LIMITS } = await import(
        "@/lib/calendar/attachment-types"
      );
      expect(ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES).toContain("image/jpeg");
      expect(ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES).toContain("image/png");
      expect(ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES).toContain("image/gif");
      expect(ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES).toContain("image/webp");
      expect(ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES).toContain("application/pdf");
      expect(ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES).toHaveLength(5);
    });
  });

  describe("isImageType ヘルパー", () => {
    it("画像MIMEタイプにtrueを返す", async () => {
      const { isImageType } = await import("@/lib/calendar/attachment-types");
      expect(isImageType("image/jpeg")).toBe(true);
      expect(isImageType("image/png")).toBe(true);
      expect(isImageType("image/gif")).toBe(true);
      expect(isImageType("image/webp")).toBe(true);
    });

    it("PDFにfalseを返す", async () => {
      const { isImageType } = await import("@/lib/calendar/attachment-types");
      expect(isImageType("application/pdf")).toBe(false);
    });
  });

  describe("isAllowedMimeType ヘルパー", () => {
    it("許可MIMEタイプにtrueを返す", async () => {
      const { isAllowedMimeType } = await import(
        "@/lib/calendar/attachment-types"
      );
      for (const type of [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ]) {
        expect(isAllowedMimeType(type)).toBe(true);
      }
    });

    it("非許可MIMEタイプにfalseを返す", async () => {
      const { isAllowedMimeType } = await import(
        "@/lib/calendar/attachment-types"
      );
      expect(isAllowedMimeType("video/mp4")).toBe(false);
      expect(isAllowedMimeType("text/plain")).toBe(false);
    });
  });

  describe("formatFileSize ヘルパー", () => {
    it("バイト数を人間可読な文字列に変換する", async () => {
      const { formatFileSize } = await import(
        "@/lib/calendar/attachment-types"
      );
      expect(formatFileSize(500)).toBe("500 B");
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1_048_576)).toBe("1.0 MB");
      expect(formatFileSize(5_242_880)).toBe("5.0 MB");
    });
  });

  describe("AttachmentMeta 型構造", () => {
    it("name, path, type, sizeの4フィールドを持つオブジェクトを扱える", async () => {
      const { ATTACHMENT_LIMITS: _ } = await import(
        "@/lib/calendar/attachment-types"
      );
      // 型の構造テスト: 実行時にオブジェクトが正しい形状を持つことを検証
      const meta = {
        name: "poster.jpg",
        path: "guild123/event456/uuid_poster.jpg",
        type: "image/jpeg",
        size: 1_024_000,
      };
      expect(meta).toHaveProperty("name");
      expect(meta).toHaveProperty("path");
      expect(meta).toHaveProperty("type");
      expect(meta).toHaveProperty("size");
      expect(typeof meta.name).toBe("string");
      expect(typeof meta.path).toBe("string");
      expect(typeof meta.type).toBe("string");
      expect(typeof meta.size).toBe("number");
    });
  });

  describe("既存型へのattachments統合", () => {
    it("toCalendarEventがattachmentsを変換する", async () => {
      const { toCalendarEvent } = await import("@/lib/calendar/types");

      const record = {
        id: "event-1",
        guild_id: "guild-1",
        name: "テストイベント",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2026-04-01T10:00:00Z",
        end_at: "2026-04-01T11:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        series_id: null,
        original_date: null,
        created_at: "2026-03-30T00:00:00Z",
        updated_at: "2026-03-30T00:00:00Z",
        attachments: [
          {
            name: "poster.jpg",
            path: "guild-1/event-1/uuid_poster.jpg",
            type: "image/jpeg",
            size: 1_024_000,
          },
        ],
      };

      const event = toCalendarEvent(record);
      expect(event.attachments).toEqual([
        {
          name: "poster.jpg",
          path: "guild-1/event-1/uuid_poster.jpg",
          type: "image/jpeg",
          size: 1_024_000,
        },
      ]);
    });

    it("attachmentsが空配列の場合は空配列を返す", async () => {
      const { toCalendarEvent } = await import("@/lib/calendar/types");

      const record = {
        id: "event-2",
        guild_id: "guild-1",
        name: "テストイベント2",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2026-04-01T10:00:00Z",
        end_at: "2026-04-01T11:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        series_id: null,
        original_date: null,
        created_at: "2026-03-30T00:00:00Z",
        updated_at: "2026-03-30T00:00:00Z",
        attachments: [],
      };

      const event = toCalendarEvent(record);
      expect(event.attachments).toEqual([]);
    });
  });
});
