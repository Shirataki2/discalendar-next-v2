/**
 * EventDialog アナリティクストラッキング 統合テスト
 *
 * Task 6.1: CRUD操作成功後に対応するカスタムイベントがキャプチャされることを検証する
 * PostHog SDKをモック化し、capture関数の呼び出しを検証する
 *
 * Requirements: 3.1, 3.2, 3.3, 3.6
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// posthog-jsのモック（SDKレベル）
const mockCapture = vi.fn();
vi.mock("posthog-js", () => {
  const posthog = {
    init: vi.fn(),
    capture: (...args: unknown[]) => mockCapture(...args),
    get_distinct_id: () => "test-distinct-id",
  };
  return { default: posthog };
});

// EventServiceのモック
const mockEventService = {
  fetchEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
};

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
const FAILURE_PATTERN = /失敗/;

describe("EventDialog アナリティクストラッキング統合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("イベント作成時のトラッキング (Req 3.1)", () => {
    it("イベント作成成功時にevent_createdがキャプチャされる", async () => {
      const user = userEvent.setup();
      mockEventService.createEvent.mockResolvedValue(mockSuccessResponse);

      render(
        <EventDialog
          eventService={mockEventService}
          guildId="guild-123"
          mode="create"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          open
        />
      );

      // タイトルを入力
      const titleInput = screen.getByRole("textbox", { name: TITLE_PATTERN });
      await user.type(titleInput, "新しい予定");

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith(
          "event_created",
          expect.objectContaining({
            is_all_day: expect.any(Boolean),
            color: expect.any(String),
            has_notifications: expect.any(Boolean),
          })
        );
      });
    });

    it("終日イベント作成時にis_all_dayがtrueでキャプチャされる", async () => {
      const user = userEvent.setup();
      mockEventService.createEvent.mockResolvedValue(mockSuccessResponse);

      render(
        <EventDialog
          eventService={mockEventService}
          guildId="guild-123"
          initialData={{
            title: "終日予定",
            isAllDay: true,
            startAt: new Date("2026-01-10T00:00:00"),
            endAt: new Date("2026-01-11T00:00:00"),
          }}
          mode="create"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          open
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith(
          "event_created",
          expect.objectContaining({
            is_all_day: true,
          })
        );
      });
    });

    it("通知ありイベント作成時にhas_notificationsがtrueでキャプチャされる", async () => {
      const user = userEvent.setup();
      mockEventService.createEvent.mockResolvedValue(mockSuccessResponse);

      render(
        <EventDialog
          eventService={mockEventService}
          guildId="guild-123"
          initialData={{
            title: "通知あり予定",
            notifications: [{ key: "n1", num: 10, unit: "minutes" as const }],
          }}
          mode="create"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          open
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith(
          "event_created",
          expect.objectContaining({
            has_notifications: true,
          })
        );
      });
    });

    it("PIIがトラッキングプロパティに含まれない (Req 3.6)", async () => {
      const user = userEvent.setup();
      mockEventService.createEvent.mockResolvedValue(mockSuccessResponse);

      render(
        <EventDialog
          eventService={mockEventService}
          guildId="guild-123"
          initialData={{ title: "秘密の予定" }}
          mode="create"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          open
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith(
          "event_created",
          expect.any(Object)
        );
      });

      // event_createdのcaptureコールを取得
      const captureCall = mockCapture.mock.calls.find(
        (call: unknown[]) => call[0] === "event_created"
      );
      expect(captureCall).toBeDefined();
      const properties = captureCall?.[1] as Record<string, unknown>;

      // PIIが含まれていないことを確認
      expect(properties).not.toHaveProperty("title");
      expect(properties).not.toHaveProperty("description");
      expect(properties).not.toHaveProperty("location");
    });
  });

  describe("イベント編集時のトラッキング (Req 3.2)", () => {
    it("イベント編集成功時にevent_updatedがchanged_fieldsと共にキャプチャされる", async () => {
      const user = userEvent.setup();
      mockEventService.updateEvent.mockResolvedValue(mockSuccessResponse);

      const initialData = {
        title: "元の予定",
        startAt: new Date("2026-01-10T10:00:00"),
        endAt: new Date("2026-01-10T11:00:00"),
        isAllDay: false,
        color: "#3B82F6",
        description: "",
        location: "",
        notifications: [] as Array<{ key: string; num: number; unit: string }>,
      };

      render(
        <EventDialog
          eventId="event-123"
          eventService={mockEventService}
          guildId="guild-123"
          initialData={initialData}
          mode="edit"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          open
        />
      );

      // タイトルを変更
      const titleInput = screen.getByRole("textbox", { name: TITLE_PATTERN });
      await user.clear(titleInput);
      await user.type(titleInput, "変更後の予定");

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCapture).toHaveBeenCalledWith(
          "event_updated",
          expect.objectContaining({
            changed_fields: expect.arrayContaining(["title"]),
          })
        );
      });
    });
  });

  describe("イベント作成失敗時のトラッキング", () => {
    it("作成失敗時にはevent_createdがキャプチャされない", async () => {
      const user = userEvent.setup();
      mockEventService.createEvent.mockResolvedValue({
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: "イベントの作成に失敗しました。",
        },
      });

      render(
        <EventDialog
          eventService={mockEventService}
          guildId="guild-123"
          initialData={{ title: "失敗する予定" }}
          mode="create"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          open
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(FAILURE_PATTERN)).toBeInTheDocument();
      });

      expect(mockCapture).not.toHaveBeenCalledWith(
        "event_created",
        expect.any(Object)
      );
    });
  });
});
