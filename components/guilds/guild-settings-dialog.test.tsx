/**
 * GuildSettingsDialog のユニットテスト
 *
 * DIS-47: ギルド設定ダイアログコンポーネントのテスト
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// updateGuildConfig Server Action のモック
vi.mock("@/app/dashboard/actions", () => ({
  updateGuildConfig: vi.fn(),
}));

import { GuildSettingsDialog } from "./guild-settings-dialog";

const CLOSE_BUTTON_NAME = /close/i;

describe("GuildSettingsDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    guildId: "123456789",
    restricted: false,
  };

  it("open=true のとき、ダイアログタイトルを表示する", () => {
    render(<GuildSettingsDialog {...defaultProps} />);

    expect(screen.getByText("サーバー設定")).toBeInTheDocument();
    expect(
      screen.getByText("サーバーのイベント管理設定を変更できます。")
    ).toBeInTheDocument();
  });

  it("open=false のとき、ダイアログを表示しない", () => {
    render(<GuildSettingsDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("サーバー設定")).not.toBeInTheDocument();
  });

  it("restricted トグル（Switch）を含む", () => {
    render(<GuildSettingsDialog {...defaultProps} />);

    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(
      screen.getByText("イベント編集を管理者のみに制限")
    ).toBeInTheDocument();
  });

  it("hideTitle により GuildSettingsPanel のタイトルが非表示", () => {
    render(<GuildSettingsDialog {...defaultProps} />);

    // Dialog自体の「サーバー設定」は表示されるが、Panel内の「ギルド設定」は非表示
    expect(screen.queryByText("ギルド設定")).not.toBeInTheDocument();
  });

  it("閉じるボタンクリックで onOpenChange が呼ばれる", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <GuildSettingsDialog {...defaultProps} onOpenChange={onOpenChange} />
    );

    const closeButton = screen.getByRole("button", { name: CLOSE_BUTTON_NAME });
    await user.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("restricted=true の場合、トグルがON状態", () => {
    render(<GuildSettingsDialog {...defaultProps} restricted={true} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("data-state", "checked");
  });
});
