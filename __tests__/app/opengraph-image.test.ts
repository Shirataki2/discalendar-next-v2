import { describe, expect, it, vi } from "vitest";

const mockReadFile = vi.fn().mockResolvedValue(Buffer.from("mock-font-data"));
vi.mock("node:fs/promises", () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

const mockJoin = vi.fn((...args: string[]) => args.join("/"));
vi.mock("node:path", () => ({
  default: { join: mockJoin },
  join: mockJoin,
}));

vi.mock("next/og", () => ({
  ImageResponse: class MockImageResponse {
    element: React.ReactElement;
    options?: { width?: number; height?: number };
    constructor(
      element: React.ReactElement,
      options?: { width?: number; height?: number }
    ) {
      this.element = element;
      this.options = options;
    }
  },
}));

describe("opengraph-image", () => {
  it("alt テキストが設定されている", async () => {
    const { alt } = await import("@/app/opengraph-image");
    expect(alt).toBe(
      "Discalendar - Discordコミュニティの予定管理をもっと便利に"
    );
  });

  it("サイズが 1200×630 に設定されている", async () => {
    const { size } = await import("@/app/opengraph-image");
    expect(size).toEqual({ width: 1200, height: 630 });
  });

  it("contentType が image/png に設定されている", async () => {
    const { contentType } = await import("@/app/opengraph-image");
    expect(contentType).toBe("image/png");
  });

  it("デフォルトエクスポートが ImageResponse を返す", async () => {
    const { default: OpenGraphImage } = await import("@/app/opengraph-image");
    const { ImageResponse } = await import("next/og");
    const result = await OpenGraphImage();
    expect(result).toBeInstanceOf(ImageResponse);
  });

  it("フォントファイルを読み込む", async () => {
    const { readFile } = await import("node:fs/promises");
    const { default: OpenGraphImage } = await import("@/app/opengraph-image");
    await OpenGraphImage();
    expect(readFile).toHaveBeenCalled();
  });
});
