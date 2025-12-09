import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// ResizeObserverのモック（Radix UIコンポーネントで必要）
class ResizeObserverMock {
  observe() {
    // no-op
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
}

globalThis.ResizeObserver = ResizeObserverMock;

// 各テスト後に自動的にDOMをクリーンアップ
afterEach(() => {
  cleanup();
});
