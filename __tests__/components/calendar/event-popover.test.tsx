/**
 * EventPopover コンポーネントのテスト
 *
 * タスク7.2 (recurring-events): イベントプレビューに繰り返し情報を表示する
 * - 繰り返しルールの概要テキスト（rruleSummary）を表示する
 * - 繰り返しイベントの場合に繰り返しアイコンを表示する
 * - 非繰り返しイベントでは繰り返し情報を表示しない
 *
 * Task 6.2: EventPopoverへのAttachmentDisplay統合
 * - 添付ファイルがある場合にAttachmentDisplayセクションを表示
 * - 添付ファイルがない場合はセクションを非表示
 * - Signed URL取得中はローディング表示
 *
 * Requirements: 4.3, 9.4, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventPopover } from "@/components/calendar/event-popover";
import type { CalendarEvent } from "@/lib/calendar/types";

// useAttachmentUrls フックのモック
const mockUseAttachmentUrls = vi.fn();
vi.mock("@/hooks/calendar/use-attachment-urls", () => ({
  useAttachmentUrls: (...args: unknown[]) => mockUseAttachmentUrls(...args),
}));

const DESCRIPTION_REGEX = /説明文/;
const LOCATION_TOKYO_REGEX = /東京/;
const DESCRIPTION_WEEKLY_REGEX = /週次の打ち合わせ/;
const LOCATION_ROOM_REGEX = /会議室A/;

/** テスト用の基本イベントデータ */
function createBaseEvent(overrides?: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "event-1",
    title: "テストイベント",
    start: new Date(2026, 1, 23, 10, 0),
    end: new Date(2026, 1, 23, 11, 0),
    allDay: false,
    color: "#3B82F6",
    ...overrides,
  };
}

/** 繰り返しイベントデータ */
function createRecurringEvent(
  overrides?: Partial<CalendarEvent>
): CalendarEvent {
  return createBaseEvent({
    isRecurring: true,
    seriesId: "series-1",
    rruleSummary: "毎週火曜日",
    ...overrides,
  });
}

