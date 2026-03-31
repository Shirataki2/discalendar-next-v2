/**
 * Task 4.1: AttachmentDisplay・ImageLightbox コンポーネントのテスト
 *
 * TDD RED: 画像プレビュー・PDFリンク・空時非表示・ライトボックスを検証する
 *
 * Requirements:
 * - 6.1: 画像ファイルのサムネイルプレビュー表示
 * - 6.2: PDFファイルのダウンロードリンク表示
 * - 6.3: 画像クリックで拡大表示
 * - 6.4: ダウンロードリンクでファイルダウンロード開始
 * - 6.5: 添付ファイルがないとき非表示
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AttachmentDisplay } from "@/components/calendar/attachment-display";
import type { AttachmentWithUrl } from "@/lib/calendar/attachment-types";

function createImageAttachment(
  overrides?: Partial<AttachmentWithUrl>
): AttachmentWithUrl {
  return {
    name: "photo.jpg",
    path: "g1/e1/uuid_photo.jpg",
    type: "image/jpeg",
    size: 1024,
    signedUrl: "https://example.com/photo.jpg",
    ...overrides,
  };
}

function createPdfAttachment(
  overrides?: Partial<AttachmentWithUrl>
): AttachmentWithUrl {
  return {
    name: "doc.pdf",
    path: "g1/e1/uuid_doc.pdf",
    type: "application/pdf",
    size: 2048,
    signedUrl: "https://example.com/doc.pdf",
    ...overrides,
  };
}

describe("Task 4.1: AttachmentDisplay", () => {
  describe("Req 6.5: 添付ファイルなしの場合", () => {
    it("添付ファイルが空配列の場合、何もレンダリングしない", () => {
      const { container } = render(<AttachmentDisplay attachments={[]} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Req 6.1: 画像ファイルのサムネイル表示", () => {
    it("画像添付ファイルをサムネイルで表示する", () => {
      render(<AttachmentDisplay attachments={[createImageAttachment()]} />);

      const img = screen.getByRole("img", { name: "photo.jpg" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
    });

    it("複数の画像をグリッドで表示する", () => {
      render(
        <AttachmentDisplay
          attachments={[
            createImageAttachment({
              name: "a.jpg",
              signedUrl: "https://example.com/a.jpg",
            }),
            createImageAttachment({
              name: "b.png",
              type: "image/png",
              signedUrl: "https://example.com/b.png",
            }),
          ]}
        />
      );

      expect(screen.getByRole("img", { name: "a.jpg" })).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "b.png" })).toBeInTheDocument();
    });
  });

  describe("Req 6.2: PDFファイルのダウンロードリンク表示", () => {
    it("PDFファイルをファイル名付きリンクとして表示する", () => {
      render(<AttachmentDisplay attachments={[createPdfAttachment()]} />);

      const link = screen.getByRole("link", { name: /doc\.pdf/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://example.com/doc.pdf");
    });

    it("PDFファイルのサイズを表示する", () => {
      render(<AttachmentDisplay attachments={[createPdfAttachment()]} />);

      expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
    });
  });

  describe("Req 6.3: 画像クリックで拡大表示（ライトボックス）", () => {
    it("画像をクリックするとライトボックスが開く", async () => {
      const user = userEvent.setup();

      render(<AttachmentDisplay attachments={[createImageAttachment()]} />);

      const thumbnail = screen.getByRole("img", { name: "photo.jpg" });
      await user.click(thumbnail);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("ライトボックスを閉じることができる", async () => {
      const user = userEvent.setup();

      render(<AttachmentDisplay attachments={[createImageAttachment()]} />);

      const thumbnail = screen.getByRole("img", { name: "photo.jpg" });
      await user.click(thumbnail);

      const closeButton = screen.getByRole("button", { name: /閉じる/ });
      await user.click(closeButton);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Req 6.4: ダウンロードリンク", () => {
    it("PDFリンクが新しいタブで開く", () => {
      render(<AttachmentDisplay attachments={[createPdfAttachment()]} />);

      const link = screen.getByRole("link", { name: /doc\.pdf/ });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("画像とPDFの混在表示", () => {
    it("画像セクションとPDFセクションを両方表示する", () => {
      render(
        <AttachmentDisplay
          attachments={[createImageAttachment(), createPdfAttachment()]}
        />
      );

      expect(
        screen.getByRole("img", { name: "photo.jpg" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /doc\.pdf/ })
      ).toBeInTheDocument();
    });
  });
});
