import { describe, expect, it, vi } from "vitest";

// Next.js font mocks
vi.mock("next/font/google", () => ({
  Geist: () => ({ className: "mock-geist", variable: "--font-geist-sans" }),
}));

vi.mock("next/font/local", () => ({
  default: () => ({
    className: "mock-local",
    variable: "--font-uni-sans-heavy",
  }),
}));

describe("ランディングページ メタデータ (Task 2.1)", () => {
  it("title.absolute でブランドファースト形式を維持する", async () => {
    const { metadata } = await import("@/app/page");
    expect(metadata.title).toEqual(
      expect.objectContaining({
        absolute: "Discalendar - Discordコミュニティの予定管理をもっと便利に",
      })
    );
  });

  it("description が充実している", async () => {
    const { metadata } = await import("@/app/page");
    expect(metadata.description).toContain(
      "Discordコミュニティ向け予定管理サービス"
    );
  });

  it("keywords にサービス関連キーワードが設定されている", async () => {
    const { metadata } = await import("@/app/page");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining([
        "Discord",
        "カレンダー",
        "予定管理",
        "イベント",
        "コミュニティ",
        "スケジュール",
      ])
    );
  });

  it("canonical URL が / に設定されている", async () => {
    const { metadata } = await import("@/app/page");
    expect(metadata.alternates).toEqual(
      expect.objectContaining({ canonical: "/" })
    );
  });
});

describe("利用規約ページ メタデータ (Task 2.2)", () => {
  it("title が短縮形（テンプレート適用前）で設定されている", async () => {
    const { metadata } = await import("@/app/terms/page");
    expect(metadata.title).toBe("利用規約");
  });

  it("description が設定されている", async () => {
    const { metadata } = await import("@/app/terms/page");
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(0);
  });

  it("canonical URL が /terms に設定されている", async () => {
    const { metadata } = await import("@/app/terms/page");
    expect(metadata.alternates).toEqual(
      expect.objectContaining({ canonical: "/terms" })
    );
  });
});

describe("プライバシーポリシーページ メタデータ (Task 2.2)", () => {
  it("title が短縮形（テンプレート適用前）で設定されている", async () => {
    const { metadata } = await import("@/app/privacy/page");
    expect(metadata.title).toBe("プライバシーポリシー");
  });

  it("description が設定されている", async () => {
    const { metadata } = await import("@/app/privacy/page");
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(0);
  });

  it("canonical URL が /privacy に設定されている", async () => {
    const { metadata } = await import("@/app/privacy/page");
    expect(metadata.alternates).toEqual(
      expect.objectContaining({ canonical: "/privacy" })
    );
  });
});

describe("ドキュメントページ メタデータ (Task 2.3)", () => {
  it("generateMetadata が canonical URL を含む", async () => {
    // lib/docs/config のモック
    vi.doMock("@/lib/docs/config", () => ({
      getDocBySlug: (slug: string) => {
        if (slug === "getting-started") {
          return {
            title: "はじめに",
            description: "Discalendarの使い方を説明します。",
            slug: "getting-started",
          };
        }
        return null;
      },
      getAllDocSlugs: () => ["getting-started"],
      getAdjacentDocs: () => ({ prev: null, next: null }),
      DOC_ENTRIES: [],
    }));

    const { generateMetadata } = await import("@/app/docs/[slug]/page");
    const result = await generateMetadata({
      params: Promise.resolve({ slug: "getting-started" }),
    });

    expect(result.title).toBe("はじめに");
    expect(result.alternates).toEqual(
      expect.objectContaining({ canonical: "/docs/getting-started" })
    );

    vi.doUnmock("@/lib/docs/config");
  });

  it("存在しないスラッグでは空オブジェクトを返す", async () => {
    vi.doMock("@/lib/docs/config", () => ({
      getDocBySlug: () => null,
      getAllDocSlugs: () => [],
      getAdjacentDocs: () => ({ prev: null, next: null }),
      DOC_ENTRIES: [],
    }));

    const { generateMetadata } = await import("@/app/docs/[slug]/page");
    const result = await generateMetadata({
      params: Promise.resolve({ slug: "nonexistent" }),
    });

    expect(result).toEqual({});

    vi.doUnmock("@/lib/docs/config");
  });
});

describe("ログインページ メタデータ (Task 2.4)", () => {
  it("layout.tsx が title を設定している", async () => {
    const { metadata } = await import("@/app/auth/login/layout");
    expect(metadata.title).toBe("ログイン");
  });

  it("layout.tsx が description を設定している", async () => {
    const { metadata } = await import("@/app/auth/login/layout");
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(0);
  });

  it("layout.tsx が canonical URL を設定している", async () => {
    const { metadata } = await import("@/app/auth/login/layout");
    expect(metadata.alternates).toEqual(
      expect.objectContaining({ canonical: "/auth/login" })
    );
  });
});
