import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { UpcomingEvent } from "@/lib/calendar/cross-guild-event-types";
import { UpcomingEventList } from "./upcoming-event-list";

function createEvent(overrides: Partial<UpcomingEvent> = {}): UpcomingEvent {
  return {
    id: "event-1",
    title: "テストイベント",
    start: "2026-03-25T10:00:00.000Z",
    end: "2026-03-25T11:00:00.000Z",
    allDay: false,
    color: "#3b82f6",
    isRecurring: false,
    guildId: "guild-1",
    guildName: "テストサーバー",
    guildAvatarUrl: null,
    ...overrides,
  };
}

describe("UpcomingEventList", () => {
  it("イベントリストをレンダリングする", () => {
    render(<UpcomingEventList events={[createEvent()]} hasMore={false} />);
    expect(screen.getByText("テストイベント")).toBeInTheDocument();
  });

  it("全てのイベントを表示する", () => {
    const events = [
      createEvent({ id: "1", title: "イベント1" }),
      createEvent({ id: "2", title: "イベント2" }),
      createEvent({ id: "3", title: "イベント3" }),
    ];
    render(<UpcomingEventList events={events} hasMore={false} />);

    expect(screen.getByText("イベント1")).toBeInTheDocument();
    expect(screen.getByText("イベント2")).toBeInTheDocument();
    expect(screen.getByText("イベント3")).toBeInTheDocument();
  });

  it("hasMore=true の場合「他にも予定があります」が表示される", () => {
    render(<UpcomingEventList events={[createEvent()]} hasMore />);
    expect(screen.getByText("他にも予定があります")).toBeInTheDocument();
  });

  it("hasMore=false の場合「他にも予定があります」が表示されない", () => {
    render(<UpcomingEventList events={[createEvent()]} hasMore={false} />);
    expect(screen.queryByText("他にも予定があります")).not.toBeInTheDocument();
  });
});
