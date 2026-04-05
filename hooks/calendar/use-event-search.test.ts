/**
 * useEventSearch フックのテスト
 *
 * - タイトルによるケースインセンシティブ部分一致検索
 * - 300msデバウンス動作
 * - 空クエリで全イベント返却
 * - 祝日イベントのフィルタリング除外
 * - 検索クリアで全イベント即時復帰
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/lib/calendar/types";

vi.mock("@/lib/calendar/holiday-service", () => ({
  isHolidayEvent: (event: CalendarEvent) =>
    event.id.startsWith("holiday-"),
}));

function createEvent(
  overrides: Partial<CalendarEvent> & { id: string; title: string },
): CalendarEvent {
  return {
    start: new Date(2026, 3, 1),
    end: new Date(2026, 3, 1, 1),
    allDay: false,
    color: "#3b82f6",
    ...overrides,
  };
}

const normalEvent1 = createEvent({ id: "1", title: "チームミーティング" });
const normalEvent2 = createEvent({ id: "2", title: "ランチ会" });
const normalEvent3 = createEvent({ id: "3", title: "Team Review" });
const holidayEvent = createEvent({
  id: "holiday-2026-01-01",
  title: "元日",
  allDay: true,
  color: "#ef4444",
});

const allEvents = [normalEvent1, normalEvent2, normalEvent3, holidayEvent];

describe("useEventSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期状態では全イベントを返し、matchCountはnull、isSearchActiveはfalse", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const { result } = renderHook(() =>
      useEventSearch({ events: allEvents }),
    );

    expect(result.current.searchQuery).toBe("");
    expect(result.current.filteredEvents).toEqual(allEvents);
    expect(result.current.matchCount).toBeNull();
    expect(result.current.isSearchActive).toBe(false);
  });

  it("ケースインセンシティブな部分一致でフィルタリングする", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const { result } = renderHook(() =>
      useEventSearch({ events: allEvents }),
    );

    act(() => {
      result.current.setSearchQuery("team");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isSearchActive).toBe(true);
    // "team" は "チームミーティング" にはマッチしないが "Team Review" にマッチ
    // 祝日イベントは常に含まれる
    const titles = result.current.filteredEvents.map((e) => e.title);
    expect(titles).toContain("Team Review");
    expect(titles).toContain("元日");
    expect(titles).not.toContain("ランチ会");
  });

  it("日本語でもケースインセンシティブ部分一致する", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const { result } = renderHook(() =>
      useEventSearch({ events: allEvents }),
    );

    act(() => {
      result.current.setSearchQuery("ミーティング");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isSearchActive).toBe(true);
    const titles = result.current.filteredEvents.map((e) => e.title);
    expect(titles).toContain("チームミーティング");
    expect(titles).toContain("元日"); // 祝日は常に含まれる
    expect(titles).not.toContain("ランチ会");
    expect(titles).not.toContain("Team Review");
  });

  it("大文字小文字を区別しない", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const { result } = renderHook(() =>
      useEventSearch({ events: allEvents }),
    );

    act(() => {
      result.current.setSearchQuery("TEAM REVIEW");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const titles = result.current.filteredEvents.map((e) => e.title);
    expect(titles).toContain("Team Review");
  });

  it("searchQueryは即座に更新され、filteredEventsはデバウンス後に更新される", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const { result } = renderHook(() =>
      useEventSearch({ events: allEvents }),
    );

    act(() => {
      result.current.setSearchQuery("team");
    });

    // searchQueryは即座に反映
    expect(result.current.searchQuery).toBe("team");
    // デバウンス前なのでfilteredEventsはまだ全件
    expect(result.current.filteredEvents).toEqual(allEvents);
    expect(result.current.isSearchActive).toBe(false);

    // 200ms経過 - まだデバウンス中
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.filteredEvents).toEqual(allEvents);
    expect(result.current.isSearchActive).toBe(false);

    // 残り100ms経過で合計300ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.isSearchActive).toBe(true);
    expect(result.current.filteredEvents.length).toBeLessThan(
      allEvents.length,
    );
  });

  it("カスタムデバウンス時間を指定できる", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const { result } = renderHook(() =>
      useEventSearch({ events: allEvents, debounceMs: 500 }),
    );

    act(() => {
      result.current.setSearchQuery("team");
    });

    // 300ms経過 - カスタム設定なのでまだデバウンス中
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.filteredEvents).toEqual(allEvents);
    expect(result.current.isSearchActive).toBe(false);

    // 残り200ms経過で合計500ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.isSearchActive).toBe(true);
  });

  it("祝日イベントはフィルタリングから除外され常に表示される", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const { result } = renderHook(() =>
      useEventSearch({ events: allEvents }),
    );

    // 存在しないタイトルで検索
    act(() => {
      result.current.setSearchQuery("存在しないイベント");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isSearchActive).toBe(true);
    // 通常イベントはマッチしないが、祝日は残る
    expect(result.current.filteredEvents).toEqual([holidayEvent]);
    // matchCountは通常イベントのマッチ数のみ（祝日は含まれない）
    expect(result.current.matchCount).toBe(0);
  });

  it("matchCountは祝日イベントを除外したマッチ数を返す", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const events = [
      ...allEvents,
      createEvent({ id: "4", title: "Team Standup" }),
    ];
    const { result } = renderHook(() =>
      useEventSearch({ events }),
    );

    act(() => {
      result.current.setSearchQuery("team");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // "Team Review" と "Team Standup" がマッチ、祝日はカウント外
    expect(result.current.matchCount).toBe(2);
  });

  it("空白のみのクエリは検索非アクティブとして扱う", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const { result } = renderHook(() =>
      useEventSearch({ events: allEvents }),
    );

    act(() => {
      result.current.setSearchQuery("   ");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isSearchActive).toBe(false);
    expect(result.current.filteredEvents).toEqual(allEvents);
    expect(result.current.matchCount).toBeNull();
  });

  it("検索クリアで全イベントが復帰する", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const { result } = renderHook(() =>
      useEventSearch({ events: allEvents }),
    );

    // まず検索を実行
    act(() => {
      result.current.setSearchQuery("team");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isSearchActive).toBe(true);
    expect(result.current.filteredEvents.length).toBeLessThan(
      allEvents.length,
    );

    // 検索をクリア
    act(() => {
      result.current.setSearchQuery("");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.searchQuery).toBe("");
    expect(result.current.isSearchActive).toBe(false);
    expect(result.current.filteredEvents).toEqual(allEvents);
    expect(result.current.matchCount).toBeNull();
  });

  it("連続入力ではデバウンスによって最後のクエリのみが反映される", async () => {
    const { useEventSearch } = await import(
      "@/hooks/calendar/use-event-search"
    );
    const { result } = renderHook(() =>
      useEventSearch({ events: allEvents }),
    );

    // 連続して入力
    act(() => {
      result.current.setSearchQuery("t");
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.setSearchQuery("te");
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.setSearchQuery("ランチ");
    });

    // 最後の入力から300ms待つ
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.searchQuery).toBe("ランチ");
    const titles = result.current.filteredEvents.map((e) => e.title);
    expect(titles).toContain("ランチ会");
    expect(titles).toContain("元日"); // 祝日
    expect(titles).not.toContain("チームミーティング");
    expect(titles).not.toContain("Team Review");
    expect(result.current.matchCount).toBe(1);
  });
});
