/**
 * ColorPicker - テスト
 *
 * タスク1.1: プリセットカラーパレットと選択インタラクションを実装する
 * - プリセット9色のカラースウォッチをグリッド表示
 * - value / onChange / disabled propsによるControlled Component
 * - 選択状態のチェックマーク＋リング表示
 * - キーボード操作（Enter/Space）
 * - ARIA属性（role, aria-checked, aria-label）
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 4.5, 5.1, 5.2, 5.3, 5.4
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ColorPicker } from "./color-picker";

const PRESET_COLOR_COUNT = 9;

// トップレベルに正規表現を定義（パフォーマンス最適化）
const BLUE_PATTERN = /Blue \(#3B82F6\)/;
const GREEN_PATTERN = /Green \(#22C55E\)/;
const AMBER_PATTERN = /Amber \(#F59E0B\)/;
const RED_PATTERN = /Red \(#EF4444\)/;
const VIOLET_PATTERN = /Violet \(#8B5CF6\)/;
const ORANGE_PATTERN = /Orange \(#F97316\)/;
const GRAY_PATTERN = /Gray \(#6B7280\)/;
const HEX_FORMAT_PATTERN = /^#[0-9A-Fa-f]{6}$/;

describe("ColorPicker", () => {
  const defaultProps = {
    value: "#3B82F6",
    onChange: vi.fn(),
  };

  describe("プリセットカラーパレットの表示 (Req 1.1, 1.2, 1.3)", () => {
    it("プリセットカラースウォッチが9個レンダリングされる", () => {
      render(<ColorPicker {...defaultProps} />);

      const swatches = screen.getAllByRole("radio");
      expect(swatches).toHaveLength(PRESET_COLOR_COUNT);
    });

    it("パレット全体がradiogroupでグループ化されている", () => {
      render(<ColorPicker {...defaultProps} />);

      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    });

    it("各スウォッチに色名とHEXコードを含むaria-labelが設定されている (Req 5.2)", () => {
      render(<ColorPicker {...defaultProps} />);

      expect(
        screen.getByRole("radio", { name: BLUE_PATTERN })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: GREEN_PATTERN })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: GRAY_PATTERN })
      ).toBeInTheDocument();
    });
  });

  describe("カラー選択インタラクション (Req 2.1, 2.2, 2.3, 2.4, 2.5)", () => {
    it("スウォッチクリックでonChangeが正しいHEX値で呼ばれる (Req 2.1)", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ColorPicker {...defaultProps} onChange={onChange} />);

      const greenSwatch = screen.getByRole("radio", {
        name: GREEN_PATTERN,
      });
      await user.click(greenSwatch);

      expect(onChange).toHaveBeenCalledWith("#22C55E");
    });

    it("value propに一致するスウォッチが選択状態になる (Req 2.4)", () => {
      render(<ColorPicker {...defaultProps} value="#EF4444" />);

      const redSwatch = screen.getByRole("radio", {
        name: RED_PATTERN,
      });
      expect(redSwatch).toHaveAttribute("aria-checked", "true");
    });

    it("選択中のスウォッチにチェックマークが表示される (Req 2.2)", () => {
      render(<ColorPicker {...defaultProps} value="#3B82F6" />);

      const blueSwatch = screen.getByRole("radio", {
        name: BLUE_PATTERN,
      });
      const checkIcon = blueSwatch.querySelector("svg");
      expect(checkIcon).not.toBeNull();
    });

    it("選択されていないスウォッチにはチェックマークが表示されない (Req 2.2)", () => {
      render(<ColorPicker {...defaultProps} value="#3B82F6" />);

      const greenSwatch = screen.getByRole("radio", {
        name: GREEN_PATTERN,
      });
      const checkIcon = greenSwatch.querySelector("svg");
      expect(checkIcon).toBeNull();
    });

    it("プリセット外のvalueではどのスウォッチも選択状態にならない (Req 2.5)", () => {
      render(<ColorPicker {...defaultProps} value="#FF00FF" />);

      const swatches = screen.getAllByRole("radio");
      for (const swatch of swatches) {
        expect(swatch).toHaveAttribute("aria-checked", "false");
      }
    });
  });

  describe("アクセシビリティ (Req 5.1, 5.3, 5.4)", () => {
    it("aria-checkedが選択状態に応じて正しく設定される (Req 5.4)", () => {
      render(<ColorPicker {...defaultProps} value="#22C55E" />);

      const greenSwatch = screen.getByRole("radio", {
        name: GREEN_PATTERN,
      });
      expect(greenSwatch).toHaveAttribute("aria-checked", "true");

      const blueSwatch = screen.getByRole("radio", {
        name: BLUE_PATTERN,
      });
      expect(blueSwatch).toHaveAttribute("aria-checked", "false");
    });

    it("Enter キーでスウォッチを選択できる (Req 5.3)", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ColorPicker {...defaultProps} onChange={onChange} />);

      const amberSwatch = screen.getByRole("radio", {
        name: AMBER_PATTERN,
      });
      amberSwatch.focus();
      await user.keyboard("{Enter}");

      expect(onChange).toHaveBeenCalledWith("#F59E0B");
    });

    it("Space キーでスウォッチを選択できる (Req 5.3)", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ColorPicker {...defaultProps} onChange={onChange} />);

      const violetSwatch = screen.getByRole("radio", {
        name: VIOLET_PATTERN,
      });
      violetSwatch.focus();
      await user.keyboard(" ");

      expect(onChange).toHaveBeenCalledWith("#8B5CF6");
    });

    it("各スウォッチにキーボードフォーカスが当てられる (Req 5.1)", () => {
      render(<ColorPicker {...defaultProps} />);

      const swatches = screen.getAllByRole("radio");
      for (const swatch of swatches) {
        expect(swatch.tabIndex).not.toBe(-1);
      }
    });
  });

  describe("disabled状態", () => {
    it("disabled時にスウォッチクリックでonChangeが呼ばれない", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ColorPicker {...defaultProps} disabled onChange={onChange} />);

      const greenSwatch = screen.getByRole("radio", {
        name: GREEN_PATTERN,
      });
      await user.click(greenSwatch);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("値の形式 (Req 4.5)", () => {
    it("onChangeに渡される値は#RRGGBB形式である", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ColorPicker {...defaultProps} onChange={onChange} />);

      const orangeSwatch = screen.getByRole("radio", {
        name: ORANGE_PATTERN,
      });
      await user.click(orangeSwatch);

      const value = onChange.mock.calls[0][0] as string;
      expect(value).toMatch(HEX_FORMAT_PATTERN);
    });
  });
});
