import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Guild } from "@/lib/guilds/types";
import { UserGuildList } from "./user-guild-list";

const TEST_GUILD_NAME_REGEX = /テストサーバー1/i;

describe("UserGuildList", () => {
  const guilds: Guild[] = [
    {
      id: 1,
      guildId: "111111111111111111",
      name: "テストサーバー1",
      avatarUrl:
        "https://cdn.discordapp.com/icons/111111111111111111/icon1.png",
      locale: "ja",
    },
    {
      id: 2,
      guildId: "222222222222222222",
      name: "テストサーバー2",
      avatarUrl: null,
      locale: "ja",
    },
  ];

  // Requirement 3.1: ギルドリスト表示
  describe("ギルドリスト表示 (Req 3.1)", () => {
    it("ギルド名を表示する", () => {
      render(<UserGuildList guilds={guilds} />);
      expect(screen.getByText("テストサーバー1")).toBeInTheDocument();
      expect(screen.getByText("テストサーバー2")).toBeInTheDocument();
    });

    it("ギルドアイコンを表示する", () => {
      render(<UserGuildList guilds={guilds} />);
      const image = screen.getByRole("img", {
        name: TEST_GUILD_NAME_REGEX,
      });
      expect(image).toBeInTheDocument();
    });

    it("アイコンがないギルドはイニシャルをフォールバック表示する", () => {
      render(<UserGuildList guilds={guilds} />);
      expect(screen.getByText("テ")).toBeInTheDocument();
    });
  });

  // Requirement 3.2: ギルド選択でダッシュボード遷移
  describe("ギルドリンク (Req 3.2)", () => {
    it("各ギルドがダッシュボードへのリンクになっている", () => {
      render(<UserGuildList guilds={guilds} />);
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute(
        "href",
        "/dashboard?guild=111111111111111111"
      );
      expect(links[1]).toHaveAttribute(
        "href",
        "/dashboard?guild=222222222222222222"
      );
    });
  });

  // Requirement 3.3: ギルド0件メッセージ
  describe("ギルド0件 (Req 3.3)", () => {
    it("ギルドが0件の場合メッセージを表示する", () => {
      render(<UserGuildList guilds={[]} />);
      expect(
        screen.getByText("参加しているギルドがありません")
      ).toBeInTheDocument();
    });

    it("ギルドが0件の場合リンクは表示されない", () => {
      render(<UserGuildList guilds={[]} />);
      expect(screen.queryAllByRole("link")).toHaveLength(0);
    });
  });
});
