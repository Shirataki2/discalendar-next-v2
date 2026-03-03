import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DashboardUser } from "@/types/user";
import { UserProfileCard } from "./user-profile-card";

const TEST_USER_NAME_REGEX = /Test User/i;
const SETTINGS_PATTERN = /設定/i;

describe("UserProfileCard", () => {
  const userWithAvatar: DashboardUser = {
    id: "user-1",
    email: "test@example.com",
    fullName: "Test User",
    avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
  };

  const userWithoutAvatar: DashboardUser = {
    id: "user-2",
    email: "noavatar@example.com",
    fullName: "No Avatar",
    avatarUrl: null,
  };

  const userWithoutFullName: DashboardUser = {
    id: "user-3",
    email: "nofullname@example.com",
    fullName: null,
    avatarUrl: "https://cdn.discordapp.com/avatars/456/def.png",
  };

  // Requirement 2.1: アバター画像を表示する
  describe("アバター表示 (Req 2.1)", () => {
    it("アバター画像を表示する", () => {
      render(<UserProfileCard user={userWithAvatar} />);
      const image = screen.getByRole("img", { name: TEST_USER_NAME_REGEX });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute(
        "src",
        expect.stringContaining("cdn.discordapp.com")
      );
    });
  });

  // Requirement 2.2: 表示名を表示する
  describe("表示名 (Req 2.2)", () => {
    it("表示名を表示する", () => {
      render(<UserProfileCard user={userWithAvatar} />);
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("表示名がnullの場合はメールアドレスにフォールバックする", () => {
      render(<UserProfileCard user={userWithoutFullName} />);
      // displayNameとemailが同じ値になるため、両方表示される
      const elements = screen.getAllByText("nofullname@example.com");
      expect(elements.length).toBeGreaterThanOrEqual(1);
      // 表示名位置のテキストが太字スタイルを持つことを確認
      expect(elements[0]).toHaveClass("font-medium");
    });
  });

  // Requirement 2.3: メールアドレスを表示する
  describe("メールアドレス (Req 2.3)", () => {
    it("メールアドレスをサブテキストとして表示する", () => {
      render(<UserProfileCard user={userWithAvatar} />);
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  // Requirement 2.4: アバターフォールバック
  describe("アバターフォールバック (Req 2.4)", () => {
    it("アバターがない場合、表示名のイニシャルを表示する", () => {
      render(<UserProfileCard user={userWithoutAvatar} />);
      expect(screen.getByText("N")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("アバターも表示名もない場合、メールの先頭文字を表示する", () => {
      const userNoNameNoAvatar: DashboardUser = {
        id: "user-4",
        email: "fallback@example.com",
        fullName: null,
        avatarUrl: null,
      };
      render(<UserProfileCard user={userNoNameNoAvatar} />);
      expect(screen.getByText("F")).toBeInTheDocument();
    });
  });

  // Requirement 4.1: 設定ページへのリンク
  describe("設定ページ導線 (Req 4.1)", () => {
    it("設定ページへのリンクを表示する", () => {
      render(<UserProfileCard user={userWithAvatar} />);
      const settingsLink = screen.getByRole("link", { name: SETTINGS_PATTERN });
      expect(settingsLink).toBeInTheDocument();
      expect(settingsLink).toHaveAttribute("href", "/dashboard/user/settings");
    });
  });
});
