import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { UpcomingEvent } from "@/lib/calendar/cross-guild-event-types";
import { UpcomingEventItem } from "./upcoming-event-item";

const timedEvent: UpcomingEvent = {
  id: "event-1",
  title: "チームミーティング",
  start: "2026-03-25T10:00:00.000Z",
  end: "2026-03-25T11:00:00.000Z",
  allDay: false,
  color: "#3b82f6",
  isRecurring: false,
  guildId: "guild-1",
  guildName: "テストサーバー",
  guildAvatarUrl: "https://cdn.discordapp.com/icons/guild-1/abc.png",
};

const allDayEvent: UpcomingEvent = {
  id: "event-2",
  title: "祝日",
  start: "2026-03-25T00:00:00.000Z",
  end: "2026-03-25T23:59:59.000Z",
  allDay: true,
  color: "#ef4444",
  isRecurring: false,
  guildId: "guild-2",
  guildName: "祝日サーバー",
  guildAvatarUrl: null,
};

const recurringEvent: UpcomingEvent = {
  id: "series-1:2026-03-25",
  title: "定例ミーティング",
  start: "2026-03-25T14:00:00.000Z",
  end: "2026-03-25T15:00:00.000Z",
  allDay: false,
  color: "#22c55e",
  isRecurring: true,
  guildId: "guild-1",
  guildName: "テストサーバー",
  guildAvatarUrl: "https://cdn.discordapp.com/icons/guild-1/abc.png",
};

describe("UpcomingEventItem", () => {
  describe("基本表示", () => {
    it("イベント名を表示する", () => {
      render(<UpcomingEventItem event={timedEvent} />);
      expect(screen.getByText("チームミーティング")).toBeInTheDocument();
    });

    it("サーバー名を表示する", () => {
      render(<UpcomingEventItem event={timedEvent} />);
      expect(screen.getByText("テストサーバー")).toBeInTheDocument();
    });

    it("サーバーアイコンを表示する", () => {
      render(<UpcomingEventItem event={timedEvent} />);
      const img = screen.getByAltText("テストサーバーのアイコン");
      expect(img).toBeInTheDocument();
    });

    it("アイコン未設定時はイニシャルを表示する", () => {
      render(<UpcomingEventItem event={allDayEvent} />);
      expect(screen.getByText("祝")).toBeInTheDocument();
    });

    it("イベント色が左ボーダーとして適用される", () => {
      render(<UpcomingEventItem event={timedEvent} />);
      const item = screen.getByTestId("upcoming-event-item");
      expect(item).toHaveStyle({ borderLeftColor: "#3b82f6" });
    });
  });

  describe("日時表示", () => {
    it("時刻指定イベントは時刻を表示する", () => {
      render(<UpcomingEventItem event={timedEvent} />);
      expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
    });

    it("終日イベントは「終日」と表示する", () => {
      render(<UpcomingEventItem event={allDayEvent} />);
      expect(screen.getByText("終日")).toBeInTheDocument();
    });

    it("日付を表示する", () => {
      render(<UpcomingEventItem event={timedEvent} />);
      // 3月25日が表示されることを確認（フォーマットは実装依存）
      expect(screen.getByText(/3月25日/)).toBeInTheDocument();
    });
  });

  describe("繰り返しイベント", () => {
    it("繰り返しイベントにインジケーターが表示される", () => {
      render(<UpcomingEventItem event={recurringEvent} />);
      expect(screen.getByTestId("recurring-indicator")).toBeInTheDocument();
    });

    it("単発イベントには繰り返しインジケーターが表示されない", () => {
      render(<UpcomingEventItem event={timedEvent} />);
      expect(
        screen.queryByTestId("recurring-indicator")
      ).not.toBeInTheDocument();
    });
  });

  describe("ナビゲーション", () => {
    it("該当サーバーのカレンダーページへのリンクを持つ", () => {
      render(<UpcomingEventItem event={timedEvent} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/dashboard?guild=guild-1&date=2026-03-25"
      );
    });

    it("終日イベントも正しいリンクを持つ", () => {
      render(<UpcomingEventItem event={allDayEvent} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/dashboard?guild=guild-2&date=2026-03-25"
      );
    });
  });
});
