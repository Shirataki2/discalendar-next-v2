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

// matchMediaのモック（next-themesで必要）
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    // deprecated methods (no-op for testing)
    addListener: () => {
      /* no-op */
    },
    removeListener: () => {
      /* no-op */
    },
    addEventListener: () => {
      /* no-op */
    },
    removeEventListener: () => {
      /* no-op */
    },
    dispatchEvent: () => true,
  }),
});

// 各テスト後に自動的にDOMをクリーンアップ
afterEach(() => {
  cleanup();
});
