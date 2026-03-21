import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/header", () => ({
  Header: () => null,
}));

vi.mock("@/components/hero", () => ({
  Hero: () => null,
}));

vi.mock("@/components/features", () => ({
  Features: () => null,
}));

vi.mock("@/components/cta", () => ({
  CTA: () => null,
}));

vi.mock("@/components/footer", () => ({
  Footer: () => null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}));

describe("ランディングページ JSON-LD構造化データ (Task 5.2)", () => {
  it("WebApplication JSON-LDがSchema.org必須フィールドを含む", async () => {
    const { render } = await import("@testing-library/react");
    const { default: Home } = await import("@/app/page");

    const element = await Home();
    const { container } = render(element);

    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    expect(scripts.length).toBeGreaterThanOrEqual(2);

    const jsonLdContents = Array.from(scripts).map((script) =>
      JSON.parse(script.textContent ?? "{}")
    );

    const webApp = jsonLdContents.find(
      (ld) => ld["@type"] === "WebApplication"
    );
    if (!webApp) {
      throw new Error("WebApplication JSON-LD not found");
    }
    expect(webApp["@context"]).toBe("https://schema.org");
    expect(webApp.name).toBe("Discalendar");
    expect(webApp.description).toBeTruthy();
    expect(webApp.url).toBeTruthy();
    expect(webApp.applicationCategory).toBe("BusinessApplication");
    expect(webApp.operatingSystem).toBe("Web");
  });

  it("WebSite JSON-LDがSchema.org必須フィールドを含む", async () => {
    const { render } = await import("@testing-library/react");
    const { default: Home } = await import("@/app/page");

    const element = await Home();
    const { container } = render(element);

    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]'
    );

    const jsonLdContents = Array.from(scripts).map((script) =>
      JSON.parse(script.textContent ?? "{}")
    );

    const webSite = jsonLdContents.find((ld) => ld["@type"] === "WebSite");
    if (!webSite) {
      throw new Error("WebSite JSON-LD not found");
    }
    expect(webSite["@context"]).toBe("https://schema.org");
    expect(webSite.name).toBe("Discalendar");
    expect(webSite.url).toBeTruthy();
  });

  it("JSON-LDが<script type='application/ld+json'>タグで出力される", async () => {
    const { render } = await import("@testing-library/react");
    const { default: Home } = await import("@/app/page");

    const element = await Home();
    const { container } = render(element);

    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    expect(scripts.length).toBe(2);
  });
});
