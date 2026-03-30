/**
 * EventDialog 添付ファイル統合テスト
 *
 * Task 5.2: EventDialog・Server Actionsの更新
 * - toCreateEventInput/toUpdateEventInputにattachmentsが含まれる
 * - 繰り返しイベント用の変換関数にもattachmentsが含まれる
 * - イベント保存時にpendingDeletionsのファイルが削除される
 *
 * Requirements: 4.1, 4.2, 7.2
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttachmentMeta } from "@/lib/calendar/attachment-types";

// posthog-jsのモック
vi.mock("posthog-js", () => {
  const posthog = {
    init: vi.fn(),
    capture: vi.fn(),
    get_distinct_id: () => "test-distinct-id",
  };
  return { default: posthog };
});

// Server Actionsのモック
const mockCreateEventAction = vi.fn();
const mockUpdateEventAction = vi.fn();
const mockCreateRecurringEventAction = vi.fn();
const mockDeleteAttachmentFilesAction = vi.fn();

vi.mock("@/app/dashboard/actions", () => ({
  createEventAction: (...args: unknown[]) => mockCreateEventAction(...args),
  updateEventAction: (...args: unknown[]) => mockUpdateEventAction(...args),
  deleteEventAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
  createRecurringEventAction: (...args: unknown[]) =>
    mockCreateRecurringEventAction(...args),
  updateOccurrenceAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: {} }),
  deleteOccurrenceAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
  deleteAttachmentFilesAction: (...args: unknown[]) =>
    mockDeleteAttachmentFilesAction(...args),
}));

// FileUploaderをモック（useEffectで初回のみコールバックを呼ぶ）
let mockFileUploaderAttachments: AttachmentMeta[] = [];
let mockFileUploaderPendingDeletions: string[] = [];

vi.mock("@/components/calendar/file-uploader", async () => {
  const React = await import("react");
  return {
    FileUploader: ({
      onAttachmentsChange,
      onPendingDeletionsChange,
    }: {
      guildId: string;
      eventId?: string;
      existingAttachments?: AttachmentMeta[];
      onAttachmentsChange: (attachments: AttachmentMeta[]) => void;
      onPendingDeletionsChange: (paths: string[]) => void;
      disabled?: boolean;
    }) => {
      React.useEffect(() => {
        onAttachmentsChange(mockFileUploaderAttachments);
        onPendingDeletionsChange(mockFileUploaderPendingDeletions);
      }, []); // eslint-disable-line react-hooks/exhaustive-deps
      return React.createElement("div", { "data-testid": "file-uploader" });
    },
  };
});

const mockSuccessResponse = {
  success: true as const,
  data: {
    id: "event-123",
    guildId: "guild-123",
    title: "テスト予定",
    description: "",
    color: "#3B82F6",
    isAllDay: false,
    startAt: new Date("2026-01-10T10:00:00"),
    endAt: new Date("2026-01-10T11:00:00"),
    location: null,
    channelId: null,
    channelName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

import { EventDialog } from "@/components/calendar/event-dialog";

const TITLE_PATTERN = /タイトル/i;
const SAVE_PATTERN = /保存/i;

const WAIT_FOR_TIMEOUT = { timeout: 3000 };

describe("EventDialog 添付ファイル統合", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileUploaderAttachments = [];
    mockFileUploaderPendingDeletions = [];
    mockCreateEventAction.mockResolvedValue(mockSuccessResponse);
    mockUpdateEventAction.mockResolvedValue(mockSuccessResponse);
    mockCreateRecurringEventAction.mockResolvedValue({
      success: true,
      data: { id: "series-1" },
    });
    mockDeleteAttachmentFilesAction.mockResolvedValue({
      success: true,
      data: undefined,
    });
  });

  describe("イベント作成時のattachments", () => {
    it("作成時にattachmentsがcreateEventActionに含まれる", async () => {
      const user = userEvent.setup();
      mockFileUploaderAttachments = [
        {
          name: "poster.jpg",
          path: "guild-123/event-123/uuid_poster.jpg",
          type: "image/jpeg",
          size: 5000,
        },
      ];

      render(
        <EventDialog
          guildId="guild-123"
          mode="create"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          open
        />
      );

      const titleInput = screen.getByRole("textbox", { name: TITLE_PATTERN });
      await user.type(titleInput, "新しい予定");

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            eventData: expect.objectContaining({
              attachments: [expect.objectContaining({ name: "poster.jpg" })],
            }),
          })
        );
      }, WAIT_FOR_TIMEOUT);
    });
  });

  describe("イベント更新時のattachments", () => {
    it("更新時にattachmentsがupdateEventActionに含まれる", async () => {
      const user = userEvent.setup();
      mockFileUploaderAttachments = [
        {
          name: "map.pdf",
          path: "guild-123/event-456/uuid_map.pdf",
          type: "application/pdf",
          size: 10_000,
        },
      ];

      render(
        <EventDialog
          eventId="event-456"
          guildId="guild-123"
          initialData={{ title: "既存予定" }}
          mode="edit"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          open
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            eventData: expect.objectContaining({
              attachments: [expect.objectContaining({ name: "map.pdf" })],
            }),
          })
        );
      }, WAIT_FOR_TIMEOUT);
    });

    it("pendingDeletionsがある場合deleteAttachmentFilesActionが呼ばれる", async () => {
      const user = userEvent.setup();
      mockFileUploaderPendingDeletions = [
        "guild-123/event-456/old_file.jpg",
        "guild-123/event-456/old_doc.pdf",
      ];

      render(
        <EventDialog
          eventId="event-456"
          guildId="guild-123"
          initialData={{ title: "既存予定" }}
          mode="edit"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          open
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockDeleteAttachmentFilesAction).toHaveBeenCalledWith({
          guildId: "guild-123",
          paths: [
            "guild-123/event-456/old_file.jpg",
            "guild-123/event-456/old_doc.pdf",
          ],
        });
      }, WAIT_FOR_TIMEOUT);
    });

    it("pendingDeletionsが空の場合deleteAttachmentFilesActionは呼ばれない", async () => {
      const user = userEvent.setup();
      mockFileUploaderPendingDeletions = [];

      render(
        <EventDialog
          eventId="event-456"
          guildId="guild-123"
          initialData={{ title: "既存予定" }}
          mode="edit"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          open
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateEventAction).toHaveBeenCalled();
      }, WAIT_FOR_TIMEOUT);

      expect(mockDeleteAttachmentFilesAction).not.toHaveBeenCalled();
    });
  });
});
