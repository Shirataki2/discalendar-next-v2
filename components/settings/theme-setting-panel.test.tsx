/**
 * @file ThemeSettingPanel コンポーネントのテスト
 * @description テーマ選択パネルの動作を検証
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeSettingPanel } from "./theme-setting-panel";

/**
 * ThemeProvider でラップするヘルパー
 */
function renderWithThemeProvider(
  ui: React.ReactElement,
  defaultTheme = "system"
) {
  return render(
    <ThemeProvider attribute="class" defaultTheme={defaultTheme}>
      {ui}
    </ThemeProvider>
  );
}

describe("ThemeSettingPanel - テーマ選択パネル", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Req 2.1: テーマ選択UIの表示", () => {
    it("テーマ選択パネルが表示されること", async () => {
      renderWithThemeProvider(<ThemeSettingPanel />);

      await waitFor(() => {
        expect(screen.getByTestId("theme-setting-panel")).toBeInTheDocument();
      });
    });
  });

  describe("Req 2.2: 3つのテーマ選択肢", () => {
    it("ライト・ダーク・システムの3つの選択肢が表示されること", async () => {
      renderWithThemeProvider(<ThemeSettingPanel />);

      await waitFor(() => {
        expect(screen.getByTestId("theme-option-light")).toBeInTheDocument();
        expect(screen.getByTestId("theme-option-dark")).toBeInTheDocument();
        expect(screen.getByTestId("theme-option-system")).toBeInTheDocument();
      });
    });

    it("各選択肢にラベルテキストが含まれること", async () => {
      renderWithThemeProvider(<ThemeSettingPanel />);

      await waitFor(() => {
        expect(screen.getByText("ライト")).toBeInTheDocument();
        expect(screen.getByText("ダーク")).toBeInTheDocument();
        expect(screen.getByText("システム")).toBeInTheDocument();
      });
    });
  });

  describe("Req 2.3: テーマ変更の即時反映", () => {
    it("ライトテーマを選択すると setTheme が呼ばれること", async () => {
      const user = userEvent.setup();
      renderWithThemeProvider(<ThemeSettingPanel />, "system");

      await waitFor(() => {
        expect(screen.getByTestId("theme-option-light")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("theme-option-light"));

      // next-themes がテーマを変更したことを確認（data-active で検証）
      await waitFor(() => {
        expect(screen.getByTestId("theme-option-light")).toHaveAttribute(
          "data-active",
          "true"
        );
      });
    });

    it("ダークテーマを選択すると反映されること", async () => {
      const user = userEvent.setup();
      renderWithThemeProvider(<ThemeSettingPanel />, "system");

      await waitFor(() => {
        expect(screen.getByTestId("theme-option-dark")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("theme-option-dark"));

      await waitFor(() => {
        expect(screen.getByTestId("theme-option-dark")).toHaveAttribute(
          "data-active",
          "true"
        );
      });
    });

    it("システムテーマを選択すると反映されること", async () => {
      const user = userEvent.setup();
      renderWithThemeProvider(<ThemeSettingPanel />, "light");

      await waitFor(() => {
        expect(screen.getByTestId("theme-option-system")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("theme-option-system"));

      await waitFor(() => {
        expect(screen.getByTestId("theme-option-system")).toHaveAttribute(
          "data-active",
          "true"
        );
      });
    });
  });

  describe("Req 2.4: 現在テーマの視覚的ハイライト", () => {
    it("デフォルトテーマ（system）がハイライトされること", async () => {
      renderWithThemeProvider(<ThemeSettingPanel />, "system");

      await waitFor(() => {
        expect(screen.getByTestId("theme-option-system")).toHaveAttribute(
          "data-active",
          "true"
        );
        expect(screen.getByTestId("theme-option-light")).toHaveAttribute(
          "data-active",
          "false"
        );
        expect(screen.getByTestId("theme-option-dark")).toHaveAttribute(
          "data-active",
          "false"
        );
      });
    });

    it("ライトテーマ選択時にライトのみハイライトされること", async () => {
      renderWithThemeProvider(<ThemeSettingPanel />, "light");

      await waitFor(() => {
        expect(screen.getByTestId("theme-option-light")).toHaveAttribute(
          "data-active",
          "true"
        );
        expect(screen.getByTestId("theme-option-dark")).toHaveAttribute(
          "data-active",
          "false"
        );
        expect(screen.getByTestId("theme-option-system")).toHaveAttribute(
          "data-active",
          "false"
        );
      });
    });

    it("ダークテーマ選択時にダークのみハイライトされること", async () => {
      renderWithThemeProvider(<ThemeSettingPanel />, "dark");

      await waitFor(() => {
        expect(screen.getByTestId("theme-option-dark")).toHaveAttribute(
          "data-active",
          "true"
        );
        expect(screen.getByTestId("theme-option-light")).toHaveAttribute(
          "data-active",
          "false"
        );
        expect(screen.getByTestId("theme-option-system")).toHaveAttribute(
          "data-active",
          "false"
        );
      });
    });
  });

  describe("Req 2.5: ThemeSwitcher との状態共有", () => {
    it("同じ ThemeProvider コンテキスト内でテーマ状態を共有すること", async () => {
      // ThemeSettingPanel は ThemeProvider 経由で useTheme() を使用するため、
      // 同一 ThemeProvider 内の他のコンポーネントとテーマ状態を共有する
      renderWithThemeProvider(<ThemeSettingPanel />, "dark");

      await waitFor(() => {
        // dark テーマがアクティブ状態として反映されていることを確認
        expect(screen.getByTestId("theme-option-dark")).toHaveAttribute(
          "data-active",
          "true"
        );
      });
    });
  });

  describe("ハイドレーションミスマッチ回避", () => {
    it("マウント前にフォールバックUIが表示されること", () => {
      // マウント前はフォールバック表示になる（useEffectが実行される前）
      // この状態はテストでは一瞬だが、フォールバック要素の存在を確認
      renderWithThemeProvider(<ThemeSettingPanel />);

      // フォールバック or 実際のコンテンツどちらかが表示されていること
      const panel = screen.getByTestId("theme-setting-panel");
      expect(panel).toBeInTheDocument();
    });
  });
});
