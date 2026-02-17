import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocNavigation } from "@/components/docs/doc-navigation";
import type { DocEntry } from "@/lib/docs/config";

const entries: DocEntry[] = [
  {
    slug: "getting-started",
    title: "基本的な使い方",
    order: 0,
    description: "",
  },
  { slug: "login", title: "ログイン", order: 1, description: "" },
  { slug: "invite", title: "Botの招待", order: 2, description: "" },
];

describe("DocNavigation", () => {
  it("全ドキュメントページのリンク一覧を表示する", () => {
    render(<DocNavigation currentSlug="getting-started" entries={entries} />);

    for (const entry of entries) {
      const link = screen.getByRole("link", { name: entry.title });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", `/docs/${entry.slug}`);
    }
  });

  it("現在のページをアクティブ状態で強調表示する", () => {
    render(<DocNavigation currentSlug="login" entries={entries} />);

    const activeLink = screen.getByRole("link", { name: "ログイン" });
    expect(activeLink).toHaveAttribute("aria-current", "page");

    const inactiveLink = screen.getByRole("link", { name: "基本的な使い方" });
    expect(inactiveLink).not.toHaveAttribute("aria-current");
  });

  it("nav要素で目次ナビゲーションをラップする", () => {
    render(<DocNavigation currentSlug="getting-started" entries={entries} />);

    const nav = screen.getByRole("navigation", { name: "ドキュメント目次" });
    expect(nav).toBeInTheDocument();
  });
});
