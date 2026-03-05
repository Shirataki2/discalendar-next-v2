/**
 * NotificationChannelSelect のユニットテスト
 *
 * Task 5.1 + Task 6: 通知チャンネル選択コンポーネントのテスト
 *
 * Requirements: 2.1-2.7, 3.3, 3.4, 4.2, 4.3, 6.3
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Radix Select が jsdom で使用する DOM API のモック
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

// Server Actions のモック
vi.mock("@/app/dashboard/actions", () => ({
  fetchGuildChannels: vi.fn(),
  updateNotificationChannel: vi.fn(),
}));

import {
  fetchGuildChannels,
  updateNotificationChannel,
} from "@/app/dashboard/actions";
import type { DiscordTextChannel } from "@/lib/discord/notification-channel-service";
import { NotificationChannelSelect } from "./notification-channel-select";

const mockedFetchGuildChannels = vi.mocked(fetchGuildChannels);
const mockedUpdateNotificationChannel = vi.mocked(updateNotificationChannel);

/** テスト用チャンネルデータ */
const MOCK_CHANNELS: DiscordTextChannel[] = [
  {
    id: "11111111111111111",
    name: "general",
    parentId: "99999999999999999",
    categoryName: "テキストチャンネル",
    position: 0,
    canBotSendMessages: true,
  },
  {
    id: "22222222222222222",
    name: "announcements",
    parentId: "99999999999999999",
    categoryName: "テキストチャンネル",
    position: 1,
    canBotSendMessages: true,
  },
  {
    id: "33333333333333333",
    name: "restricted-channel",
    parentId: "88888888888888888",
    categoryName: "管理",
    position: 0,
    canBotSendMessages: false,
  },
  {
    id: "44444444444444444",
    name: "no-category",
    parentId: null,
    categoryName: null,
    position: 0,
    canBotSendMessages: true,
  },
];

