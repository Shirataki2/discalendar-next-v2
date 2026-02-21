/**
 * Task 5: GitHub Actions CIワークフローのSentry環境変数テスト
 *
 * Requirements:
 * - 4.3: GitHub Actions CIでビルド時にソースマップアップロードが正常に完了する
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CI workflow Sentry configuration", () => {
  const workflowPath = resolve(process.cwd(), ".github/workflows/ci.yml");
  const workflowContent = readFileSync(workflowPath, "utf-8");

  it("Buildステップの環境変数にSENTRY_AUTH_TOKENが含まれる", () => {
    expect(workflowContent).toContain("SENTRY_AUTH_TOKEN:");
    expect(workflowContent).toContain("secrets.SENTRY_AUTH_TOKEN");
  });

  it("Buildステップの環境変数にSENTRY_ORGが含まれる", () => {
    expect(workflowContent).toContain("SENTRY_ORG:");
    expect(workflowContent).toContain("secrets.SENTRY_ORG");
  });

  it("Buildステップの環境変数にSENTRY_PROJECTが含まれる", () => {
    expect(workflowContent).toContain("SENTRY_PROJECT:");
    expect(workflowContent).toContain("secrets.SENTRY_PROJECT");
  });
});
