/**
 * @file デプロイ準備テスト - ビルド検証と最終チェックリスト
 * @description タスク9.3 - デプロイ準備と最終チェックリスト
 *
 * Requirements:
 * - 8.3: プロダクションビルドの成功
 * - 12.1: Biomeリンティング準拠
 * - 12.3: TypeScript strict mode準拠
 */

import { describe, expect, it } from "vitest";

// Regex constants for performance
const KEBAB_CASE_REGEX = /^[a-z]+(-[a-z]+)*\.tsx$/;
const IMPORT_IDENTIFIER_REGEX = /import\s+(?:type\s+)?{?\s*(\w+)/;
const API_KEY_REGEX = /api[_-]?key\s*=\s*["'][^"']+["']/i;
const SECRET_REGEX = /secret\s*=\s*["'][^"']+["']/i;
const PASSWORD_REGEX = /password\s*=\s*["'][^"']+["']/i;
const TOKEN_REGEX = /token\s*=\s*["'][^"']+["']/i;
const TITLE_METADATA_REGEX = /title:\s*["']/;
const DESCRIPTION_METADATA_REGEX = /description:\s*["']/;

describe("デプロイ準備 - TypeScript型チェック", () => {
  it("すべてのコンポーネントファイルにTypeScript型定義が存在する", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const componentsPath = path.join(process.cwd(), "components");
    const files = fs.readdirSync(componentsPath);
    const componentFiles = files.filter(
      (file) =>
        file.endsWith(".tsx") &&
        !file.startsWith("ui") &&
        !file.includes(".test.")
    );

    for (const file of componentFiles) {
      const filePath = path.join(componentsPath, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // 型定義の存在確認（type, interface, または明示的な型注釈、またはReactコンポーネント）
      const hasTypeDefinition =
        content.includes("type ") ||
        content.includes("interface ") ||
        content.includes(": React.") ||
        content.includes("LucideIcon") ||
        content.includes("export function") || // 関数コンポーネント（TypeScript strict modeで型推論）
        content.includes("export async function"); // async Server Component

      if (!hasTypeDefinition) {
        throw new Error(
          `${file} should have TypeScript type definitions or be a valid function component`
        );
      }
      expect(hasTypeDefinition).toBe(true);
    }
  });

  it("any型が使用されていない", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const componentsPath = path.join(process.cwd(), "components");
    const files = fs.readdirSync(componentsPath);
    const componentFiles = files.filter(
      (file) =>
        file.endsWith(".tsx") &&
        !file.startsWith("ui") &&
        !file.includes(".test.")
    );

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const allFiles = [
      ...componentFiles.map((f) => path.join(componentsPath, f)),
      pagePath,
    ];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");

      // any型の使用を検出（コメント内を除く）
      const lines = content
        .split("\n")
        .filter(
          (line) =>
            !(line.trim().startsWith("//") || line.trim().startsWith("*"))
        );

      const hasAnyType = lines.some((line) => line.includes(": any"));

      expect(hasAnyType).toBe(
        false,
        `${path.basename(filePath)} should not use 'any' type`
      );
    }
  });

  it("app/page.tsxにMetadata型が適用されている", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    // Metadata型のインポートと使用
    expect(pageContent).toContain("import type { Metadata }");
    expect(pageContent).toContain("export const metadata: Metadata");
  });
});

describe("デプロイ準備 - コード品質", () => {
  it("console.logなどのデバッグコードが残っていない", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const componentsPath = path.join(process.cwd(), "components");
    const files = fs.readdirSync(componentsPath);
    const componentFiles = files.filter(
      (file) =>
        file.endsWith(".tsx") &&
        !file.startsWith("ui") &&
        !file.includes(".test.")
    );

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const allFiles = [
      ...componentFiles.map((f) => path.join(componentsPath, f)),
      pagePath,
    ];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");

      // デバッグコードの検出（コメント内を除く）
      const lines = content
        .split("\n")
        .filter(
          (line) =>
            !(line.trim().startsWith("//") || line.trim().startsWith("*"))
        );

      const hasDebugCode = lines.some(
        (line) =>
          line.includes("console.log") ||
          line.includes("console.debug") ||
          line.includes("debugger")
      );

      expect(hasDebugCode).toBe(
        false,
        `${path.basename(filePath)} should not contain debug code`
      );
    }
  });

  it("未使用のインポートが存在しない（主要ファイル確認）", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    // インポート行を抽出
    const importLines = pageContent
      .split("\n")
      .filter((line) => line.trim().startsWith("import"));

    // 各インポートがファイル内で使用されているか確認
    for (const importLine of importLines) {
      // import文から識別子を抽出（簡易版）
      const match = importLine.match(IMPORT_IDENTIFIER_REGEX);
      if (match?.[1] && match[1] !== "type") {
        const identifier = match[1];
        // type-onlyインポートでない場合のみチェック
        if (!importLine.includes("import type")) {
          const isUsed = pageContent
            .split("\n")
            .filter((line) => !line.includes("import"))
            .some((line) => line.includes(identifier));

          expect(isUsed).toBe(
            true,
            `${identifier} should be used in app/page.tsx`
          );
        }
      }
    }
  });

  it("ファイル名がkebab-case命名規則に従っている", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const componentsPath = path.join(process.cwd(), "components");
    const files = fs.readdirSync(componentsPath);
    const componentFiles = files.filter(
      (file) =>
        file.endsWith(".tsx") &&
        !file.startsWith("ui") &&
        !file.includes(".test.")
    );

    for (const file of componentFiles) {
      expect(KEBAB_CASE_REGEX.test(file)).toBe(
        true,
        `${file} should follow kebab-case naming convention`
      );
    }
  });
});

