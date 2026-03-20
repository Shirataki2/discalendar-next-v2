import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageContent = readFileSync(join(process.cwd(), "app/page.tsx"), "utf-8");

describe("ランディングページ JSON-LD (Task 2.1)", () => {
  it("application/ld+json スクリプトタグが含まれる", () => {
    expect(pageContent).toContain('type="application/ld+json"');
    expect(pageContent).toContain("dangerouslySetInnerHTML");
  });

  it("WebApplication タイプの JSON-LD データが定義されている", () => {
    expect(pageContent).toContain('"@context": "https://schema.org"');
    expect(pageContent).toContain('"@type": "WebApplication"');
    expect(pageContent).toContain('name: "Discalendar"');
    expect(pageContent).toContain("applicationCategory:");
    expect(pageContent).toContain("operatingSystem:");
    expect(pageContent).toContain("description:");
    expect(pageContent).toContain("url:");
  });

  it("WebSite タイプの JSON-LD データが定義されている", () => {
    expect(pageContent).toContain('"@type": "WebSite"');
  });

  it("JSON-LD が Schema.org 仕様に準拠したフィールドを持つ", () => {
    // WebApplication の必須フィールド
    expect(pageContent).toContain('"@context": "https://schema.org"');
    expect(pageContent).toContain('"BusinessApplication"');
    expect(pageContent).toContain('"Web"');
  });

  it("JSON-LD データが JSON.stringify で安全にシリアライズされる", () => {
    expect(pageContent).toContain("JSON.stringify(webApplicationJsonLd)");
    expect(pageContent).toContain("JSON.stringify(webSiteJsonLd)");
  });
});
