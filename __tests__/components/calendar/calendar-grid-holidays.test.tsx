/**
 * CalendarGrid 祝日表示のテスト
 *
 * Task 3.2: CalendarGrid コンポーネントの祝日表示対応
 * - backgroundEvents を react-big-calendar に渡す
 * - dayPropGetter で holidayMap を参照し祝日セルに rbc-holiday クラスを適用する
 * - 既存の今日ハイライト・月外セル・土日色分けと共存する
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackgroundCalendarEvent } from "@/lib/calendar/holiday-service";

// Store captured props for assertions
let capturedProps: Record<string, unknown> = {};

vi.mock("react-big-calendar/lib/addons/dragAndDrop/styles.css", () => ({}));
vi.mock("react-big-calendar/lib/css/react-big-calendar.css", () => ({}));

vi.mock("react-big-calendar", () => {
  const MockCalendar = vi.fn((props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid="mock-calendar" />;
  });
  return {
    Calendar: MockCalendar,
  };
});

vi.mock("react-big-calendar/lib/addons/dragAndDrop", () => ({
  default: (Component: unknown) => Component,
}));

vi.mock("@/lib/calendar/localizer", () => ({
  calendarLocalizer: {},
  calendarFormats: {},
  calendarMessages: {},
}));

vi.mock("@/components/calendar/event-block", () => ({
  EventBlockWrapper: () => null,
  MonthEventBlockWrapper: () => null,
}));

import { CalendarGrid } from "@/components/calendar/calendar-grid";

const defaultProps = {
  events: [],
  viewMode: "month" as const,
  selectedDate: new Date(2026, 0, 15),
  onEventClick: vi.fn(),
  onDateChange: vi.fn(),
  today: new Date(2026, 0, 15),
};

type DayPropGetterFn = (date: Date) => {
  className: string;
  style: React.CSSProperties;
};

describe("CalendarGrid - 祝日表示", () => {
  beforeEach(() => {
    capturedProps = {};
  });

  describe("Task 3.2: backgroundEvents の受け渡し", () => {
    it("backgroundEvents を react-big-calendar に渡す", () => {
      const holidayEvents: BackgroundCalendarEvent[] = [
        {
          start: new Date(2026, 0, 1),
          end: new Date(2026, 0, 1),
          title: "元日",
          allDay: true,
        },
      ];

      render(
        <CalendarGrid {...defaultProps} backgroundEvents={holidayEvents} />
      );

      expect(capturedProps.backgroundEvents).toEqual(holidayEvents);
    });

    it("backgroundEvents が未指定の場合、undefined を渡す", () => {
      render(<CalendarGrid {...defaultProps} />);

      expect(capturedProps.backgroundEvents).toBeUndefined();
    });
  });

  describe("Task 3.2: dayPropGetter の祝日クラス適用", () => {
    it("祝日の日付に rbc-holiday クラスを適用する", () => {
      const holidayMap = new Map<string, string>([["2026-01-01", "元日"]]);

      render(<CalendarGrid {...defaultProps} holidayMap={holidayMap} />);

      const dayPropGetter = capturedProps.dayPropGetter as DayPropGetterFn;
      const result = dayPropGetter(new Date(2026, 0, 1));

      expect(result.className).toContain("rbc-holiday");
    });

    it("祝日でない日付には rbc-holiday クラスを適用しない", () => {
      const holidayMap = new Map<string, string>([["2026-01-01", "元日"]]);

      render(<CalendarGrid {...defaultProps} holidayMap={holidayMap} />);

      const dayPropGetter = capturedProps.dayPropGetter as DayPropGetterFn;
      const result = dayPropGetter(new Date(2026, 0, 2));

      expect(result.className).not.toContain("rbc-holiday");
    });

    it("土曜日の祝日に rbc-saturday と rbc-holiday の両方を適用する", () => {
      // 2026-01-03 is a Saturday
      const holidayMap = new Map<string, string>([
        ["2026-01-03", "テスト祝日"],
      ]);

      render(<CalendarGrid {...defaultProps} holidayMap={holidayMap} />);

      const dayPropGetter = capturedProps.dayPropGetter as DayPropGetterFn;
      const result = dayPropGetter(new Date(2026, 0, 3));

      expect(result.className).toContain("rbc-saturday");
      expect(result.className).toContain("rbc-holiday");
    });

    it("日曜日の祝日に rbc-sunday と rbc-holiday の両方を適用する", () => {
      // 2026-01-04 is a Sunday
      const holidayMap = new Map<string, string>([
        ["2026-01-04", "テスト祝日"],
      ]);

      render(<CalendarGrid {...defaultProps} holidayMap={holidayMap} />);

      const dayPropGetter = capturedProps.dayPropGetter as DayPropGetterFn;
      const result = dayPropGetter(new Date(2026, 0, 4));

      expect(result.className).toContain("rbc-sunday");
      expect(result.className).toContain("rbc-holiday");
    });

    it("holidayMap が未指定の場合、rbc-holiday クラスを適用しない", () => {
      render(<CalendarGrid {...defaultProps} />);

      const dayPropGetter = capturedProps.dayPropGetter as DayPropGetterFn;
      const result = dayPropGetter(new Date(2026, 0, 1));

      expect(result.className).not.toContain("rbc-holiday");
    });

    it("今日ハイライトと祝日クラスが共存する", () => {
      const today = new Date(2026, 0, 1);
      const holidayMap = new Map<string, string>([["2026-01-01", "元日"]]);

      render(
        <CalendarGrid {...defaultProps} holidayMap={holidayMap} today={today} />
      );

      const dayPropGetter = capturedProps.dayPropGetter as DayPropGetterFn;
      const result = dayPropGetter(new Date(2026, 0, 1));

      expect(result.className).toContain("rbc-today-highlight");
      expect(result.className).toContain("rbc-holiday");
    });
  });
});
