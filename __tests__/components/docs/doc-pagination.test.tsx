import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocPagination } from "@/components/docs/doc-pagination";
import type { DocEntry } from "@/lib/docs/config";

const prevEntry: DocEntry = {
  slug: "getting-started",
  title: "基本的な使い方",
  order: 0,
  description: "",
};

const nextEntry: DocEntry = {
  slug: "invite",
  title: "Botの招待",
  order: 2,
  description: "",
};

const PREV_NAME_PATTERN = /基本的な使い方/;
const NEXT_NAME_PATTERN = /Botの招待/;

describe("DocPagination", () => {
  it("前後両方のページリンクを表示する", () => {
    render(<DocPagination next={nextEntry} prev={prevEntry} />);

    const prevLink = screen.getByRole("link", { name: PREV_NAME_PATTERN });
    expect(prevLink).toHaveAttribute("href", "/docs/getting-started");

    const nextLink = screen.getByRole("link", { name: NEXT_NAME_PATTERN });
    expect(nextLink).toHaveAttribute("href", "/docs/invite");

    expect(screen.getByText("前の記事")).toBeInTheDocument();
    expect(screen.getByText("次の記事")).toBeInTheDocument();
  });

  it("最初のページでは前の記事リンクを非表示にする", () => {
    render(<DocPagination next={nextEntry} prev={undefined} />);

    expect(screen.queryByText("前の記事")).not.toBeInTheDocument();
    expect(screen.getByText("次の記事")).toBeInTheDocument();
  });

  it("最後のページでは次の記事リンクを非表示にする", () => {
    render(<DocPagination next={undefined} prev={prevEntry} />);

    expect(screen.getByText("前の記事")).toBeInTheDocument();
    expect(screen.queryByText("次の記事")).not.toBeInTheDocument();
  });

  it("前後どちらもない場合は何も表示しない", () => {
    const { container } = render(
      <DocPagination next={undefined} prev={undefined} />
    );

    expect(container.querySelector("nav")).toBeNull();
  });
});