describe("NotificationChannelSelect", () => {
  const defaultProps = {
    guildId: "123456789",
    currentChannelId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------
  // チャンネル一覧取得
  // -------------------------------------------

  describe("チャンネル一覧取得", () => {
    it("マウント時にチャンネル一覧を取得する", async () => {
      mockedFetchGuildChannels.mockResolvedValue({
        success: true,
        data: MOCK_CHANNELS,
      });

      render(<NotificationChannelSelect {...defaultProps} />);

      await waitFor(() => {
        expect(mockedFetchGuildChannels).toHaveBeenCalledWith("123456789");
      });
    });

    it("取得中はローディング状態を表示する", () => {
      mockedFetchGuildChannels.mockReturnValue(
        new Promise(() => {
          /* never resolves */
        })
      );

      render(<NotificationChannelSelect {...defaultProps} />);

      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    it("取得失敗時にエラーメッセージとリトライボタンを表示する", async () => {
      mockedFetchGuildChannels.mockResolvedValue({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "チャンネル一覧の取得に失敗しました。",
        },
      });

      render(<NotificationChannelSelect {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText("チャンネル一覧の取得に失敗しました。")
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: "再試行" })
      ).toBeInTheDocument();
    });

    it("リトライボタンクリックでチャンネル一覧を再取得する", async () => {
      const user = userEvent.setup();

      // 初回は失敗
      mockedFetchGuildChannels.mockResolvedValueOnce({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "チャンネル一覧の取得に失敗しました。",
        },
      });

      render(<NotificationChannelSelect {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "再試行" })
        ).toBeInTheDocument();
      });

      // 2回目は成功
      mockedFetchGuildChannels.mockResolvedValueOnce({
        success: true,
        data: MOCK_CHANNELS,
      });

      await user.click(screen.getByRole("button", { name: "再試行" }));

      await waitFor(() => {
        expect(mockedFetchGuildChannels).toHaveBeenCalledTimes(2);
      });

      // エラーが消えている
      await waitFor(() => {
        expect(
          screen.queryByText("チャンネル一覧の取得に失敗しました。")
        ).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------
  // チャンネル表示
  // -------------------------------------------

  describe("チャンネル表示", () => {
    it("未設定時にプレースホルダーを表示する", async () => {
      mockedFetchGuildChannels.mockResolvedValue({
        success: true,
        data: MOCK_CHANNELS,
      });

      render(
        <NotificationChannelSelect {...defaultProps} currentChannelId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText("チャンネルを選択")).toBeInTheDocument();
      });
    });

    it("設定済みの場合、現在のチャンネル名を表示する", async () => {
      mockedFetchGuildChannels.mockResolvedValue({
        success: true,
        data: MOCK_CHANNELS,
      });

      render(
        <NotificationChannelSelect
          {...defaultProps}
          currentChannelId="11111111111111111"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("# general")).toBeInTheDocument();
      });
    });

    it("BOT権限なしチャンネルにインジケーターを表示する", async () => {
      const user = userEvent.setup();
      mockedFetchGuildChannels.mockResolvedValue({
        success: true,
        data: MOCK_CHANNELS,
      });

      render(<NotificationChannelSelect {...defaultProps} />);

      // Select を開く
      await waitFor(() => {
        expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
      });

      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/BOT権限なし/)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------
  // チャンネル保存
  // -------------------------------------------

  describe("チャンネル保存", () => {
    it("チャンネル選択時に updateNotificationChannel を呼び出す", async () => {
      const user = userEvent.setup();
      mockedFetchGuildChannels.mockResolvedValue({
        success: true,
        data: MOCK_CHANNELS,
      });
      mockedUpdateNotificationChannel.mockResolvedValue({
        success: true,
        data: { guildId: "123456789", channelId: "22222222222222222" },
      });

      // 初期値を設定してSelectに値がある状態にする（Radix Select の jsdom互換性対策）
      render(
        <NotificationChannelSelect
          {...defaultProps}
          currentChannelId="11111111111111111"
        />
      );

      // チャンネル取得完了を待つ
      await waitFor(() => {
        expect(screen.getByText("# general")).toBeInTheDocument();
      });

      // Select を開いてチャンネルを選択
      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      const option = await screen.findByRole("option", {
        name: /announcements/,
      });
      await user.click(option);

      await waitFor(() => {
        expect(mockedUpdateNotificationChannel).toHaveBeenCalledWith({
          guildId: "123456789",
          channelId: "22222222222222222",
        });
      });
    });

    it("保存成功時に成功フィードバックを表示する", async () => {
      const user = userEvent.setup();
      mockedFetchGuildChannels.mockResolvedValue({
        success: true,
        data: MOCK_CHANNELS,
      });
      mockedUpdateNotificationChannel.mockResolvedValue({
        success: true,
        data: { guildId: "123456789", channelId: "22222222222222222" },
      });

      render(
        <NotificationChannelSelect
          {...defaultProps}
          currentChannelId="11111111111111111"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("# general")).toBeInTheDocument();
      });

      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      const option = await screen.findByRole("option", {
        name: /announcements/,
      });
      await user.click(option);

      await waitFor(() => {
        expect(screen.getByText("保存しました")).toBeInTheDocument();
      });
    });

    it("保存失敗時にエラーメッセージを表示する", async () => {
      const user = userEvent.setup();
      mockedFetchGuildChannels.mockResolvedValue({
        success: true,
        data: MOCK_CHANNELS,
      });
      mockedUpdateNotificationChannel.mockResolvedValue({
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: "設定の保存に失敗しました。",
        },
      });

      render(
        <NotificationChannelSelect
          {...defaultProps}
          currentChannelId="11111111111111111"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("# general")).toBeInTheDocument();
      });

      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      const option = await screen.findByRole("option", {
        name: /announcements/,
      });
      await user.click(option);

      await waitFor(() => {
        expect(
          screen.getByText("設定の保存に失敗しました。")
        ).toBeInTheDocument();
      });
    });

    it("保存失敗時に Select の値が元に戻る", async () => {
      const user = userEvent.setup();
      mockedFetchGuildChannels.mockResolvedValue({
        success: true,
        data: MOCK_CHANNELS,
      });
      mockedUpdateNotificationChannel.mockResolvedValue({
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: "設定の保存に失敗しました。",
        },
      });

      render(
        <NotificationChannelSelect
          {...defaultProps}
          currentChannelId="11111111111111111"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("# general")).toBeInTheDocument();
      });

      const trigger = screen.getByRole("combobox");
      await user.click(trigger);

      const option = await screen.findByRole("option", {
        name: /announcements/,
      });
      await user.click(option);

      // 失敗後、元の general に戻る
      await waitFor(() => {
        expect(screen.getByText("# general")).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------
  // ギルド切替
  // -------------------------------------------

  describe("ギルド切替", () => {
    it("guildId 変更時にチャンネル一覧を再取得する", async () => {
      mockedFetchGuildChannels.mockResolvedValue({
        success: true,
        data: MOCK_CHANNELS,
      });

      const { rerender } = render(
        <NotificationChannelSelect {...defaultProps} />
      );

      await waitFor(() => {
        expect(mockedFetchGuildChannels).toHaveBeenCalledWith("123456789");
      });

      rerender(
        <NotificationChannelSelect
          currentChannelId={null}
          guildId="987654321"
        />
      );

      await waitFor(() => {
        expect(mockedFetchGuildChannels).toHaveBeenCalledWith("987654321");
      });
    });

    it("guildId 変更時にエラー状態をリセットする", async () => {
      // 初回は失敗
      mockedFetchGuildChannels.mockResolvedValueOnce({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "チャンネル一覧の取得に失敗しました。",
        },
      });

      const { rerender } = render(
        <NotificationChannelSelect {...defaultProps} />
      );

      await waitFor(() => {
        expect(
          screen.getByText("チャンネル一覧の取得に失敗しました。")
        ).toBeInTheDocument();
      });

      // 2回目は成功
      mockedFetchGuildChannels.mockResolvedValueOnce({
        success: true,
        data: MOCK_CHANNELS,
      });

      rerender(
        <NotificationChannelSelect
          currentChannelId={null}
          guildId="987654321"
        />
      );

      await waitFor(() => {
        expect(
          screen.queryByText("チャンネル一覧の取得に失敗しました。")
        ).not.toBeInTheDocument();
      });
    });
  });
});
