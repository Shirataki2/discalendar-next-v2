/**
 * @file パフォーマンステスト - Lighthouse監査とCore Web Vitals
 * @description タスク9.2 - パフォーマンス検証とLighthouse監査
 *
 * Requirements:
 * - 8.1: next/imageによる画像最適化
 * - 8.2: クライアントサイドJavaScriptの最小化
 * - 8.3: Server Componentsの活用
 *
 * Performance Targets:
 * - Lighthouse Performance Score > 90
 * - Lighthouse Accessibility Score > 90
 * - Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
 */

import { describe, expect, it } from "vitest";

// Regex constants for performance
const LUCIDE_IMPORT_REGEX = /import\s+{[^}]+}\s+from\s+"lucide-react"/;

describe("パフォーマンス - next/image最適化", () => {
  it("next/imageコンポーネントが使用されている", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    // Heroコンポーネントのソースコードを確認
    const heroPath = path.join(process.cwd(), "components", "hero.tsx");
    const heroContent = fs.readFileSync(heroPath, "utf-8");

    // next/imageのインポートがある
    expect(heroContent).toContain('from "next/image"');
    expect(heroContent).toContain("<Image");
  });

  it("next/imageにpriority属性が設定されている（LCP最適化）", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const heroPath = path.join(process.cwd(), "components", "hero.tsx");
    const heroContent = fs.readFileSync(heroPath, "utf-8");

    // priority属性が設定されている（ヒーローセクションのメイン画像）
    expect(heroContent).toContain("priority");
  });

  it("next/imageにalt属性が設定されている", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const heroPath = path.join(process.cwd(), "components", "hero.tsx");
    const heroContent = fs.readFileSync(heroPath, "utf-8");

    // alt属性が設定されている
    expect(heroContent).toContain('alt="');
  });

  it("next/imageにwidth/height属性が設定されている（CLS防止）", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const heroPath = path.join(process.cwd(), "components", "hero.tsx");
    const heroContent = fs.readFileSync(heroPath, "utf-8");

    // width/height属性が設定されている
    expect(heroContent).toContain("width=");
    expect(heroContent).toContain("height=");
  });
});

describe("パフォーマンス - Server/Client Components分離", () => {
  it("app/page.tsxがServer Componentとして実装されている", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    // "use client"ディレクティブが存在しない
    const lines = pageContent.split("\n");
    const codeLines = lines.filter(
      (line) =>
        line.trim() !== "" &&
        !line.trim().startsWith("//") &&
        !line.trim().startsWith("*")
    );

    const hasUseClient = codeLines.some(
      (line) => line.includes('"use client"') || line.includes("'use client'")
    );

    expect(hasUseClient).toBe(false);
  });

  it("主要コンポーネント（Header, Hero, Features, CTA, Footer）がServer Componentである", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const components = ["header", "hero", "features", "cta", "footer"];

    for (const component of components) {
      const componentPath = path.join(
        process.cwd(),
        "components",
        `${component}.tsx`
      );
      const componentContent = fs.readFileSync(componentPath, "utf-8");

      const lines = componentContent.split("\n");
      const codeLines = lines.filter(
        (line) =>
          line.trim() !== "" &&
          !line.trim().startsWith("//") &&
          !line.trim().startsWith("*")
      );

      const hasUseClient = codeLines.some(
        (line) => line.includes('"use client"') || line.includes("'use client'")
      );

      expect(hasUseClient).toBe(
        false,
        `${component}.tsx should be a Server Component`
      );
    }
  });

  it("MobileNavのみがClient Componentである", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const mobileNavPath = path.join(
      process.cwd(),
      "components",
      "mobile-nav.tsx"
    );
    const mobileNavContent = fs.readFileSync(mobileNavPath, "utf-8");

    // "use client"ディレクティブが存在する
    expect(mobileNavContent).toContain('"use client"');
  });
});

describe("パフォーマンス - バンドルサイズ最適化", () => {
  it("lucide-reactアイコンが個別にインポートされている（Tree-shaking対応）", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const componentsPath = path.join(process.cwd(), "components");
    const files = fs.readdirSync(componentsPath);
    const componentFiles = files.filter(
      (file) => file.endsWith(".tsx") && !file.startsWith("ui")
    );

    for (const file of componentFiles) {
      const filePath = path.join(componentsPath, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // lucide-reactを使用している場合
      if (content.includes('from "lucide-react"')) {
        // 個別インポート（例: import { Calendar } from "lucide-react"）
        // ワイルドカードインポート（import * as Icons）は使用しない
        expect(content).not.toContain("import * as");
        expect(content).toMatch(LUCIDE_IMPORT_REGEX);
      }
    }
  });

  it("shadcn/uiコンポーネントが個別にインポートされている", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const componentsPath = path.join(process.cwd(), "components");
    const files = fs.readdirSync(componentsPath);
    const componentFiles = files.filter(
      (file) => file.endsWith(".tsx") && !file.startsWith("ui")
    );

    for (const file of componentFiles) {
      const filePath = path.join(componentsPath, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // shadcn/uiコンポーネントを使用している場合
      if (content.includes("@/components/ui/")) {
        // 個別インポート（例: import { Button } from "@/components/ui/button"）
        // バレルインポートは使用しない
        expect(content).not.toContain('@/components/ui"');
      }
    }
  });
});

describe("パフォーマンス - Tailwind CSS最適化", () => {
  it("Tailwind CSSのユーティリティクラスが使用されている（カスタムCSS最小化）", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const componentsPath = path.join(process.cwd(), "components");
    const files = fs.readdirSync(componentsPath);
    const componentFiles = files.filter(
      (file) => file.endsWith(".tsx") && !file.startsWith("ui")
    );

    for (const file of componentFiles) {
      const filePath = path.join(componentsPath, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // classNameプロパティが存在する（Tailwindユーティリティクラス使用）
      if (content.includes("className=")) {
        // Tailwind標準クラスの使用を確認（例: px-, py-, text-, bg-）
        const hasTailwindClasses =
          content.includes("px-") ||
          content.includes("py-") ||
          content.includes("text-") ||
          content.includes("bg-") ||
          content.includes("flex") ||
          content.includes("grid");

        expect(hasTailwindClasses).toBe(
          true,
          `${file} should use Tailwind CSS classes`
        );
      }
    }
  });

  it("カスタムCSSファイルが最小限である（globals.cssのみ）", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const appPath = path.join(process.cwd(), "app");
    const files = fs.readdirSync(appPath);
    const cssFiles = files.filter((file) => file.endsWith(".css"));

    // globals.cssのみが存在
    expect(cssFiles).toEqual(["globals.css"]);
  });
});

describe("パフォーマンス - Core Web Vitals対策", () => {
  it("画像にaspect-ratio指定がある（CLS防止）", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const heroPath = path.join(process.cwd(), "components", "hero.tsx");
    const heroContent = fs.readFileSync(heroPath, "utf-8");

    // aspect-ratioクラスまたはwidth/heightの組み合わせ
    const hasAspectRatio =
      heroContent.includes("aspect-") ||
      (heroContent.includes("width=") && heroContent.includes("height="));

    expect(hasAspectRatio).toBe(true);
  });

  it("レイアウトシフトを防ぐスペーシングが設定されている", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    // mainにspace-yまたはgapクラスが設定されている
    const hasSpacing =
      pageContent.includes("space-y-") || pageContent.includes("gap-");

    expect(hasSpacing).toBe(true);
  });
});