describe("EventPopover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトは空配列（添付なし）
    mockUseAttachmentUrls.mockReturnValue({
      attachmentsWithUrls: [],
      isLoading: false,
    });
  });

  describe("繰り返し情報表示", () => {
    describe("Req 4.3: 繰り返しルール概要の表示", () => {
      it("繰り返しイベントの場合、rruleSummaryテキストが表示される", () => {
        const event = createRecurringEvent({ rruleSummary: "毎週火曜日" });

        render(<EventPopover event={event} onClose={vi.fn()} open={true} />);

        expect(screen.getByText("毎週火曜日")).toBeInTheDocument();
      });

      it("繰り返しイベントの場合、繰り返しアイコンが表示される", () => {
        const event = createRecurringEvent();

        render(<EventPopover event={event} onClose={vi.fn()} open={true} />);

        expect(screen.getByTestId("recurrence-info")).toBeInTheDocument();
      });

      it("非繰り返しイベントの場合、繰り返し情報は表示されない", () => {
        const event = createBaseEvent();

        render(<EventPopover event={event} onClose={vi.fn()} open={true} />);

        expect(screen.queryByTestId("recurrence-info")).not.toBeInTheDocument();
      });

      it("isRecurringがtrueでもrruleSummaryがない場合、繰り返し情報セクション自体は表示されない", () => {
        const event = createRecurringEvent({ rruleSummary: undefined });

        render(<EventPopover event={event} onClose={vi.fn()} open={true} />);

        expect(screen.queryByTestId("recurrence-info")).not.toBeInTheDocument();
      });

      it("様々なrruleSummaryテキストが正しく表示される", () => {
        const summaries = [
          "毎日",
          "毎週月・水・金曜日",
          "毎月第2水曜日",
          "2週間ごと",
          "毎年",
        ];

        for (const summary of summaries) {
          const event = createRecurringEvent({ rruleSummary: summary });

          const { unmount } = render(
            <EventPopover event={event} onClose={vi.fn()} open={true} />
          );

          expect(screen.getByText(summary)).toBeInTheDocument();
          unmount();
        }
      });
    });

    describe("Req 9.4: 既存UIとの整合性", () => {
      it("非繰り返しイベントの基本情報表示は変更なし", () => {
        const event = createBaseEvent({
          title: "通常イベント",
          description: "説明文",
          location: "東京",
        });

        render(<EventPopover event={event} onClose={vi.fn()} open={true} />);

        expect(screen.getByText("通常イベント")).toBeInTheDocument();
        expect(screen.getByText(DESCRIPTION_REGEX)).toBeInTheDocument();
        expect(screen.getByText(LOCATION_TOKYO_REGEX)).toBeInTheDocument();
      });

      it("繰り返しイベントでも基本情報が正しく表示される", () => {
        const event = createRecurringEvent({
          title: "定例ミーティング",
          description: "週次の打ち合わせ",
          location: "会議室A",
        });

        render(<EventPopover event={event} onClose={vi.fn()} open={true} />);

        expect(screen.getByText("定例ミーティング")).toBeInTheDocument();
        expect(screen.getByText(DESCRIPTION_WEEKLY_REGEX)).toBeInTheDocument();
        expect(screen.getByText(LOCATION_ROOM_REGEX)).toBeInTheDocument();
        expect(screen.getByText("毎週火曜日")).toBeInTheDocument();
      });

      it("編集・削除ボタンが繰り返しイベントでも表示される", () => {
        const event = createRecurringEvent();

        render(
          <EventPopover
            event={event}
            onClose={vi.fn()}
            onDelete={vi.fn()}
            onEdit={vi.fn()}
            open={true}
          />
        );

        expect(screen.getByTestId("event-edit-button")).toBeInTheDocument();
        expect(screen.getByTestId("event-delete-button")).toBeInTheDocument();
      });

      it("編集ボタンクリック時にonEditが呼ばれる", async () => {
        const user = userEvent.setup();
        const event = createRecurringEvent();
        const onEdit = vi.fn();

        render(
          <EventPopover
            event={event}
            onClose={vi.fn()}
            onEdit={onEdit}
            open={true}
          />
        );

        await user.click(screen.getByTestId("event-edit-button"));
        expect(onEdit).toHaveBeenCalledWith(event);
      });

      it("削除ボタンクリック時にonDeleteが呼ばれる", async () => {
        const user = userEvent.setup();
        const event = createRecurringEvent();
        const onDelete = vi.fn();

        render(
          <EventPopover
            event={event}
            onClose={vi.fn()}
            onDelete={onDelete}
            open={true}
          />
        );

        await user.click(screen.getByTestId("event-delete-button"));
        expect(onDelete).toHaveBeenCalledWith(event);
      });
    });
  });

  describe("Task 6.2: 添付ファイル表示統合", () => {
    it("添付ファイルがある場合、添付ファイルセクションが表示される", async () => {
      mockUseAttachmentUrls.mockReturnValue({
        attachmentsWithUrls: [
          {
            name: "poster.jpg",
            path: "g1/e1/uuid_poster.jpg",
            type: "image/jpeg",
            size: 1024,
            signedUrl: "https://example.com/poster.jpg",
          },
        ],
        isLoading: false,
      });

      const event = createBaseEvent({
        attachments: [
          {
            name: "poster.jpg",
            path: "g1/e1/uuid_poster.jpg",
            type: "image/jpeg",
            size: 1024,
          },
        ],
      });

      render(
        <EventPopover
          event={event}
          guildId="guild-123"
          onClose={vi.fn()}
          open={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("attachment-section")).toBeInTheDocument();
      });

      expect(
        screen.getByRole("img", { name: "poster.jpg" })
      ).toBeInTheDocument();
    });

    it("添付ファイルがない場合、添付ファイルセクションが表示されない", () => {
      const event = createBaseEvent();

      render(
        <EventPopover
          event={event}
          guildId="guild-123"
          onClose={vi.fn()}
          open={true}
        />
      );

      expect(
        screen.queryByTestId("attachment-section")
      ).not.toBeInTheDocument();
    });

    it("guildIdがない場合、添付ファイルがあっても添付ファイルセクションが表示されない", () => {
      const event = createBaseEvent({
        attachments: [
          {
            name: "poster.jpg",
            path: "g1/e1/uuid_poster.jpg",
            type: "image/jpeg",
            size: 1024,
          },
        ],
      });

      render(<EventPopover event={event} onClose={vi.fn()} open={true} />);

      expect(
        screen.queryByTestId("attachment-section")
      ).not.toBeInTheDocument();
    });

    it("Signed URL読み込み中はローディング表示される", () => {
      mockUseAttachmentUrls.mockReturnValue({
        attachmentsWithUrls: [],
        isLoading: true,
      });

      const event = createBaseEvent({
        attachments: [
          {
            name: "poster.jpg",
            path: "g1/e1/uuid_poster.jpg",
            type: "image/jpeg",
            size: 1024,
          },
        ],
      });

      render(
        <EventPopover
          event={event}
          guildId="guild-123"
          onClose={vi.fn()}
          open={true}
        />
      );

      expect(screen.getByTestId("attachment-section")).toBeInTheDocument();
      expect(screen.getByTestId("attachment-loading")).toBeInTheDocument();
    });

    it("PDFファイルがダウンロードリンクとして表示される", async () => {
      mockUseAttachmentUrls.mockReturnValue({
        attachmentsWithUrls: [
          {
            name: "map.pdf",
            path: "g1/e1/uuid_map.pdf",
            type: "application/pdf",
            size: 2048,
            signedUrl: "https://example.com/map.pdf",
          },
        ],
        isLoading: false,
      });

      const event = createBaseEvent({
        attachments: [
          {
            name: "map.pdf",
            path: "g1/e1/uuid_map.pdf",
            type: "application/pdf",
            size: 2048,
          },
        ],
      });

      render(
        <EventPopover
          event={event}
          guildId="guild-123"
          onClose={vi.fn()}
          open={true}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByRole("link", { name: /map\.pdf/ })
        ).toBeInTheDocument();
      });
    });
  });
});
