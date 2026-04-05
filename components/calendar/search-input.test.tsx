/**
 * SearchInput - テスト
 *
 * タスク2.1: SearchInputコンポーネントのテスト
 * - デスクトップ: インライン入力フィールド表示
 * - デスクトップ: onChange呼び出し、クリアボタン
 * - モバイル: トグルボタン表示、展開/折りたたみ
 * - Escキー: クリア＋blur
 * - アクセシビリティ: aria-label
 * - matchCount: 検索結果件数表示
 */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "./search-input";

describe("SearchInput", () => {
  const defaultDesktopProps = {
    value: "",
    onChange: vi.fn(),
    isMobile: false,
    matchCount: null,
  };

  const defaultMobileProps = {
    value: "",
    onChange: vi.fn(),
    isMobile: true,
    matchCount: null,
  };

  describe("デスクトップ表示", () => {
    it("インライン入力フィールドが表示される", () => {
      render(<SearchInput {...defaultDesktopProps} />);

      const input = screen.getByTestId("search-input");
      expect(input).toBeInTheDocument();
    });

    it("入力時にonChangeが呼ばれる", () => {
      const onChange = vi.fn();
      render(<SearchInput {...defaultDesktopProps} onChange={onChange} />);

      const input = screen.getByTestId("search-input");
      fireEvent.change(input, { target: { value: "テスト" } });

      expect(onChange).toHaveBeenCalledWith("テスト");
    });

    it("クリアボタンで入力がクリアされる", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <SearchInput
          {...defaultDesktopProps}
          onChange={onChange}
          value="ミーティング"
        />
      );

      const clearButton = screen.getByTestId("search-clear-button");
      await user.click(clearButton);

      expect(onChange).toHaveBeenCalledWith("");
    });
  });

  describe("モバイル表示", () => {
    it("初期状態でトグルボタンが表示される", () => {
      render(<SearchInput {...defaultMobileProps} />);

      const toggleButton = screen.getByTestId("search-toggle-button");
      expect(toggleButton).toBeInTheDocument();
      expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
    });

    it("トグルボタンクリックで入力フィールドが展開される", async () => {
      const user = userEvent.setup();
      render(<SearchInput {...defaultMobileProps} />);

      const toggleButton = screen.getByTestId("search-toggle-button");
      await user.click(toggleButton);

      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });
  });

  describe("キーボード操作", () => {
    it("Escキーで入力がクリアされblurされる", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <SearchInput
          {...defaultDesktopProps}
          onChange={onChange}
          value="テスト"
        />
      );

      const input = screen.getByTestId("search-input");
      input.focus();
      await user.keyboard("{Escape}");

      expect(onChange).toHaveBeenCalledWith("");
      expect(input).not.toHaveFocus();
    });
  });

  describe("アクセシビリティ", () => {
    it('aria-label="イベントを検索" が設定されている', () => {
      render(<SearchInput {...defaultDesktopProps} />);

      const input = screen.getByLabelText("イベントを検索");
      expect(input).toBeInTheDocument();
    });
  });

  describe("matchCount表示", () => {
    it("検索アクティブ時にmatchCountが表示される", () => {
      render(
        <SearchInput
          {...defaultDesktopProps}
          matchCount={3}
          value="ミーティング"
        />
      );

      expect(screen.getByText("3件")).toBeInTheDocument();
    });

    it("valueが空の場合はmatchCountが表示されない", () => {
      render(<SearchInput {...defaultDesktopProps} matchCount={3} value="" />);

      expect(screen.queryByText("3件")).not.toBeInTheDocument();
    });

    it("matchCountがnullの場合は件数が表示されない", () => {
      render(
        <SearchInput
          {...defaultDesktopProps}
          matchCount={null}
          value="テスト"
        />
      );

      expect(screen.queryByText(/件$/)).not.toBeInTheDocument();
    });

    it("matchCountが0の場合は0件と表示される", () => {
      render(
        <SearchInput
          {...defaultDesktopProps}
          matchCount={0}
          value="存在しない"
        />
      );

      expect(screen.getByText("0件")).toBeInTheDocument();
    });
  });
});
