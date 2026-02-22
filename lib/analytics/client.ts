import posthog from "posthog-js";
import type { PostHog } from "posthog-js";

/**
 * 初期化済みのPostHogクライアントを返す。
 * 未初期化・SSR環境ではundefinedを返す。
 */
export function getPostHogClient(): PostHog | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    // PostHog SDKが初期化済みかどうかをget_distinct_idで判定
    // プライベート属性(__loaded)に依存しない安全な方法
    const id = posthog.get_distinct_id();
    if (id) {
      return posthog;
    }
  } catch {
    // SDK未初期化時は例外が発生する場合がある
  }
  return undefined;
}
