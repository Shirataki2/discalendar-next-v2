/**
 * @file ThemeSwitcher コンポーネントのテスト
 * @description テーマ切り替えコンポーネントの動作を検証
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Import component
import { ThemeSwitcher } from "./theme-switcher";

describe("ThemeSwitcher - テーマ切り替えコンポーネント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("レンダリングされること", async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <ThemeSwitcher />
      </ThemeProvider>
    );

    // マウント後にボタンが表示されることを待つ
    await waitFor(() => {
      const trigger = screen.getByTestId("theme-switcher-trigger");
      expect(trigger).toBeInTheDocument();
    });
  });

  it("ボタンをクリックするとメニューが開くこと", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <ThemeSwitcher />
      </ThemeProvider>
    );

    // マウント後にボタンをクリック
    await waitFor(() => {
      const trigger = screen.getByTestId("theme-switcher-trigger");
      expect(trigger).toBeInTheDocument();
    });

    const trigger = screen.getByTestId("theme-switcher-trigger");
    await user.click(trigger);

    // メニューアイテムが表示されることを確認
    await waitFor(() => {
      expect(screen.getByTestId("theme-light")).toBeInTheDocument();
      expect(screen.getByTestId("theme-dark")).toBeInTheDocument();
      expect(screen.getByTestId("theme-system")).toBeInTheDocument();
    });
  });

  it("ライトテーマを選択できること", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <ThemeSwitcher />
      </ThemeProvider>
    );

    // マウント後にボタンをクリック
    await waitFor(() => {
      const trigger = screen.getByTestId("theme-switcher-trigger");
      expect(trigger).toBeInTheDocument();
    });

    const trigger = screen.getByTestId("theme-switcher-trigger");
    await user.click(trigger);

    // ライトテーマを選択
    const lightOption = await screen.findByTestId("theme-light");
    await user.click(lightOption);

    // メニューが閉じることを確認
    await waitFor(() => {
      expect(screen.queryByTestId("theme-light")).not.toBeInTheDocument();
    });
  });

  it("ダークテーマを選択できること", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <ThemeSwitcher />
      </ThemeProvider>
    );

    await waitFor(() => {
      const trigger = screen.getByTestId("theme-switcher-trigger");
      expect(trigger).toBeInTheDocument();
    });

    const trigger = screen.getByTestId("theme-switcher-trigger");
    await user.click(trigger);

    // ダークテーマを選択
    const darkOption = await screen.findByTestId("theme-dark");
    await user.click(darkOption);

    // メニューが閉じることを確認
    await waitFor(() => {
      expect(screen.queryByTestId("theme-dark")).not.toBeInTheDocument();
    });
  });

  it("システムテーマを選択できること", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <ThemeSwitcher />
      </ThemeProvider>
    );

    await waitFor(() => {
      const trigger = screen.getByTestId("theme-switcher-trigger");
      expect(trigger).toBeInTheDocument();
    });

    const trigger = screen.getByTestId("theme-switcher-trigger");
    await user.click(trigger);

    // システムテーマを選択
    const systemOption = await screen.findByTestId("theme-system");
    await user.click(systemOption);

    // メニューが閉じることを確認
    await waitFor(() => {
      expect(screen.queryByTestId("theme-system")).not.toBeInTheDocument();
    });
  });

  it("アクセシビリティ: スクリーンリーダー用のテキストが含まれていること", async () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <ThemeSwitcher />
      </ThemeProvider>
    );

    await waitFor(() => {
      const srText = screen.getByText("テーマを切り替える");
      expect(srText).toBeInTheDocument();
      expect(srText).toHaveClass("sr-only");
    });
  });
});
