import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsSection } from "@/components/guilds/settings-section";

describe("SettingsSection", () => {
  it("should render title", () => {
    render(
      <SettingsSection description="説明文" title="セクションタイトル">
        <p>コンテンツ</p>
      </SettingsSection>
    );
    expect(screen.getByText("セクションタイトル")).toBeInTheDocument();
  });

  it("should render description", () => {
    render(
      <SettingsSection description="セクションの説明文です" title="タイトル">
        <p>コンテンツ</p>
      </SettingsSection>
    );
    expect(screen.getByText("セクションの説明文です")).toBeInTheDocument();
  });

  it("should render children content", () => {
    render(
      <SettingsSection description="説明" title="タイトル">
        <button type="button">子要素ボタン</button>
      </SettingsSection>
    );
    expect(
      screen.getByRole("button", { name: "子要素ボタン" })
    ).toBeInTheDocument();
  });

  it("should render as a Card with proper structure", () => {
    const { container } = render(
      <SettingsSection description="説明" title="タイトル">
        <p>コンテンツ</p>
      </SettingsSection>
    );
    // Card component renders with rounded-xl border
    const card = container.firstElementChild;
    expect(card?.className).toContain("rounded-xl");
    expect(card?.className).toContain("border");
  });
});
