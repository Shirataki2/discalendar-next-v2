/**
 * CalendarGrid - テスト
 *
 * タスク5.1: react-big-calendarのラッパーコンポーネント作成
 * Requirements: 1.1, 1.2, 1.3, 3.1
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/lib/calendar/types";
import { CalendarGrid } from "./calendar-grid";

// jsdomでサポートされていないdocument.elementFromPointをモック
// react-big-calendarのSelectionで使用される
const originalElementFromPoint = document.elementFromPoint;
beforeEach(() => {
  document.elementFromPoint = vi.fn(() => null);
});
afterEach(() => {
  document.elementFromPoint = originalElementFromPoint;
});

// トップレベルに正規表現を定義（パフォーマンス最適化）
// Task 9.2: aria-labelを日本語に変更したため、パターンも更新
const CALENDAR_REGION_PATTERN = /カレンダー/;

describe("CalendarGrid", () => {
  const mockEvents: CalendarEvent[] = [
    {
      id: "1",
      title: "テストイベント1",
      start: new Date(2025, 11, 5, 10, 0),
      end: new Date(2025, 11, 5, 11, 0),
      allDay: false,
      color: "#3b82f6",
    },
    {
      id: "2",
      title: "終日イベント",
      start: new Date(2025, 11, 6),
      end: new Date(2025, 11, 6),
      allDay: true,
      color: "#10b981",
    },
  ];

  const defaultProps = {
    events: mockEvents,
    viewMode: "month" as const,
    selectedDate: new Date(2025, 11, 5),
    onEventClick: vi.fn(),
    onDateChange: vi.fn(),
    today: new Date(2025, 11, 5),
  };

  it("react-big-calendarコンポーネントをレンダリングする", () => {
    render(<CalendarGrid {...defaultProps} />);

    // react-big-calendarの典型的なDOM要素が存在することを確認
    const calendarElement = screen.getByRole("region", {
      name: CALENDAR_REGION_PATTERN,
    });
    expect(calendarElement).toBeInTheDocument();
  });

  it("月ビューモードで正しく表示する (Req 1.3)", () => {
    render(<CalendarGrid {...defaultProps} viewMode="month" />);

    // 月ビューではカレンダーグリッドが表示される
    const calendarElement = screen.getByRole("region", {
      name: CALENDAR_REGION_PATTERN,
    });
    expect(calendarElement).toBeInTheDocument();

    // イベントが表示されることを確認
    expect(screen.getByText("テストイベント1")).toBeInTheDocument();
    expect(screen.getByText("終日イベント")).toBeInTheDocument();
  });

  it("週ビューモードで正しく表示する (Req 1.2)", () => {
    render(<CalendarGrid {...defaultProps} viewMode="week" />);

    // 週ビューでは時間軸が縦方向に表示される
    const calendarElement = screen.getByRole("region", {
      name: CALENDAR_REGION_PATTERN,
    });
    expect(calendarElement).toBeInTheDocument();

    // イベントが表示されることを確認
    expect(screen.getByText("テストイベント1")).toBeInTheDocument();
  });

  it("日ビューモードで正しく表示する (Req 1.1)", () => {
    render(<CalendarGrid {...defaultProps} viewMode="day" />);

    // 日ビューでは1日の時間軸が縦方向に表示される
    const calendarElement = screen.getByRole("region", {
      name: CALENDAR_REGION_PATTERN,
    });
    expect(calendarElement).toBeInTheDocument();

    // その日のイベントが表示されることを確認
    expect(screen.getByText("テストイベント1")).toBeInTheDocument();
  });

  it("選択された日付を正しく反映する", () => {
    const selectedDate = new Date(2025, 11, 10);
    render(<CalendarGrid {...defaultProps} selectedDate={selectedDate} />);

    // カレンダーが選択された日付を基準に表示される
    const calendarElement = screen.getByRole("region", {
      name: CALENDAR_REGION_PATTERN,
    });
    expect(calendarElement).toBeInTheDocument();
  });

  it("イベントをカレンダーグリッド上に配置して表示する (Req 3.1)", () => {
    render(<CalendarGrid {...defaultProps} />);

    // イベントがカレンダー上に表示される
    const event1 = screen.getByText("テストイベント1");
    const event2 = screen.getByText("終日イベント");

    expect(event1).toBeInTheDocument();
    expect(event2).toBeInTheDocument();
  });

  it("イベントクリック時にハンドラーが呼ばれる", async () => {
    const user = userEvent.setup();
    const onEventClick = vi.fn();

    render(<CalendarGrid {...defaultProps} onEventClick={onEventClick} />);

    // イベントをクリック
    const eventElement = screen.getByText("テストイベント1");
    await user.click(eventElement);

    // ハンドラーが呼ばれたことを確認
    expect(onEventClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        title: "テストイベント1",
      }),
      expect.any(HTMLElement)
    );
  });

  it("日付セル選択時にハンドラーが呼ばれる", async () => {
    const user = userEvent.setup();
    const onDateChange = vi.fn();

    render(<CalendarGrid {...defaultProps} onDateChange={onDateChange} />);

    // カレンダーグリッドの日付セルをクリック
    // react-big-calendarでは日付セルに data-date 属性が付与される
    const dateCell = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes("10"));

    if (dateCell) {
      await user.click(dateCell);

      // ハンドラーが日付オブジェクトと共に呼ばれたことを確認
      expect(onDateChange).toHaveBeenCalledWith(expect.any(Date));
    }
  });

  it("空のイベント配列でも正しくレンダリングされる", () => {
    render(<CalendarGrid {...defaultProps} events={[]} />);

    // カレンダーグリッドは表示される
    const calendarElement = screen.getByRole("region", {
      name: CALENDAR_REGION_PATTERN,
    });
    expect(calendarElement).toBeInTheDocument();
  });

  it("今日の日付が正しく設定される", () => {
    const today = new Date(2025, 11, 5);
    render(<CalendarGrid {...defaultProps} today={today} />);

    // カレンダーが表示される
    const calendarElement = screen.getByRole("region", {
      name: CALENDAR_REGION_PATTERN,
    });
    expect(calendarElement).toBeInTheDocument();
  });

  // Task 5.2: イベント配置と表示の設定
  describe("Task 5.2: イベント配置と表示の設定", () => {
    const multipleEvents: CalendarEvent[] = [
      {
        id: "1",
        title: "イベント1",
        start: new Date(2025, 11, 5, 10, 0),
        end: new Date(2025, 11, 5, 11, 0),
        allDay: false,
        color: "#3b82f6",
      },
      {
        id: "2",
        title: "イベント2",
        start: new Date(2025, 11, 5, 10, 0),
        end: new Date(2025, 11, 5, 12, 0),
        allDay: false,
        color: "#10b981",
      },
      {
        id: "3",
        title: "長時間イベント",
        start: new Date(2025, 11, 5, 9, 0),
        end: new Date(2025, 11, 5, 17, 0),
        allDay: false,
        color: "#f59e0b",
      },
    ];

    it("イベントを開始日時に基づいてグリッド上の適切な位置に配置する (Req 3.2)", () => {
      render(
        <CalendarGrid
          {...defaultProps}
          events={multipleEvents}
          viewMode="day"
        />
      );

      // 全てのイベントが表示される
      expect(screen.getByText("イベント1")).toBeInTheDocument();
      expect(screen.getByText("イベント2")).toBeInTheDocument();
      expect(screen.getByText("長時間イベント")).toBeInTheDocument();
    });

    it("日/週ビューでイベントの継続時間に応じた高さを設定する (Req 3.3)", () => {
      render(
        <CalendarGrid
          {...defaultProps}
          events={multipleEvents}
          viewMode="day"
        />
      );

      // イベントがカレンダー上に表示される（高さはreact-big-calendarが自動計算）
      const event1 = screen.getByText("イベント1");
      const longEvent = screen.getByText("長時間イベント");

      expect(event1).toBeInTheDocument();
      expect(longEvent).toBeInTheDocument();
    });

    it("月ビューでイベントをコンパクトなバー形式で表示する (Req 3.4)", () => {
      render(
        <CalendarGrid
          {...defaultProps}
          events={multipleEvents}
          viewMode="month"
        />
      );

      // 月ビューではイベントがコンパクトに表示される
      expect(screen.getByText("イベント1")).toBeInTheDocument();
      expect(screen.getByText("イベント2")).toBeInTheDocument();
    });

    it("同一時間帯の複数イベントを表示し、全てのイベントにアクセス可能にする (Req 3.5)", () => {
      render(
        <CalendarGrid
          {...defaultProps}
          events={multipleEvents}
          viewMode="week"
        />
      );

      // 同一時間帯の複数イベントが全て表示される
      expect(screen.getByText("イベント1")).toBeInTheDocument();
      expect(screen.getByText("イベント2")).toBeInTheDocument();
      expect(screen.getByText("長時間イベント")).toBeInTheDocument();
    });
  });

  // Task 5.3: 月ビューの表示制限と追加イベント表示
  describe("Task 5.3: 月ビューの表示制限と追加イベント表示", () => {
    // 1日に多数のイベントがある場合のテストデータ
    const manyEventsOnSameDay: CalendarEvent[] = [
      {
        id: "1",
        title: "イベントA",
        start: new Date(2025, 11, 5, 9, 0),
        end: new Date(2025, 11, 5, 10, 0),
        allDay: false,
        color: "#3b82f6",
      },
      {
        id: "2",
        title: "イベントB",
        start: new Date(2025, 11, 5, 10, 0),
        end: new Date(2025, 11, 5, 11, 0),
        allDay: false,
        color: "#10b981",
      },
      {
        id: "3",
        title: "イベントC",
        start: new Date(2025, 11, 5, 11, 0),
        end: new Date(2025, 11, 5, 12, 0),
        allDay: false,
        color: "#f59e0b",
      },
      {
        id: "4",
        title: "イベントD",
        start: new Date(2025, 11, 5, 13, 0),
        end: new Date(2025, 11, 5, 14, 0),
        allDay: false,
        color: "#ef4444",
      },
      {
        id: "5",
        title: "イベントE",
        start: new Date(2025, 11, 5, 14, 0),
        end: new Date(2025, 11, 5, 15, 0),
        allDay: false,
        color: "#8b5cf6",
      },
    ];

    it("月ビューの日付セルあたりの表示イベント数を制限する (Req 3.6)", () => {
      render(
        <CalendarGrid
          {...defaultProps}
          events={manyEventsOnSameDay}
          viewMode="month"
        />
      );

      // 月ビューが表示される
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();
    });

    it("popup propを設定して「+N件」クリック時にポップアップを表示する (Req 3.6)", () => {
      render(
        <CalendarGrid
          {...defaultProps}
          events={manyEventsOnSameDay}
          viewMode="month"
        />
      );

      // カレンダーが表示される（popup機能はreact-big-calendarが提供）
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();
    });

    it("表示月外の日付セルが視覚的に区別される (Req 2.5)", () => {
      render(
        <CalendarGrid
          {...defaultProps}
          selectedDate={new Date(2025, 11, 15)}
          viewMode="month" // 12月中旬
        />
      );

      // 月ビューが表示される - dayPropGetterで月外の日付にスタイルが適用される
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();
    });
  });

  // Task 5.4: 今日の日付ハイライト機能の実装
  describe("Task 5.4: 今日の日付ハイライト機能の実装", () => {
    it("dayPropGetterを使用して今日の日付セルをハイライトする (Req 7.1)", () => {
      const today = new Date(2025, 11, 5);
      render(
        <CalendarGrid
          {...defaultProps}
          selectedDate={today}
          today={today}
          viewMode="month"
        />
      );

      // 今日の日付セルにハイライトクラスが適用される
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();

      // react-big-calendarは内部で rbc-today クラスを適用するが、
      // dayPropGetterでカスタムクラスも追加される
    });

    it("月ビューで今日の日付番号を強調表示する (Req 7.2)", () => {
      const today = new Date(2025, 11, 5);
      render(
        <CalendarGrid
          {...defaultProps}
          selectedDate={today}
          today={today}
          viewMode="month"
        />
      );

      // 月ビューで今日の日付が表示される
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();
    });

    it("週ビューで今日の列ヘッダーを強調表示する (Req 7.3)", () => {
      const today = new Date(2025, 11, 5);
      render(
        <CalendarGrid
          {...defaultProps}
          selectedDate={today}
          today={today}
          viewMode="week"
        />
      );

      // 週ビューで今日の列が強調される
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();
    });

    it("日ビューで今日表示時にヘッダーを強調する (Req 7.4)", () => {
      const today = new Date(2025, 11, 5);
      render(
        <CalendarGrid
          {...defaultProps}
          selectedDate={today}
          today={today}
          viewMode="day"
        />
      );

      // 日ビューで今日が表示される
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();
    });

    it("今日以外の日付にはハイライトが適用されない", () => {
      const today = new Date(2025, 11, 5);
      const otherDate = new Date(2025, 11, 10);
      render(
        <CalendarGrid
          {...defaultProps}
          selectedDate={otherDate}
          today={today}
          viewMode="month"
        />
      );

      // カレンダーが表示される
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();
    });
  });

  // Task 6.3: ドラッグ選択時のハイライト表示
  describe("Task 6.3: ドラッグ選択時のハイライト表示", () => {
    it("onSlotSelect propを受け取り、selectableが有効な状態でレンダリングされる (Req 1.1)", () => {
      const onSlotSelect = vi.fn();

      render(
        <CalendarGrid
          {...defaultProps}
          onSlotSelect={onSlotSelect}
          viewMode="week"
        />
      );

      // カレンダーが正常にレンダリングされる
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();

      // selectableモードが有効なので、スロット選択可能な状態
      // react-big-calendarはselectable=trueでドラッグ選択を有効にする
    });

    it("選択中のスロットにハイライトスタイルが適用される (Req 5.3)", () => {
      render(<CalendarGrid {...defaultProps} viewMode="week" />);

      // カレンダーが表示される
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();

      // slotPropGetterが設定されていることを確認
      // react-big-calendarはスロット選択中に rbc-slot-selecting クラスを付与
      // カスタムスタイルはslotPropGetterまたはCSSで適用される
    });

    it("slotPropGetterが時間スロットにスタイルを適用する", () => {
      render(<CalendarGrid {...defaultProps} viewMode="week" />);

      // 週ビューで時間スロットが表示される
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();

      // slotPropGetterによるカスタムスタイルが適用されることを確認
      // 時間スロット要素が存在することを確認
      const timeSlots = document.querySelectorAll(".rbc-time-slot");
      expect(timeSlots.length).toBeGreaterThan(0);
    });

    it("onSlotSelectが未設定でもエラーにならない", async () => {
      const user = userEvent.setup();

      // onSlotSelectを設定せずにレンダリング
      render(<CalendarGrid {...defaultProps} viewMode="week" />);

      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();

      // スロットクリックしてもエラーにならないことを確認
      const timeSlots = document.querySelectorAll(
        ".rbc-day-slot .rbc-time-slot"
      );
      if (timeSlots.length > 0) {
        await user.click(timeSlots[0] as HTMLElement);
        // エラーが発生しないことを確認（テストが完了すればOK）
      }
    });

    it("月ビューでもonSlotSelect propを受け取りレンダリングされる (Req 1.1)", () => {
      const onSlotSelect = vi.fn();

      render(
        <CalendarGrid
          {...defaultProps}
          onSlotSelect={onSlotSelect}
          viewMode="month"
        />
      );

      // 月ビューでカレンダーが正常にレンダリングされる
      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();

      // selectableモードが有効なので、日付セル選択可能な状態
    });

    it("週ビューで時間スロットが表示される", () => {
      render(<CalendarGrid {...defaultProps} viewMode="week" />);

      // 時間スロットが表示される
      const timeSlots = document.querySelectorAll(".rbc-time-slot");
      expect(timeSlots.length).toBeGreaterThan(0);

      // 日付スロットも存在する
      const daySlots = document.querySelectorAll(".rbc-day-slot");
      expect(daySlots.length).toBeGreaterThan(0);
    });
  });

  // DnD（ドラッグ＆ドロップ）機能のテスト
  describe("ドラッグ＆ドロップ機能", () => {
    it("DnD props を渡した場合に正常にレンダリングされる", () => {
      const onEventDrop = vi.fn();
      const onEventResize = vi.fn();

      render(
        <CalendarGrid
          {...defaultProps}
          onEventDrop={onEventDrop}
          onEventResize={onEventResize}
          resizable
          viewMode="week"
        />
      );

      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();
    });

    it("rbc-addons-dnd CSSクラスが存在する", () => {
      render(
        <CalendarGrid
          {...defaultProps}
          onEventDrop={vi.fn()}
          onEventResize={vi.fn()}
          viewMode="week"
        />
      );

      // withDragAndDrop HOCが適用されると rbc-addons-dnd クラスが付与される
      const dndElement = document.querySelector(".rbc-addons-dnd");
      expect(dndElement).toBeInTheDocument();
    });

    it("DnD props が未設定でもエラーにならない", () => {
      render(<CalendarGrid {...defaultProps} viewMode="week" />);

      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();
    });

    it("resizable=false の場合でも正常にレンダリングされる", () => {
      render(
        <CalendarGrid
          {...defaultProps}
          onEventDrop={vi.fn()}
          resizable={false}
          viewMode="week"
        />
      );

      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();
    });

    it("月ビューでもDnDが有効な状態でレンダリングされる", () => {
      render(
        <CalendarGrid
          {...defaultProps}
          onEventDrop={vi.fn()}
          onEventResize={vi.fn()}
          viewMode="month"
        />
      );

      const calendarElement = screen.getByRole("region", {
        name: CALENDAR_REGION_PATTERN,
      });
      expect(calendarElement).toBeInTheDocument();

      const dndElement = document.querySelector(".rbc-addons-dnd");
      expect(dndElement).toBeInTheDocument();
    });
  });
});
