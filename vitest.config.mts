import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    exclude: [
      "refs/**/*",
      "node_modules/**/*",
      "e2e_tests/**/*",
      "packages/**/*",
      // ワークツリー配下の重複テストを除外（git worktree で別ブランチが残っている場合）
      ".claude/worktrees/**/*",
      // pnpm content-addressable store のハードリンク先テストを除外
      ".pnpm-store/**/*",
    ],
    setupFiles: ["./vitest-setup.ts"],
    maxWorkers: "75%",
    testTimeout: 10_000,
  },
});
