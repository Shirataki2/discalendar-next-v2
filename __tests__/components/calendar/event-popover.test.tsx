/**
 * EventPopover コンポーネントのテスト
 *
 * タスク7.2 (recurring-events): イベントプレビューに繰り返し情報を表示する
 * - 繰り返しルールの概要テキスト（rruleSummary）を表示する
 * - 繰り返しイベントの場合に繰り返しアイコンを表示する
 * - 非繰り返しイベントでは繰り返し情報を表示しない
 *
 * Requirements: 4.3, 9.4
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventPopover } from "@/components/calendar/event-popover";
import type { CalendarEvent } from "@/lib/calendar/types";

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

describe("EventPopover - 繰り返し情報表示", () => {
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
