import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimePicker } from "@/components/ui/time-picker";

describe("TimePicker", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Popover開閉 (Req 2.1)", () => {
    it("ボタンクリックで時刻選択Popoverが表示される", () => {
      render(<TimePicker onChange={vi.fn()} value={undefined} />);

      const trigger = screen.getByRole("button");
      fireEvent.click(trigger);

      // 時間と分のlistboxが表示される
      const listboxes = screen.getAllByRole("listbox");
      expect(listboxes).toHaveLength(2);
    });

    it("初期状態では時刻選択UIが非表示", () => {
      render(<TimePicker onChange={vi.fn()} value={undefined} />);

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("時間選択 (Req 2.3, 2.4)", () => {
    it("時間を選択するとonChangeが正しいDateで呼ばれる", () => {
      const onChange = vi.fn();
      const value = new Date(2026, 1, 15, 10, 30);

      render(<TimePicker onChange={onChange} value={value} />);

      fireEvent.click(screen.getByRole("button"));

      // 14時を選択
      const hour14 = screen.getByRole("option", { name: "14" });
      fireEvent.click(hour14);

      expect(onChange).toHaveBeenCalledWith(expect.any(Date));
      const calledDate = onChange.mock.calls[0][0] as Date;
      expect(calledDate.getHours()).toBe(14);
      // 分は元の値を保持
      expect(calledDate.getMinutes()).toBe(30);
    });
  });

  describe("分選択 (Req 2.2, 2.3)", () => {
    it("分を選択するとonChangeが正しいDateで呼ばれる", () => {
      const onChange = vi.fn();
      const value = new Date(2026, 1, 15, 10, 30);

      render(<TimePicker onChange={onChange} value={value} />);

      fireEvent.click(screen.getByRole("button"));

      // 45分を選択
      const minute45 = screen.getByRole("option", { name: "45" });
      fireEvent.click(minute45);

      expect(onChange).toHaveBeenCalledWith(expect.any(Date));
      const calledDate = onChange.mock.calls[0][0] as Date;
      expect(calledDate.getMinutes()).toBe(45);
      // 時間は元の値を保持
      expect(calledDate.getHours()).toBe(10);
    });

    it("デフォルトで5分刻みの選択肢が生成される", () => {
      render(
        <TimePicker onChange={vi.fn()} value={new Date(2026, 1, 15, 10, 0)} />
      );

      fireEvent.click(screen.getByRole("button"));

      // 分リストに00, 05, 10, ..., 55 が存在する（12個）
      const listboxes = screen.getAllByRole("listbox");
      const minuteListbox = listboxes[1];
      const minuteOptions = minuteListbox.querySelectorAll('[role="option"]');
      expect(minuteOptions).toHaveLength(12);

      // 先頭と末尾を確認
      expect(minuteOptions[0]).toHaveTextContent("00");
      expect(minuteOptions[1]).toHaveTextContent("05");
      expect(minuteOptions[11]).toHaveTextContent("55");
    });
  });

  describe("minuteStepプロパティ (Req 2.2)", () => {
    it("minuteStep=15で15分刻みの選択肢が生成される", () => {
      render(
        <TimePicker
          minuteStep={15}
          onChange={vi.fn()}
          value={new Date(2026, 1, 15, 10, 0)}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      const listboxes = screen.getAllByRole("listbox");
      const minuteListbox = listboxes[1];
      const minuteOptions = minuteListbox.querySelectorAll('[role="option"]');
      expect(minuteOptions).toHaveLength(4); // 00, 15, 30, 45

      expect(minuteOptions[0]).toHaveTextContent("00");
      expect(minuteOptions[1]).toHaveTextContent("15");
      expect(minuteOptions[2]).toHaveTextContent("30");
      expect(minuteOptions[3]).toHaveTextContent("45");
    });
  });

  describe("時間リスト (Req 2.4)", () => {
    it("0-23時の24個の選択肢が表示される", () => {
      render(
        <TimePicker onChange={vi.fn()} value={new Date(2026, 1, 15, 10, 0)} />
      );

      fireEvent.click(screen.getByRole("button"));

      const listboxes = screen.getAllByRole("listbox");
      const hourListbox = listboxes[0];
      const hourOptions = hourListbox.querySelectorAll('[role="option"]');
      expect(hourOptions).toHaveLength(24);

      expect(hourOptions[0]).toHaveTextContent("0");
      expect(hourOptions[23]).toHaveTextContent("23");
    });
  });

  describe("表示フォーマット", () => {
    it("値がない場合はプレースホルダーが表示される", () => {
      render(
        <TimePicker
          onChange={vi.fn()}
          placeholder="時刻を選択"
          value={undefined}
        />
      );

      expect(screen.getByText("時刻を選択")).toBeInTheDocument();
    });

    it("値がある場合はHH:mm形式で表示される", () => {
      const value = new Date(2026, 1, 15, 9, 5);
      render(<TimePicker onChange={vi.fn()} value={value} />);

      expect(screen.getByText("09:05")).toBeInTheDocument();
    });
  });

  describe("disabled状態", () => {
    it("disabled時はボタンが無効化される", () => {
      render(<TimePicker disabled onChange={vi.fn()} value={undefined} />);

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("disabled時はクリックしてもPopoverが開かない", () => {
      render(<TimePicker disabled onChange={vi.fn()} value={undefined} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("エラー状態", () => {
    it("hasError時にborder-destructiveクラスが適用される", () => {
      render(<TimePicker hasError onChange={vi.fn()} value={undefined} />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("border-destructive");
    });
  });

  describe("ARIA属性 (Req 5.3)", () => {
    it("aria-labelが設定される", () => {
      render(
        <TimePicker
          aria-label="開始時刻を選択"
          onChange={vi.fn()}
          value={undefined}
        />
      );

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "開始時刻を選択"
      );
    });

    it("aria-describedbyが設定される", () => {
      render(
        <TimePicker
          aria-describedby="start-time-error"
          onChange={vi.fn()}
          value={undefined}
        />
      );

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-describedby",
        "start-time-error"
      );
    });
  });

  describe("aria-selected (Req 2.4)", () => {
    it("選択中の時間にaria-selected=trueが設定される", () => {
      const value = new Date(2026, 1, 15, 14, 30);
      render(<TimePicker onChange={vi.fn()} value={value} />);

      fireEvent.click(screen.getByRole("button"));

      const hour14 = screen.getByRole("option", { name: "14" });
      expect(hour14).toHaveAttribute("aria-selected", "true");
    });

    it("選択中の分にaria-selected=trueが設定される", () => {
      const value = new Date(2026, 1, 15, 14, 30);
      render(<TimePicker onChange={vi.fn()} value={value} />);

      fireEvent.click(screen.getByRole("button"));

      const minute30 = screen.getByRole("option", { name: "30" });
      expect(minute30).toHaveAttribute("aria-selected", "true");
    });
  });
});
