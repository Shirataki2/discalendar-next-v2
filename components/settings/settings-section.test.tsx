import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsSection } from "./settings-section";

describe("SettingsSection", () => {
  const defaultProps = {
    title: "権限設定",
    description: "イベント編集の制限を管理します。",
  };

  it("タイトルを表示する", () => {
    render(
      <SettingsSection {...defaultProps}>
        <p>テストコンテンツ</p>
      </SettingsSection>
    );

    expect(screen.getByText("権限設定")).toBeInTheDocument();
  });

  it("説明文を表示する", () => {
    render(
      <SettingsSection {...defaultProps}>
        <p>テストコンテンツ</p>
      </SettingsSection>
    );

    expect(
      screen.getByText("イベント編集の制限を管理します。")
    ).toBeInTheDocument();
  });

  it("children を表示する", () => {
    render(
      <SettingsSection {...defaultProps}>
        <p>テストコンテンツ</p>
      </SettingsSection>
    );

    expect(screen.getByText("テストコンテンツ")).toBeInTheDocument();
  });

  it("複数の children を表示できる", () => {
    render(
      <SettingsSection {...defaultProps}>
        <p>子要素1</p>
        <p>子要素2</p>
      </SettingsSection>
    );

    expect(screen.getByText("子要素1")).toBeInTheDocument();
    expect(screen.getByText("子要素2")).toBeInTheDocument();
  });
});
