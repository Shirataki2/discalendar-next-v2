/**
 * GuildSettingsPanel のユニットテスト
 *
 * Task 7.1: ギルド設定パネルコンポーネントのテスト
 *
 * Requirements: 5.3, 5.4
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// updateGuildConfig Server Action のモック
vi.mock("@/app/dashboard/actions", () => ({
  updateGuildConfig: vi.fn(),
}));

import { updateGuildConfig } from "@/app/dashboard/actions";
import { GuildSettingsPanel } from "./guild-settings-panel";

const mockedUpdateGuildConfig = vi.mocked(updateGuildConfig);

describe("GuildSettingsPanel", () => {
  const defaultProps = {
    guildId: "123456789",
    restricted: false,
    permissionsBitfield: "8", // ADMINISTRATOR
  };

  it("restricted トグルを表示する", () => {
    render(<GuildSettingsPanel {...defaultProps} />);

    expect(screen.getByText("ギルド設定")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(
      screen.getByText("イベント編集を管理者のみに制限")
    ).toBeInTheDocument();
  });

  it("restricted が true の場合、トグルが ON 状態", () => {
    render(<GuildSettingsPanel {...defaultProps} restricted={true} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("data-state", "checked");
  });

  it("restricted が false の場合、トグルが OFF 状態", () => {
    render(<GuildSettingsPanel {...defaultProps} restricted={false} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("data-state", "unchecked");
  });

  it("トグル変更時に updateGuildConfig Server Action を呼び出す", async () => {
    const user = userEvent.setup();
    mockedUpdateGuildConfig.mockResolvedValue({
      success: true,
      data: { guildId: "123456789", restricted: true },
    });

    render(<GuildSettingsPanel {...defaultProps} restricted={false} />);

    const toggle = screen.getByRole("switch");
    await user.click(toggle);

    expect(mockedUpdateGuildConfig).toHaveBeenCalledWith({
      guildId: "123456789",
      restricted: true,
      permissionsBitfield: "8",
    });
  });

  it("更新中はトグルを無効化する", async () => {
    const user = userEvent.setup();
    // 解決されないPromiseで更新中状態を維持
    mockedUpdateGuildConfig.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      })
    );

    render(<GuildSettingsPanel {...defaultProps} />);

    const toggle = screen.getByRole("switch");
    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeDisabled();
    });
  });

  it("更新失敗時にエラーメッセージを表示する", async () => {
    const user = userEvent.setup();
    mockedUpdateGuildConfig.mockResolvedValue({
      success: false,
      error: {
        code: "PERMISSION_DENIED",
        message: "ギルドの設定を変更するには管理権限が必要です。",
      },
    });

    render(<GuildSettingsPanel {...defaultProps} />);

    const toggle = screen.getByRole("switch");
    await user.click(toggle);

    await waitFor(() => {
      expect(
        screen.getByText("ギルドの設定を変更するには管理権限が必要です。")
      ).toBeInTheDocument();
    });
  });

  it("更新失敗時にトグルの状態を元に戻す", async () => {
    const user = userEvent.setup();
    mockedUpdateGuildConfig.mockResolvedValue({
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: "更新に失敗しました。",
      },
    });

    render(<GuildSettingsPanel {...defaultProps} restricted={false} />);

    const toggle = screen.getByRole("switch");
    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute("data-state", "unchecked");
    });
  });
});
