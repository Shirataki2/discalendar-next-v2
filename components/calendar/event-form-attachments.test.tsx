/**
 * EventForm 添付ファイル統合テスト
 *
 * Task 5.1: EventForm・useEventFormの拡張とFileUploader統合
 * - EventFormにFileUploaderセクションが表示される
 * - guildId/eventIdがFileUploaderに渡される
 * - 既存添付ファイルがFileUploaderに渡される
 * - フォーム送信時にpendingDeletionsが含まれる
 *
 * Requirements: 4.1, 4.2
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AttachmentMeta } from "@/lib/calendar/attachment-types";

// FileUploaderをモック（Supabase依存を回避）
const mockOnAttachmentsChange = vi.fn();
const mockOnPendingDeletionsChange = vi.fn();

vi.mock("@/components/calendar/file-uploader", () => ({
  FileUploader: ({
    guildId,
    eventId,
    existingAttachments,
    onAttachmentsChange,
    onPendingDeletionsChange,
    disabled,
  }: {
    guildId: string;
    eventId?: string;
    existingAttachments?: AttachmentMeta[];
    onAttachmentsChange: (attachments: AttachmentMeta[]) => void;
    onPendingDeletionsChange: (paths: string[]) => void;
    disabled?: boolean;
  }) => {
    // コールバックを外部から呼べるようにする
    mockOnAttachmentsChange.mockImplementation(onAttachmentsChange);
    mockOnPendingDeletionsChange.mockImplementation(onPendingDeletionsChange);

    return (
      <div data-testid="file-uploader">
        <span data-testid="file-uploader-guild-id">{guildId}</span>
        <span data-testid="file-uploader-event-id">{eventId ?? ""}</span>
        <span data-testid="file-uploader-existing-count">
          {existingAttachments?.length ?? 0}
        </span>
        <span data-testid="file-uploader-disabled">
          {String(disabled ?? false)}
        </span>
      </div>
    );
  },
}));

// useRecurrenceFormをモック
vi.mock("@/hooks/calendar/use-recurrence-form", () => ({
  useRecurrenceForm: () => ({
    values: {
      isRecurring: false,
      frequency: "weekly",
      interval: 1,
      byDay: [],
      monthlyMode: "dayOfMonth",
      endCondition: { type: "never" },
    },
    handleChange: vi.fn(),
  }),
}));

// RecurrenceSettingsControlをモック
vi.mock("@/components/calendar/recurrence-settings-control", () => ({
  RecurrenceSettingsControl: () => <div data-testid="recurrence-settings" />,
}));

import { EventForm } from "@/components/calendar/event-form";

describe("EventForm 添付ファイル統合", () => {
  const defaultProps = {
    guildId: "guild-123",
    onSubmit: vi.fn(),
    isSubmitting: false,
    onCancel: vi.fn(),
  };

  it("FileUploaderセクションが表示される", () => {
    render(<EventForm {...defaultProps} />);
    expect(screen.getByTestId("file-uploader")).toBeInTheDocument();
  });

  it("guildIdがFileUploaderに渡される", () => {
    render(<EventForm {...defaultProps} guildId="guild-456" />);
    expect(screen.getByTestId("file-uploader-guild-id")).toHaveTextContent(
      "guild-456"
    );
  });

  it("eventIdがFileUploaderに渡される", () => {
    render(<EventForm {...defaultProps} eventId="event-789" />);
    expect(screen.getByTestId("file-uploader-event-id")).toHaveTextContent(
      "event-789"
    );
  });

  it("既存添付ファイルがFileUploaderに渡される", () => {
    const existingAttachments: AttachmentMeta[] = [
      {
        name: "photo.jpg",
        path: "g/e/photo.jpg",
        type: "image/jpeg",
        size: 1024,
      },
      {
        name: "doc.pdf",
        path: "g/e/doc.pdf",
        type: "application/pdf",
        size: 2048,
      },
    ];
    render(
      <EventForm
        {...defaultProps}
        defaultValues={{ attachments: existingAttachments }}
      />
    );
    expect(
      screen.getByTestId("file-uploader-existing-count")
    ).toHaveTextContent("2");
  });

  it("isSubmitting時にFileUploaderがdisabledになる", () => {
    render(<EventForm {...defaultProps} isSubmitting={true} />);
    expect(screen.getByTestId("file-uploader-disabled")).toHaveTextContent(
      "true"
    );
  });

  it("フォーム送信時にpendingDeletionsが含まれる", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <EventForm
        {...defaultProps}
        defaultValues={{ title: "テストイベント" }}
        onSubmit={onSubmit}
      />
    );

    // FileUploaderのpendingDeletionsを更新
    mockOnPendingDeletionsChange([
      "path/to/deleted1.jpg",
      "path/to/deleted2.pdf",
    ]);

    // フォーム送信
    const submitButton = screen.getByRole("button", { name: "保存" });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "テストイベント" }),
      expect.anything(), // recurrence
      ["path/to/deleted1.jpg", "path/to/deleted2.pdf"]
    );
  });
});
