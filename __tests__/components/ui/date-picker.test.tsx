import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePicker } from "@/components/ui/date-picker";

describe("DatePicker", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Popover開閉 (Req 1.1)", () => {
    it("ボタンクリックでカレンダーPopoverが表示される", () => {
      render(<DatePicker onChange={vi.fn()} value={undefined} />);

      const trigger = screen.getByRole("button");
      fireEvent.click(trigger);

      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    it("初期状態ではカレンダーが非表示", () => {
      render(<DatePicker onChange={vi.fn()} value={undefined} />);

      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });
  });

  describe("日付選択 (Req 1.2)", () => {
    it("日付を選択するとonChangeが正しいDateで呼ばれる", () => {
      const onChange = vi.fn();
      const value = new Date(2026, 1, 15); // 2026-02-15

      render(<DatePicker onChange={onChange} value={value} />);

      // Popoverを開く
      fireEvent.click(screen.getByRole("button"));

      // 別の日付を選択（20日）
      const day20 = screen.getByRole("gridcell", { name: "20" });
      const dayButton = day20.querySelector("button");
      if (dayButton) {
        fireEvent.click(dayButton);
      }

      expect(onChange).toHaveBeenCalledWith(expect.any(Date));
      const calledDate = onChange.mock.calls[0][0] as Date;
      expect(calledDate.getDate()).toBe(20);
      expect(calledDate.getMonth()).toBe(1); // February
      expect(calledDate.getFullYear()).toBe(2026);
    });

    it("日付選択後にPopoverが閉じる", async () => {
      const value = new Date(2026, 1, 15);
      render(<DatePicker onChange={vi.fn()} value={value} />);

      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("grid")).toBeInTheDocument();

      // 日付を選択
      const day20 = screen.getByRole("gridcell", { name: "20" });
      const dayButton = day20.querySelector("button");
      if (dayButton) {
        fireEvent.click(dayButton);
      }

      // Popoverが閉じるまで待つ
      await vi.waitFor(() => {
        expect(screen.queryByRole("grid")).not.toBeInTheDocument();
      });
    });
  });

  describe("表示フォーマット", () => {
    it("値がない場合はプレースホルダーが表示される", () => {
      render(
        <DatePicker
          onChange={vi.fn()}
          placeholder="日付を選択"
          value={undefined}
        />
      );

      expect(screen.getByText("日付を選択")).toBeInTheDocument();
    });

    it("値がある場合はフォーマットされた日付が表示される", () => {
      const value = new Date(2026, 1, 15);
      render(<DatePicker onChange={vi.fn()} value={value} />);

      // date-fns の format で "yyyy/MM/dd" 形式
      expect(screen.getByText("2026/02/15")).toBeInTheDocument();
    });
  });

  describe("disabled状態 (Req 1.1)", () => {
    it("disabled時はボタンが無効化される", () => {
      render(<DatePicker disabled onChange={vi.fn()} value={undefined} />);

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("disabled時はクリックしてもPopoverが開かない", () => {
      render(<DatePicker disabled onChange={vi.fn()} value={undefined} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });
  });

  describe("エラー状態", () => {
    it("hasError時にborder-destructiveクラスが適用される", () => {
      render(<DatePicker hasError onChange={vi.fn()} value={undefined} />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("border-destructive");
    });
  });

  describe("ARIA属性 (Req 5.3)", () => {
    it("aria-labelが設定される", () => {
      render(
        <DatePicker
          aria-label="開始日を選択"
          onChange={vi.fn()}
          value={undefined}
        />
      );

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "開始日を選択"
      );
    });

    it("aria-describedbyが設定される", () => {
      render(
        <DatePicker
          aria-describedby="start-date-error"
          onChange={vi.fn()}
          value={undefined}
        />
      );

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-describedby",
        "start-date-error"
      );
    });
  });
});
