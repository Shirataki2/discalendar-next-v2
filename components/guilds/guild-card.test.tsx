/**
 * GuildCard コンポーネントのテスト
 *
 * Requirements:
 * - 4.2: 各ギルドカードにギルド名とアイコン画像を表示する
 * - 4.3: ギルドにアイコンが設定されていない場合、ギルド名のイニシャルをフォールバックとして表示する
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Guild } from "@/lib/guilds/types";
import { GuildCard } from "./guild-card";

// Top-level regex for performance optimization
const TEST_SERVER_NAME_REGEX = /テストサーバー/i;

describe("GuildCard", () => {
  afterEach(() => {
    cleanup();
  });

  // テスト用ギルドデータ
  const guildWithIcon: Guild = {
    id: 1,
    guildId: "123456789012345678",
    name: "テストサーバー",
    avatarUrl: "https://cdn.discordapp.com/icons/123456789012345678/abc123.png",
    locale: "ja",
  };

  const guildWithoutIcon: Guild = {
    id: 2,
    guildId: "234567890123456789",
    name: "アイコンなしサーバー",
    avatarUrl: null,
    locale: "ja",
  };

  const guildEnglishName: Guild = {
    id: 3,
    guildId: "345678901234567890",
    name: "English Server",
    avatarUrl: null,
    locale: "en",
  };

  // Requirement 4.2: ギルド名とアイコン画像を表示
  describe("ギルド名とアイコン表示 (Req 4.2)", () => {
    it("ギルド名を表示する", () => {
      render(<GuildCard guild={guildWithIcon} />);
      expect(screen.getByText("テストサーバー")).toBeInTheDocument();
    });

    it("アイコン画像を表示する（アイコンが設定されている場合）", () => {
      render(<GuildCard guild={guildWithIcon} />);
      const image = screen.getByRole("img", { name: TEST_SERVER_NAME_REGEX });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute(
        "src",
        expect.stringContaining("cdn.discordapp.com")
      );
    });

    it("カードコンテナがレンダリングされる", () => {
      render(<GuildCard guild={guildWithIcon} />);
      const card = screen.getByTestId("guild-card");
      expect(card).toBeInTheDocument();
    });
  });

  // Requirement 4.3: イニシャルフォールバック表示
  describe("イニシャルフォールバック (Req 4.3)", () => {
    it("アイコンがない場合、ギルド名の先頭文字をフォールバック表示する（日本語）", () => {
      render(<GuildCard guild={guildWithoutIcon} />);
      // 日本語の先頭文字「ア」がイニシャルとして表示される
      expect(screen.getByText("ア")).toBeInTheDocument();
    });

    it("アイコンがない場合、画像要素は表示されない", () => {
      render(<GuildCard guild={guildWithoutIcon} />);
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("英語名ギルドの場合、先頭文字を大文字で表示する", () => {
      render(<GuildCard guild={guildEnglishName} />);
      expect(screen.getByText("E")).toBeInTheDocument();
    });
  });

  describe("アクセシビリティ", () => {
    it("アイコン画像に適切なalt属性が設定されている", () => {
      render(<GuildCard guild={guildWithIcon} />);
      const image = screen.getByRole("img");
      expect(image).toHaveAttribute(
        "alt",
        expect.stringContaining("テストサーバー")
      );
    });
  });
});
