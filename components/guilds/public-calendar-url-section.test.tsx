/**
 * PublicCalendarUrlSection のユニットテスト
 *
 * Task 5.1, 5.2: 公開カレンダーURL設定セクション + 確認ダイアログ
 *
 * Requirements: 1.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/dashboard/actions", () => ({
  togglePublicCalendar: vi.fn(),
  regeneratePublicSlugAction: vi.fn(),
}));

import {
  regeneratePublicSlugAction,
  togglePublicCalendar,
} from "@/app/dashboard/actions";
import { PublicCalendarUrlSection } from "./public-calendar-url-section";

const mockedToggle = vi.mocked(togglePublicCalendar);
const mockedRegenerate = vi.mocked(regeneratePublicSlugAction);

describe("PublicCalendarUrlSection", () => {
  const defaultProps = {
    guildId: "123456789",
    isPublic: false,
    publicSlug: null as string | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────
  // 5.1: 基本表示
  // ────────────────────────────────

  describe("基本表示", () => {
    it("公開トグルを表示する", () => {
      render(<PublicCalendarUrlSection {...defaultProps} />);

      expect(screen.getByRole("switch")).toBeInTheDocument();
      expect(screen.getByText("カレンダーを公開する")).toBeInTheDocument();
    });

    it("公開設定がオフの場合、トグルがOFF状態", () => {
      render(<PublicCalendarUrlSection {...defaultProps} />);

      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("data-state", "unchecked");
    });

    it("公開設定がオンの場合、トグルがON状態", () => {
      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("data-state", "checked");
    });
  });

  // ────────────────────────────────
  // 5.3: 公開設定がオンの場合のURL表示
  // ────────────────────────────────

  describe("公開URLの表示", () => {
    it("公開設定がオンの場合、公開URLを表示する", () => {
      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      expect(screen.getByText(/\/cal\/abc123def456/)).toBeInTheDocument();
    });

    it("公開設定がオンの場合、コピーボタンを表示する", () => {
      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      expect(
        screen.getByRole("button", { name: /コピー/ })
      ).toBeInTheDocument();
    });

    it("コピーボタンをクリックするとURLがクリップボードにコピーされる", async () => {
      const user = userEvent.setup();
      const writeTextSpy = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue(undefined);

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const copyButton = screen.getByRole("button", { name: /コピー/ });
      await user.click(copyButton);

      await waitFor(() => {
        expect(writeTextSpy).toHaveBeenCalledWith(
          expect.stringContaining("/cal/abc123def456")
        );
      });
    });

    it("コピー成功後にフィードバックを表示する", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const copyButton = screen.getByRole("button", { name: /コピー/ });
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/コピーしました/)).toBeInTheDocument();
      });
    });

    it("公開設定がオンの場合、スラッグ再生成ボタンを表示する", () => {
      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      expect(
        screen.getByRole("button", { name: /URLを再生成/ })
      ).toBeInTheDocument();
    });
  });

  // ────────────────────────────────
  // 5.4: 公開設定がオフの場合のUI
  // ────────────────────────────────

  describe("公開設定オフのUI", () => {
    it("公開設定がオフの場合、URLを表示しない", () => {
      render(<PublicCalendarUrlSection {...defaultProps} />);

      expect(screen.queryByText(/\/cal\//)).not.toBeInTheDocument();
    });

    it("公開設定がオフの場合、URL生成を促すメッセージを表示する", () => {
      render(<PublicCalendarUrlSection {...defaultProps} />);

      expect(
        screen.getByText(/トグルをオンにすると公開URLが生成されます/)
      ).toBeInTheDocument();
    });

    it("公開設定がオフの場合、再生成ボタンを表示しない", () => {
      render(<PublicCalendarUrlSection {...defaultProps} />);

      expect(
        screen.queryByRole("button", { name: /URLを再生成/ })
      ).not.toBeInTheDocument();
    });
  });

  // ────────────────────────────────
  // 5.2: トグル操作
  // ────────────────────────────────

  describe("トグル操作", () => {
    it("オフ→オンに切り替えると togglePublicCalendar を呼び出す", async () => {
      const user = userEvent.setup();
      mockedToggle.mockResolvedValue({
        success: true,
        data: { isPublic: true, publicSlug: "newslug12345" },
      });

      render(<PublicCalendarUrlSection {...defaultProps} />);

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      expect(mockedToggle).toHaveBeenCalledWith({
        guildId: "123456789",
        enabled: true,
      });
    });

    it("有効化成功後に公開URLを表示する", async () => {
      const user = userEvent.setup();
      mockedToggle.mockResolvedValue({
        success: true,
        data: { isPublic: true, publicSlug: "newslug12345" },
      });

      render(<PublicCalendarUrlSection {...defaultProps} />);

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(screen.getByText(/\/cal\/newslug12345/)).toBeInTheDocument();
      });
    });

    it("有効化失敗時にエラーメッセージを表示する", async () => {
      const user = userEvent.setup();
      mockedToggle.mockResolvedValue({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "公開カレンダーの有効化に失敗しました。",
        },
      });

      render(<PublicCalendarUrlSection {...defaultProps} />);

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(
          screen.getByText("公開カレンダーの有効化に失敗しました。")
        ).toBeInTheDocument();
      });
    });

    it("有効化失敗時にトグルを元に戻す", async () => {
      const user = userEvent.setup();
      mockedToggle.mockResolvedValue({
        success: false,
        error: { code: "FETCH_FAILED", message: "失敗" },
      });

      render(<PublicCalendarUrlSection {...defaultProps} />);

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(toggle).toHaveAttribute("data-state", "unchecked");
      });
    });

    it("更新中はトグルを無効化する", async () => {
      const user = userEvent.setup();
      mockedToggle.mockReturnValue(
        new Promise(() => {
          /* never resolves */
        })
      );

      render(<PublicCalendarUrlSection {...defaultProps} />);

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(toggle).toBeDisabled();
      });
    });
  });

  // ────────────────────────────────
  // 5.5: 無効化時の確認ダイアログ
  // ────────────────────────────────

  describe("無効化確認ダイアログ", () => {
    it("オン→オフに切り替えると確認ダイアログを表示する", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(
          screen.getByText(/公開カレンダーを無効にしますか/)
        ).toBeInTheDocument();
      });
    });

    it("確認ダイアログで影響の説明を表示する", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(
          screen.getByText(/既存の共有URLからアクセスできなくなります/)
        ).toBeInTheDocument();
      });
    });

    it("確認ダイアログのキャンセルでトグル状態が変わらない", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(
          screen.getByText(/公開カレンダーを無効にしますか/)
        ).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: "キャンセル" });
      await user.click(cancelButton);

      expect(toggle).toHaveAttribute("data-state", "checked");
      expect(mockedToggle).not.toHaveBeenCalled();
    });

    it("確認ダイアログの確認で togglePublicCalendar を呼び出す", async () => {
      const user = userEvent.setup();
      mockedToggle.mockResolvedValue({
        success: true,
        data: { isPublic: false, publicSlug: null },
      });

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(
          screen.getByText(/公開カレンダーを無効にしますか/)
        ).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: "無効にする" });
      await user.click(confirmButton);

      expect(mockedToggle).toHaveBeenCalledWith({
        guildId: "123456789",
        enabled: false,
      });
    });
  });

  // ────────────────────────────────
  // 5.5: スラッグ再生成時の確認ダイアログ
  // ────────────────────────────────

  describe("スラッグ再生成確認ダイアログ", () => {
    it("再生成ボタンクリックで確認ダイアログを表示する", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const regenerateButton = screen.getByRole("button", {
        name: /URLを再生成/,
      });
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(screen.getByText(/URLを再生成しますか/)).toBeInTheDocument();
      });
    });

    it("再生成確認ダイアログで旧URL無効化の説明を表示する", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const regenerateButton = screen.getByRole("button", {
        name: /URLを再生成/,
      });
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(screen.getByText(/現在のURLは無効になり/)).toBeInTheDocument();
      });
    });

    it("再生成確認で regeneratePublicSlugAction を呼び出す", async () => {
      const user = userEvent.setup();
      mockedRegenerate.mockResolvedValue({
        success: true,
        data: { publicSlug: "newslug99999" },
      });

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const regenerateButton = screen.getByRole("button", {
        name: /URLを再生成/,
      });
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(screen.getByText(/URLを再生成しますか/)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: "再生成する" });
      await user.click(confirmButton);

      expect(mockedRegenerate).toHaveBeenCalledWith({
        guildId: "123456789",
      });
    });

    it("再生成成功後に新しいURLを表示する", async () => {
      const user = userEvent.setup();
      mockedRegenerate.mockResolvedValue({
        success: true,
        data: { publicSlug: "newslug99999" },
      });

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const regenerateButton = screen.getByRole("button", {
        name: /URLを再生成/,
      });
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(screen.getByText(/URLを再生成しますか/)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: "再生成する" });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/\/cal\/newslug99999/)).toBeInTheDocument();
      });
    });

    it("再生成のキャンセルでURLが変わらない", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const regenerateButton = screen.getByRole("button", {
        name: /URLを再生成/,
      });
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(screen.getByText(/URLを再生成しますか/)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: "キャンセル" });
      await user.click(cancelButton);

      expect(screen.getByText(/\/cal\/abc123def456/)).toBeInTheDocument();
      expect(mockedRegenerate).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────
  // props同期
  // ────────────────────────────────

  describe("props同期", () => {
    it("props の isPublic が変更された場合にトグル状態が同期される", () => {
      const { rerender } = render(
        <PublicCalendarUrlSection {...defaultProps} />
      );

      expect(screen.getByRole("switch")).toHaveAttribute(
        "data-state",
        "unchecked"
      );

      rerender(
        <PublicCalendarUrlSection
          {...defaultProps}
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      expect(screen.getByRole("switch")).toHaveAttribute(
        "data-state",
        "checked"
      );
    });
  });
});
