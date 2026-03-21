import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ className: "mock-geist", variable: "--font-geist-sans" }),
}));

vi.mock("next/font/local", () => ({
  default: () => ({
    className: "mock-local",
    variable: "--font-uni-sans-heavy",
  }),
}));

import { metadata } from "@/app/layout";

describe("RootLayout metadata", () => {
  it("metadataBase がプロダクションURLフォールバックで設定されている", () => {
    expect(metadata.metadataBase).toBeInstanceOf(URL);
  });

  it("title.template で統一フォーマットが設定されている", () => {
    expect(metadata.title).toEqual(
      expect.objectContaining({
        template: "%s | Discalendar",
      })
    );
  });

  it("title.default がブランドファースト形式である", () => {
    expect(metadata.title).toEqual(
      expect.objectContaining({
        default: "Discalendar - Discordコミュニティの予定管理をもっと便利に",
      })
    );
  });

  it("description が設定されている", () => {
    expect(metadata.description).toBe(
      "Discordサーバーでイベントを簡単に管理できるカレンダーアプリケーション"
    );
  });

  it("keywords が設定されている", () => {
    expect(metadata.keywords).toEqual(
      expect.arrayContaining(["Discord", "カレンダー", "予定管理"])
    );
  });

  describe("Open Graph", () => {
    it("type が website に設定されている", () => {
      expect(metadata.openGraph).toEqual(
        expect.objectContaining({ type: "website" })
      );
    });

    it("siteName が Discalendar に設定されている", () => {
      expect(metadata.openGraph).toEqual(
        expect.objectContaining({ siteName: "Discalendar" })
      );
    });

    it("locale が ja_JP に設定されている", () => {
      expect(metadata.openGraph).toEqual(
        expect.objectContaining({ locale: "ja_JP" })
      );
    });
  });

  describe("Twitter Card", () => {
    it("card が summary_large_image に設定されている", () => {
      expect(metadata.twitter).toEqual(
        expect.objectContaining({ card: "summary_large_image" })
      );
    });
  });

  it("canonical URL が設定されている", () => {
    expect(metadata.alternates).toEqual(
      expect.objectContaining({ canonical: "/" })
    );
  });

  it("既存の icons 設定が維持されている", () => {
    expect(metadata.icons).toEqual(
      expect.objectContaining({ icon: "/icon.png" })
    );
  });

  it("既存の manifest 設定が維持されている", () => {
    expect(metadata.manifest).toBe("/manifest.webmanifest");
  });

  it("既存の appleWebApp 設定が維持されている", () => {
    expect(metadata.appleWebApp).toEqual(
      expect.objectContaining({
        capable: true,
        statusBarStyle: "default",
        title: "Discalendar",
      })
    );
  });
});
