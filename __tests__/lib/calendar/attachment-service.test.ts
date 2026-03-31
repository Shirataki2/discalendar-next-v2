/**
 * Task 2.2: attachment-service ユニットテスト
 *
 * TDD RED: Signed URL生成・ファイル削除・パス生成を検証する
 *
 * Requirements:
 * - 2.2: Storageパス構造 {guild_id}/{event_id}/{uuid}_{filename}
 * - 3.1, 3.2, 3.3: Storageアクセス操作
 * - 7.2: ファイル削除
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

/** Supabase Storage モック */
function createMockSupabase() {
  const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockCreateSignedUrls = vi.fn().mockResolvedValue({
    data: [],
    error: null,
  });

  const mockStorage = {
    from: vi.fn().mockReturnValue({
      remove: mockRemove,
      createSignedUrls: mockCreateSignedUrls,
    }),
  };

  return {
    supabase: { storage: mockStorage } as unknown,
    mockStorage,
    mockRemove,
    mockCreateSignedUrls,
  };
}

describe("Task 2.2: attachment-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildStoragePath", () => {
    it("{guild_id}/{event_id}/{uuid}_{filename} 形式のパスを生成する", async () => {
      const { buildStoragePath } = await import(
        "@/lib/calendar/attachment-service"
      );
      const path = buildStoragePath("guild-123", "event-456", "poster.jpg");

      // パス構造を検証
      expect(path).toMatch(/^guild-123\/event-456\/.+_poster\.jpg$/);
    });

    it("UUIDプレフィックスがファイル名の先頭に付与される", async () => {
      const { buildStoragePath } = await import(
        "@/lib/calendar/attachment-service"
      );
      const path = buildStoragePath("g1", "e1", "file.pdf");
      const filename = path.split("/").pop();

      // uuid_filename 形式を検証
      expect(filename).toMatch(/^[a-f0-9-]+_file\.pdf$/);
    });

    it("異なる呼び出しで異なるUUIDが生成される", async () => {
      const { buildStoragePath } = await import(
        "@/lib/calendar/attachment-service"
      );
      const path1 = buildStoragePath("g1", "e1", "file.pdf");
      const path2 = buildStoragePath("g1", "e1", "file.pdf");

      expect(path1).not.toBe(path2);
    });
  });

  describe("createAttachmentService", () => {
    describe("getSignedUrls", () => {
      it("空の添付配列に対して空配列を返す", async () => {
        const { createAttachmentService } = await import(
          "@/lib/calendar/attachment-service"
        );
        const { supabase, mockCreateSignedUrls } = createMockSupabase();
        const service = createAttachmentService(
          supabase as Parameters<typeof createAttachmentService>[0]
        );

        const result = await service.getSignedUrls([]);

        expect(result).toEqual({ success: true, data: [] });
        // 空配列の場合はStorageを呼ばない
        expect(mockCreateSignedUrls).not.toHaveBeenCalled();
      });

      it("添付ファイルに対してSigned URLを生成する", async () => {
        const { createAttachmentService } = await import(
          "@/lib/calendar/attachment-service"
        );
        const { supabase, mockCreateSignedUrls } = createMockSupabase();

        mockCreateSignedUrls.mockResolvedValueOnce({
          data: [
            {
              path: "g1/e1/uuid_poster.jpg",
              signedUrl: "https://signed-url-1",
            },
            { path: "g1/e1/uuid_map.pdf", signedUrl: "https://signed-url-2" },
          ],
          error: null,
        });

        const service = createAttachmentService(
          supabase as Parameters<typeof createAttachmentService>[0]
        );

        const attachments = [
          {
            name: "poster.jpg",
            path: "g1/e1/uuid_poster.jpg",
            type: "image/jpeg",
            size: 1024,
          },
          {
            name: "map.pdf",
            path: "g1/e1/uuid_map.pdf",
            type: "application/pdf",
            size: 2048,
          },
        ];

        const result = await service.getSignedUrls(attachments);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toHaveLength(2);
          expect(result.data[0]).toEqual({
            path: "g1/e1/uuid_poster.jpg",
            signedUrl: "https://signed-url-1",
          });
        }
      });

      it("有効期限1時間（3600秒）でSigned URLを生成する", async () => {
        const { createAttachmentService } = await import(
          "@/lib/calendar/attachment-service"
        );
        const { supabase, mockCreateSignedUrls } = createMockSupabase();

        mockCreateSignedUrls.mockResolvedValueOnce({
          data: [{ path: "g1/e1/uuid_f.jpg", signedUrl: "https://url" }],
          error: null,
        });

        const service = createAttachmentService(
          supabase as Parameters<typeof createAttachmentService>[0]
        );

        await service.getSignedUrls([
          {
            name: "f.jpg",
            path: "g1/e1/uuid_f.jpg",
            type: "image/jpeg",
            size: 100,
          },
        ]);

        expect(mockCreateSignedUrls).toHaveBeenCalledWith(
          ["g1/e1/uuid_f.jpg"],
          3600
        );
      });

      it("Storage APIエラー時にエラー結果を返す", async () => {
        const { createAttachmentService } = await import(
          "@/lib/calendar/attachment-service"
        );
        const { supabase, mockCreateSignedUrls } = createMockSupabase();

        mockCreateSignedUrls.mockResolvedValueOnce({
          data: null,
          error: { message: "Bucket not found" },
        });

        const service = createAttachmentService(
          supabase as Parameters<typeof createAttachmentService>[0]
        );

        const result = await service.getSignedUrls([
          {
            name: "f.jpg",
            path: "g1/e1/uuid_f.jpg",
            type: "image/jpeg",
            size: 100,
          },
        ]);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe("FETCH_FAILED");
        }
      });
    });

    describe("deleteFiles", () => {
      it("空のパス配列に対して即座に成功を返す", async () => {
        const { createAttachmentService } = await import(
          "@/lib/calendar/attachment-service"
        );
        const { supabase, mockRemove } = createMockSupabase();
        const service = createAttachmentService(
          supabase as Parameters<typeof createAttachmentService>[0]
        );

        const result = await service.deleteFiles([]);

        expect(result).toEqual({ success: true, data: undefined });
        expect(mockRemove).not.toHaveBeenCalled();
      });

      it("指定パスのファイルをStorageから削除する", async () => {
        const { createAttachmentService } = await import(
          "@/lib/calendar/attachment-service"
        );
        const { supabase, mockRemove } = createMockSupabase();
        const service = createAttachmentService(
          supabase as Parameters<typeof createAttachmentService>[0]
        );

        const paths = ["g1/e1/uuid_a.jpg", "g1/e1/uuid_b.pdf"];
        await service.deleteFiles(paths);

        expect(mockRemove).toHaveBeenCalledWith(paths);
      });

      it("event-attachmentsバケットを使用する", async () => {
        const { createAttachmentService } = await import(
          "@/lib/calendar/attachment-service"
        );
        const { supabase, mockStorage } = createMockSupabase();
        const service = createAttachmentService(
          supabase as Parameters<typeof createAttachmentService>[0]
        );

        await service.deleteFiles(["g1/e1/uuid_a.jpg"]);

        expect(mockStorage.from).toHaveBeenCalledWith("event-attachments");
      });

      it("Storage APIエラー時にエラー結果を返す", async () => {
        const { createAttachmentService } = await import(
          "@/lib/calendar/attachment-service"
        );
        const { supabase, mockRemove } = createMockSupabase();

        mockRemove.mockResolvedValueOnce({
          data: null,
          error: { message: "Permission denied" },
        });

        const service = createAttachmentService(
          supabase as Parameters<typeof createAttachmentService>[0]
        );

        const result = await service.deleteFiles(["g1/e1/uuid_a.jpg"]);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe("DELETE_FAILED");
        }
      });
    });
  });
});
