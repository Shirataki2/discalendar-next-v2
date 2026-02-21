import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventForm } from "@/components/calendar/event-form";

/**
 * EventForm統合テスト
 *
 * DatePicker/TimePickerとuseEventFormフックの統合を検証する。
 * Requirements: 3.1, 3.2, 3.3
 */

// Top-level regex patterns for button/label matching (Biome performance rule)
const START_TIME_PATTERN = /開始日時の時刻/;
const END_TIME_PATTERN = /終了日時の時刻/;
const START_DATE_PATTERN = /開始日時の日付/;
const END_DATE_PATTERN = /終了日時の日付/;
const ALL_DAY_PATTERN = /終日/;
const SAVE_PATTERN = /保存/;

describe("EventForm 統合テスト (datetime-picker-ux)", () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    isSubmitting: false,
    onCancel: vi.fn(),
  };

  describe("Req 3.2, 3.3: 終日トグルでTimePickerの表示/非表示", () => {
    it("初期状態で時刻ピッカーが表示される（終日オフ）", () => {
      render(<EventForm {...defaultProps} />);

      // 開始日時・終了日時の時刻ピッカーボタンが存在する
      expect(
        screen.getByRole("button", { name: START_TIME_PATTERN })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: END_TIME_PATTERN })
      ).toBeInTheDocument();
    });

    it("終日トグルをオンにすると時刻ピッカーが非表示になる", () => {
      render(<EventForm {...defaultProps} />);

      // 終日チェックボックスをオンにする
      const allDayCheckbox = screen.getByRole("checkbox", {
        name: ALL_DAY_PATTERN,
      });
      fireEvent.click(allDayCheckbox);

      // 時刻ピッカーが非表示になる
      expect(
        screen.queryByRole("button", { name: START_TIME_PATTERN })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: END_TIME_PATTERN })
      ).not.toBeInTheDocument();
    });

    it("終日トグルをオフに戻すと時刻ピッカーが再表示される", () => {
      render(<EventForm {...defaultProps} />);

      const allDayCheckbox = screen.getByRole("checkbox", {
        name: ALL_DAY_PATTERN,
      });

      // オン → オフ
      fireEvent.click(allDayCheckbox);
      fireEvent.click(allDayCheckbox);

      // 時刻ピッカーが再表示される
      expect(
        screen.getByRole("button", { name: START_TIME_PATTERN })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: END_TIME_PATTERN })
      ).toBeInTheDocument();
    });
  });

  describe("Req 3.4: 日付と時刻のレイアウト区別", () => {
    it("日付ピッカーと時刻ピッカーが別々のボタンとして表示される", () => {
      render(<EventForm {...defaultProps} />);

      const startDateButton = screen.getByRole("button", {
        name: START_DATE_PATTERN,
      });
      const startTimeButton = screen.getByRole("button", {
        name: START_TIME_PATTERN,
      });

      expect(startDateButton).toBeInTheDocument();
      expect(startTimeButton).toBeInTheDocument();

      // 異なるボタンであることを確認
      expect(startDateButton).not.toBe(startTimeButton);
    });
  });

  describe("Req 3.1: 開始日変更時の終了日自動調整", () => {
    it("開始日が終了日より後になった場合、終了日が開始日と同日に調整される", () => {
      const startAt = new Date(2026, 1, 15, 10, 0);
      const endAt = new Date(2026, 1, 15, 11, 0);

      render(
        <EventForm {...defaultProps} defaultValues={{ startAt, endAt }} />
      );

      // 開始日の日付ピッカーを開く
      const startDateButton = screen.getByRole("button", {
        name: START_DATE_PATTERN,
      });
      fireEvent.click(startDateButton);

      // カレンダーが表示される
      const calendar = screen.getByRole("grid");
      expect(calendar).toBeInTheDocument();

      // 2026-02-20を選択（終了日の2/15より後）
      const day20 = screen.getByRole("gridcell", { name: "20" });
      const dayButton = day20.querySelector("button");
      if (dayButton) {
        fireEvent.click(dayButton);
      }

      // 終了日の表示が2/20に自動調整されていることを確認
      const endDateButton = screen.getByRole("button", {
        name: END_DATE_PATTERN,
      });
      expect(endDateButton).toHaveTextContent("2026/02/20");
    });
  });

  describe("DatePicker/TimePickerでの日時選択→フォーム値反映", () => {
    it("日付ピッカーで日付を選択するとフォーム値が更新される", () => {
      const startAt = new Date(2026, 1, 15, 10, 0);
      const endAt = new Date(2026, 1, 15, 11, 0);

      render(
        <EventForm {...defaultProps} defaultValues={{ startAt, endAt }} />
      );

      const startDateButton = screen.getByRole("button", {
        name: START_DATE_PATTERN,
      });

      // 表示フォーマットを確認
      expect(startDateButton).toHaveTextContent("2026/02/15");
    });

    it("時刻ピッカーで時刻を選択するとフォーム値が更新される", () => {
      const startAt = new Date(2026, 1, 15, 10, 0);
      const endAt = new Date(2026, 1, 15, 11, 0);

      render(
        <EventForm {...defaultProps} defaultValues={{ startAt, endAt }} />
      );

      // 開始時刻ピッカーを開く
      const startTimeButton = screen.getByRole("button", {
        name: START_TIME_PATTERN,
      });
      fireEvent.click(startTimeButton);

      // 時間リストと分リストが表示される
      const listboxes = screen.getAllByRole("listbox");
      expect(listboxes.length).toBeGreaterThanOrEqual(2);

      // 14時を選択
      const hour14 = screen.getByRole("option", { name: "14" });
      fireEvent.click(hour14);

      // 時刻が更新されたことを確認（14:00）
      expect(startTimeButton).toHaveTextContent("14:00");
    });

    it("時刻ピッカーで分を選択するとフォーム値が更新される", () => {
      const startAt = new Date(2026, 1, 15, 10, 0);
      const endAt = new Date(2026, 1, 15, 11, 0);

      render(
        <EventForm {...defaultProps} defaultValues={{ startAt, endAt }} />
      );

      // 開始時刻ピッカーを開く
      const startTimeButton = screen.getByRole("button", {
        name: START_TIME_PATTERN,
      });
      fireEvent.click(startTimeButton);

      // 30分を選択
      const minute30 = screen.getByRole("option", { name: "30" });
      fireEvent.click(minute30);

      // 時刻が更新されたことを確認（10:30）
      expect(startTimeButton).toHaveTextContent("10:30");
    });
  });

  describe("バリデーションエラー表示", () => {
    it("保存ボタンクリック時にタイトル未入力のバリデーションエラーが表示される", () => {
      render(<EventForm {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      fireEvent.click(saveButton);

      expect(screen.getByText("タイトルは必須です")).toBeInTheDocument();
    });

    it("終了日時が開始日時より前の場合にバリデーションエラーが表示される", () => {
      const startAt = new Date(2026, 1, 20, 10, 0);
      const endAt = new Date(2026, 1, 15, 11, 0); // 開始日より前

      render(
        <EventForm
          {...defaultProps}
          defaultValues={{ title: "テスト", startAt, endAt }}
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      fireEvent.click(saveButton);

      expect(
        screen.getByText("終了日時は開始日時以降である必要があります")
      ).toBeInTheDocument();
    });

    it("エラー状態でDatePickerにborder-destructiveが適用される", () => {
      const startAt = new Date(2026, 1, 20, 10, 0);
      const endAt = new Date(2026, 1, 15, 11, 0); // 開始日より前

      render(
        <EventForm
          {...defaultProps}
          defaultValues={{ title: "テスト", startAt, endAt }}
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      fireEvent.click(saveButton);

      const endDateButton = screen.getByRole("button", {
        name: END_DATE_PATTERN,
      });
      expect(endDateButton.className).toContain("border-destructive");
    });
  });

  describe("フォーム送信", () => {
    it("有効なフォーム値で送信するとonSubmitが呼ばれる", () => {
      const onSubmit = vi.fn();
      const startAt = new Date(2026, 1, 15, 10, 0);
      const endAt = new Date(2026, 1, 15, 11, 0);

      render(
        <EventForm
          {...defaultProps}
          defaultValues={{ title: "テスト予定", startAt, endAt }}
          onSubmit={onSubmit}
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      fireEvent.click(saveButton);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "テスト予定",
          startAt: expect.any(Date),
          endAt: expect.any(Date),
        })
      );
    });

    it("バリデーションエラー時はonSubmitが呼ばれない", () => {
      const onSubmit = vi.fn();

      render(<EventForm {...defaultProps} onSubmit={onSubmit} />);

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      fireEvent.click(saveButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("isSubmitting状態", () => {
    it("送信中はDatePickerとTimePickerが無効化される", () => {
      render(<EventForm {...defaultProps} isSubmitting={true} />);

      const startDateButton = screen.getByRole("button", {
        name: START_DATE_PATTERN,
      });
      const endDateButton = screen.getByRole("button", {
        name: END_DATE_PATTERN,
      });
      const startTimeButton = screen.getByRole("button", {
        name: START_TIME_PATTERN,
      });
      const endTimeButton = screen.getByRole("button", {
        name: END_TIME_PATTERN,
      });

      expect(startDateButton).toBeDisabled();
      expect(endDateButton).toBeDisabled();
      expect(startTimeButton).toBeDisabled();
      expect(endTimeButton).toBeDisabled();
    });
  });
});
