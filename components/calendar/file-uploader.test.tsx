/**
 * Task 3.2: FileUploader コンポーネントのテスト
 *
 * TDD RED: ファイル選択→プレビュー→削除のUI操作を検証する
 *
 * Requirements:
 * - 4.1: アップロード領域の表示
 * - 4.2: 既存添付ファイル一覧の表示
 * - 4.3: ファイル選択時のプレビュー
 * - 4.5: アップロード済みファイルの一覧追加
 * - 5.4: 上限到達時の無効化
 * - 7.1: 削除ボタンで一覧から除外
 * - 7.3: 削除確認UI
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileUploader } from "@/components/calendar/file-uploader";
import { useFileUpload } from "@/hooks/calendar/use-file-upload";
import type { AttachmentMeta } from "@/lib/calendar/attachment-types";
import { ATTACHMENT_LIMITS } from "@/lib/calendar/attachment-types";

// useFileUpload mock
const mockAddFiles = vi.fn();
const mockRemoveAttachment = vi.fn();

vi.mock("@/hooks/calendar/use-file-upload", () => ({
  useFileUpload: vi.fn().mockImplementation(({ existingAttachments }) => ({
    attachments: existingAttachments ?? [],
    uploadingFiles: [],
    addFiles: mockAddFiles,
    removeAttachment: mockRemoveAttachment,
    cleanup: vi.fn(),
    pendingDeletions: [],
    isUploading: false,
    isAtLimit: false,
    errors: [],
  })),
}));

const mockUseFileUpload = vi.mocked(useFileUpload);

const defaultProps = {
  guildId: "g1",
  onAttachmentsChange: vi.fn(),
  onPendingDeletionsChange: vi.fn(),
};

describe("Task 3.2: FileUploader", () => {
  describe("Req 4.1: アップロード領域", () => {
    it("ドロップゾーンとファイル選択ボタンを表示する", () => {
      render(<FileUploader {...defaultProps} />);

      expect(screen.getByText("ファイルを選択")).toBeInTheDocument();
    });

    it("許可ファイル形式の説明を表示する", () => {
      render(<FileUploader {...defaultProps} />);

      expect(screen.getByText(/JPG.*PNG.*GIF.*WebP.*PDF/i)).toBeInTheDocument();
    });
  });

  describe("Req 4.2: 既存添付ファイルの表示", () => {
    it("既存の画像添付ファイルをサムネイルで表示する", () => {
      const existing: AttachmentMeta[] = [
        {
          name: "photo.jpg",
          path: "g1/e1/uuid_photo.jpg",
          type: "image/jpeg",
          size: 1024,
        },
      ];

      mockUseFileUpload.mockReturnValue({
        attachments: existing,
        uploadingFiles: [],
        addFiles: mockAddFiles,
        removeAttachment: mockRemoveAttachment,
        cleanup: vi.fn(),
        pendingDeletions: [],
        isUploading: false,
        isAtLimit: false,
        errors: [],
      });

      render(
        <FileUploader
          {...defaultProps}
          eventId="e1"
          existingAttachments={existing}
        />
      );

      expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });

    it("既存のPDFファイルをファイル名で表示する", () => {
      const existing: AttachmentMeta[] = [
        {
          name: "doc.pdf",
          path: "g1/e1/uuid_doc.pdf",
          type: "application/pdf",
          size: 2048,
        },
      ];

      mockUseFileUpload.mockReturnValue({
        attachments: existing,
        uploadingFiles: [],
        addFiles: mockAddFiles,
        removeAttachment: mockRemoveAttachment,
        cleanup: vi.fn(),
        pendingDeletions: [],
        isUploading: false,
        isAtLimit: false,
        errors: [],
      });

      render(
        <FileUploader
          {...defaultProps}
          eventId="e1"
          existingAttachments={existing}
        />
      );

      expect(screen.getByText("doc.pdf")).toBeInTheDocument();
    });
  });

  describe("Req 4.3: ファイル選択", () => {
    it("ファイル入力のaccept属性が許可MIMEタイプに設定されている", () => {
      render(<FileUploader {...defaultProps} />);

      const input = document.querySelector('input[type="file"]');
      expect(input).not.toBeNull();
      expect(input?.getAttribute("accept")).toBe(
        ATTACHMENT_LIMITS.ALLOWED_MIME_TYPES.join(",")
      );
    });

    it("ファイル選択時にaddFilesが呼ばれる", async () => {
      const user = userEvent.setup();
      render(<FileUploader {...defaultProps} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });

      await user.upload(input, file);

      expect(mockAddFiles).toHaveBeenCalled();
    });
  });

  describe("Req 5.4: 上限到達時の無効化", () => {
    it("isAtLimit時にアップロード領域が無効化される", () => {
      mockUseFileUpload.mockReturnValue({
        attachments: Array.from({ length: 5 }, (_, i) => ({
          name: `img${i}.jpg`,
          path: `g1/e1/uuid_img${i}.jpg`,
          type: "image/jpeg",
          size: 100,
        })),
        uploadingFiles: [],
        addFiles: mockAddFiles,
        removeAttachment: mockRemoveAttachment,
        cleanup: vi.fn(),
        pendingDeletions: [],
        isUploading: false,
        isAtLimit: true,
        errors: [],
      });

      render(<FileUploader {...defaultProps} />);

      expect(screen.getByText(/最大5件/)).toBeInTheDocument();
    });
  });

  describe("Req 7.1, 7.3: 添付ファイル削除", () => {
    it("削除ボタンをクリックすると確認UIが表示される", async () => {
      const user = userEvent.setup();
      const existing: AttachmentMeta[] = [
        {
          name: "photo.jpg",
          path: "g1/e1/uuid_photo.jpg",
          type: "image/jpeg",
          size: 1024,
        },
      ];

      mockUseFileUpload.mockReturnValue({
        attachments: existing,
        uploadingFiles: [],
        addFiles: mockAddFiles,
        removeAttachment: mockRemoveAttachment,
        cleanup: vi.fn(),
        pendingDeletions: [],
        isUploading: false,
        isAtLimit: false,
        errors: [],
      });

      render(<FileUploader {...defaultProps} />);

      const deleteButton = screen.getByRole("button", {
        name: /photo\.jpg.*削除/,
      });
      await user.click(deleteButton);

      // 確認UIが表示される
      expect(screen.getByText(/削除しますか/)).toBeInTheDocument();
    });

    it("確認UIで削除を確定するとremoveAttachmentが呼ばれる", async () => {
      const user = userEvent.setup();
      const existing: AttachmentMeta[] = [
        {
          name: "photo.jpg",
          path: "g1/e1/uuid_photo.jpg",
          type: "image/jpeg",
          size: 1024,
        },
      ];

      mockUseFileUpload.mockReturnValue({
        attachments: existing,
        uploadingFiles: [],
        addFiles: mockAddFiles,
        removeAttachment: mockRemoveAttachment,
        cleanup: vi.fn(),
        pendingDeletions: [],
        isUploading: false,
        isAtLimit: false,
        errors: [],
      });

      render(<FileUploader {...defaultProps} />);

      const deleteButton = screen.getByRole("button", {
        name: /photo\.jpg.*削除/,
      });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole("button", { name: /確定|はい/ });
      await user.click(confirmButton);

      expect(mockRemoveAttachment).toHaveBeenCalledWith("g1/e1/uuid_photo.jpg");
    });
  });

  describe("アップロード中の表示", () => {
    it("アップロード中のファイルにインジケーターを表示する", () => {
      mockUseFileUpload.mockReturnValue({
        attachments: [],
        uploadingFiles: [
          {
            id: "u1",
            file: new File(["test"], "uploading.jpg", { type: "image/jpeg" }),
            progress: 50,
            status: "uploading" as const,
          },
        ],
        addFiles: mockAddFiles,
        removeAttachment: mockRemoveAttachment,
        cleanup: vi.fn(),
        pendingDeletions: [],
        isUploading: true,
        isAtLimit: false,
        errors: [],
      });

      render(<FileUploader {...defaultProps} />);

      expect(screen.getByText("uploading.jpg")).toBeInTheDocument();
      expect(screen.getByText("アップロード中...")).toBeInTheDocument();
    });

    it("エラー状態のファイルにエラーメッセージを表示する", () => {
      mockUseFileUpload.mockReturnValue({
        attachments: [],
        uploadingFiles: [
          {
            id: "u1",
            file: new File(["test"], "failed.jpg", { type: "image/jpeg" }),
            progress: 0,
            status: "error" as const,
            error: "アップロードに失敗しました",
          },
        ],
        addFiles: mockAddFiles,
        removeAttachment: mockRemoveAttachment,
        cleanup: vi.fn(),
        pendingDeletions: [],
        isUploading: false,
        isAtLimit: false,
        errors: [],
      });

      render(<FileUploader {...defaultProps} />);

      expect(screen.getByText("failed.jpg")).toBeInTheDocument();
      expect(
        screen.getByText("アップロードに失敗しました")
      ).toBeInTheDocument();
    });
  });

  describe("バリデーションエラー表示", () => {
    it("errorsがある場合にエラーメッセージを表示する", () => {
      mockUseFileUpload.mockReturnValue({
        attachments: [],
        uploadingFiles: [],
        addFiles: mockAddFiles,
        removeAttachment: mockRemoveAttachment,
        cleanup: vi.fn(),
        pendingDeletions: [],
        isUploading: false,
        isAtLimit: false,
        errors: ["ファイルサイズが10MBを超えています"],
      });

      render(<FileUploader {...defaultProps} />);

      expect(
        screen.getByText("ファイルサイズが10MBを超えています")
      ).toBeInTheDocument();
    });
  });

  describe("disabled状態", () => {
    it("disabledがtrueのときファイル入力が無効化される", () => {
      render(<FileUploader {...defaultProps} disabled />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });
});