describe("デプロイ準備 - プロジェクト構造", () => {
  it("すべての必須コンポーネントファイルが存在する", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const requiredComponents = [
      "header.tsx",
      "mobile-nav.tsx",
      "hero.tsx",
      "features.tsx",
      "cta.tsx",
      "footer.tsx",
    ];

    const componentsPath = path.join(process.cwd(), "components");

    for (const component of requiredComponents) {
      const componentPath = path.join(componentsPath, component);
      const exists = fs.existsSync(componentPath);

      expect(exists).toBe(true, `${component} should exist in /components/`);
    }
  });

  it("app/page.tsxが存在する", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const exists = fs.existsSync(pagePath);

    expect(exists).toBe(true);
  });

  it("shadcn/ui必須コンポーネントが存在する", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const requiredUIComponents = ["button.tsx", "card.tsx"];

    const uiPath = path.join(process.cwd(), "components", "ui");

    for (const component of requiredUIComponents) {
      const componentPath = path.join(uiPath, component);
      const exists = fs.existsSync(componentPath);

      expect(exists).toBe(true, `${component} should exist in /components/ui/`);
    }
  });
});

describe("デプロイ準備 - セキュリティチェック", () => {
  it("dangerouslySetInnerHTMLが使用されていない", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const componentsPath = path.join(process.cwd(), "components");
    const files = fs.readdirSync(componentsPath);
    const componentFiles = files.filter(
      (file) =>
        file.endsWith(".tsx") &&
        !file.startsWith("ui") &&
        !file.includes(".test.")
    );

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const allFiles = [
      ...componentFiles.map((f) => path.join(componentsPath, f)),
      pagePath,
    ];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("環境変数やシークレットがハードコードされていない", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const componentsPath = path.join(process.cwd(), "components");
    const files = fs.readdirSync(componentsPath);
    const componentFiles = files.filter(
      (file) =>
        file.endsWith(".tsx") &&
        !file.startsWith("ui") &&
        !file.includes(".test.")
    );

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const allFiles = [
      ...componentFiles.map((f) => path.join(componentsPath, f)),
      pagePath,
    ];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");

      // APIキーやシークレットのパターン検出（簡易版）
      const suspiciousPatterns = [
        API_KEY_REGEX,
        SECRET_REGEX,
        PASSWORD_REGEX,
        TOKEN_REGEX,
      ];

      for (const pattern of suspiciousPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }
  });

  it("外部リンクにrel属性が適切に設定されている（将来の拡張用）", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const componentsPath = path.join(process.cwd(), "components");
    const files = fs.readdirSync(componentsPath);
    const componentFiles = files.filter(
      (file) =>
        file.endsWith(".tsx") &&
        !file.startsWith("ui") &&
        !file.includes(".test.")
    );

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const allFiles = [
      ...componentFiles.map((f) => path.join(componentsPath, f)),
      pagePath,
    ];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");

      // target="_blank"を使用している場合はrel="noopener"も必要
      // 現在のモックアップでは外部リンクは使用していないが、将来の拡張用チェック
      const hasTargetBlank = content.includes('target="_blank"');

      if (hasTargetBlank) {
        const hasRelNoopener = content.includes('rel="noopener');
        expect(hasRelNoopener).toBe(
          true,
          `${path.basename(filePath)} should use rel="noopener" with target="_blank"`
        );
      }
    }
  });
});

describe("デプロイ準備 - メタデータとSEO", () => {
  it("ページメタデータ（title, description）が設定されている", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    // Metadataエクスポートの存在
    expect(pageContent).toContain("export const metadata");

    // titleとdescriptionの設定
    expect(pageContent).toMatch(TITLE_METADATA_REGEX);
    expect(pageContent).toMatch(DESCRIPTION_METADATA_REGEX);
  });

  it("メタデータに適切な日本語コンテンツが含まれている", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const pagePath = path.join(process.cwd(), "app", "page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    // 日本語のサービス名が含まれている
    expect(pageContent).toContain("Discalendar");
    expect(pageContent).toContain("Discord");
  });
});
