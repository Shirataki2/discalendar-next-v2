"use client";

import posthog from "posthog-js";
import { Suspense } from "react";
import { PostHogPageView } from "./posthog-pageview";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (typeof window !== "undefined" && key && host) {
  try {
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      persistence: "memory",
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") {
          ph.opt_out_capturing();
        }
      },
    });
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Analytics] PostHog SDK initialization failed");
    }
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
