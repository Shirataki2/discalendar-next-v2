import { describe, expect, it } from "vitest";

describe("app/dashboard/layout.tsx metadata", () => {
  it("robots に index: false, follow: false が設定されている", async () => {
    const mod = await import("@/app/dashboard/layout");
    const metadata = mod.metadata;

    expect(metadata).toBeDefined();
    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it("default export が children をレンダリングするレイアウト関数である", async () => {
    const mod = await import("@/app/dashboard/layout");
    expect(typeof mod.default).toBe("function");
  });
});
