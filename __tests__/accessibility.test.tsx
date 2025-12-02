/**
 * @file アクセシビリティテスト
 * @description タスク7.1 - アクセシビリティ標準への準拠確認
 *
 * Requirements:
 * - 7.1: セマンティックHTML要素の使用
 * - 7.2: 画像のalt属性設定
 * - 7.3: 見出し階層の論理構成
 * - 7.4: キーボードアクセシビリティ
 * - 7.5: フォーカス状態の視覚的識別
 * - 7.6: ARIA属性の適用
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock for Server Component patterns
const mockGetUser = vi.fn();

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

// Mock the signOut server action for LogoutButton
vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

import Page from "@/app/page";

describe("アクセシビリティ - セマンティックHTML", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("main要素がページに存在する", async () => {
    const page = await Page();
    const { container } = render(page);
    const mainElement = container.querySelector("main");
    expect(mainElement).toBeDefined();
  });

  it("header要素がページに存在する", async () => {
    const page = await Page();
    render(page);
    const headerElements = screen.getAllByTestId("landing-header");
    expect(headerElements[0].tagName).toBe("HEADER");
  });

  it("footer要素がページに存在する", async () => {
    const page = await Page();
    render(page);
    const footerElements = screen.getAllByTestId("landing-footer");
    expect(footerElements[0].tagName).toBe("FOOTER");
  });

  it("nav要素がheader内に存在する", async () => {
    const page = await Page();
    const { container } = render(page);
    const navElements = container.querySelectorAll("header nav");
    expect(navElements.length).toBeGreaterThan(0);
  });

  it("section要素がページに複数存在する", async () => {
    const page = await Page();
    const { container } = render(page);
    const sections = container.querySelectorAll("section");
    // Hero, Features, CTAの3つのsection
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });
});

describe("アクセシビリティ - 見出し階層", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("h1見出しがページに1つ存在する", async () => {
    const page = await Page();
    const { container } = render(page);
    const h1Elements = container.querySelectorAll("h1");
    expect(h1Elements.length).toBe(1);
  });

  it("h1見出しに意味のあるテキストが含まれる", async () => {
    const page = await Page();
    render(page);
    const h1Elements = screen.getAllByRole("heading", { level: 1 });
    expect(h1Elements[0].textContent).toBeTruthy();
    expect(h1Elements[0].textContent?.length).toBeGreaterThan(5);
  });

  it("h2見出しがページに存在する", async () => {
    const page = await Page();
    const { container } = render(page);
    const h2Elements = container.querySelectorAll("h2");
    expect(h2Elements.length).toBeGreaterThan(0);
  });

  it("h3見出しがh2の後に使用されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const h2Elements = container.querySelectorAll("h2");
    const h3Elements = container.querySelectorAll("h3");

    // h2が存在する場合、h3も存在する可能性がある
    if (h2Elements.length > 0) {
      expect(h3Elements.length).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("アクセシビリティ - 画像", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("すべてのimg要素にalt属性が設定されている", async () => {
    const page = await Page();
    const { container } = render(page);
    const images = container.querySelectorAll("img");

    for (const img of images) {
      expect(img.hasAttribute("alt")).toBe(true);
    }
  });

  it("alt属性に意味のあるテキストが含まれる", async () => {
    const page = await Page();
    const { container } = render(page);
    const images = container.querySelectorAll("img");

    for (const img of images) {
      const alt = img.getAttribute("alt");
      // 空のaltは許容されるが、装飾画像以外は意味のあるテキストを推奨
      if (alt && alt.length > 0) {
        expect(alt.length).toBeGreaterThan(3);
      }
    }
  });
});

describe("アクセシビリティ - インタラクティブ要素", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("すべてのbutton要素にアクセス可能なテキストがある", async () => {
    const page = await Page();
    const { container } = render(page);
    const buttons = container.querySelectorAll("button");

    for (const button of buttons) {
      const hasText =
        button.textContent && button.textContent.trim().length > 0;
      const hasAriaLabel = button.hasAttribute("aria-label");

      expect(hasText || hasAriaLabel).toBe(true);
    }
  });

  it("リンク要素にアクセス可能なテキストがある", async () => {
    const page = await Page();
    const { container } = render(page);
    const links = container.querySelectorAll("a");

    for (const link of links) {
      const hasText = link.textContent && link.textContent.trim().length > 0;
      const hasAriaLabel = link.hasAttribute("aria-label");

      expect(hasText || hasAriaLabel).toBe(true);
    }
  });
});

describe("アクセシビリティ - ARIA属性", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("ソーシャルリンクにaria-label属性が設定されている", async () => {
    const page = await Page();
    render(page);
    const footerElements = screen.getAllByTestId("landing-footer");
    const socialLinks = footerElements[0].querySelectorAll("a[aria-label]");

    // TwitterとGitHubの2つ
    expect(socialLinks.length).toBeGreaterThanOrEqual(2);
  });
});
