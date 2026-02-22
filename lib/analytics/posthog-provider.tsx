"use client";

import posthog from "posthog-js";
import { Suspense, useEffect } from "react";
import { PostHogPageView } from "./posthog-pageview";

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key || !host) {
      return;
    }

    try {
      posthog.init(key, {
        api_host: host,
        capture_pageview: false,
        persistence: "memory",
      });
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Analytics] PostHog SDK initialization failed");
      }
    }
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
