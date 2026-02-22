import posthog from "posthog-js";
import type { PostHog } from "posthog-js";

export function getPostHogClient(): PostHog | undefined {
  if (posthog.__loaded) {
    return posthog;
  }
  return undefined;
}
