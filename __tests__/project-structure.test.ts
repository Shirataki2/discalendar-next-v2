import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Task 1.1: プロジェクト構造の検証", () => {
  const projectRoot = join(process.cwd());

  describe("App Router構造", () => {
    it("app/layout.tsxが存在すること", () => {
      const layoutPath = join(projectRoot, "app", "layout.tsx");
      expect(existsSync(layoutPath)).toBe(true);
    });

    it("app/page.tsxが存在すること", () => {
      const pagePath = join(projectRoot, "app", "page.tsx");
      expect(existsSync(pagePath)).toBe(true);
    });
  });

  describe("shadcn/uiコンポーネント", () => {
    it("components/ui/button.tsxが存在すること", () => {
      const buttonPath = join(projectRoot, "components", "ui", "button.tsx");
      expect(existsSync(buttonPath)).toBe(true);
    });

    it("components/ui/card.tsxが存在すること", () => {
      const cardPath = join(projectRoot, "components", "ui", "card.tsx");
      expect(existsSync(cardPath)).toBe(true);
    });
  });

  describe("依存関係の確認", () => {
    it("package.jsonにlucide-reactが含まれること", async () => {
      const packageJson = await import("../package.json");
      expect(packageJson.dependencies["lucide-react"]).toBeDefined();
      expect(packageJson.dependencies["lucide-react"]).toContain("0.511");
    });

    it("package.jsonにTailwind CSSが含まれること", async () => {
      const packageJson = await import("../package.json");
      expect(packageJson.devDependencies.tailwindcss).toBeDefined();
    });

    it("package.jsonにnext-themesが含まれること", async () => {
      const packageJson = await import("../package.json");
      expect(packageJson.dependencies["next-themes"]).toBeDefined();
    });
  });

  describe("Tailwind CSS設定", () => {
    it("tailwind.config.tsが存在すること", () => {
      const tailwindConfigPath = join(projectRoot, "tailwind.config.ts");
      expect(existsSync(tailwindConfigPath)).toBe(true);
    });
  });
});
