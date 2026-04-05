"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPostHogClient } from "./client";

type PostHogIdentifyProviderProps = {
  children: React.ReactNode;
};

export function PostHogIdentifyProvider({
  children,
}: PostHogIdentifyProviderProps) {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const client = getPostHogClient();
      if (!client) {
        return;
      }

      if (session?.user) {
        posthog.identify(session.user.id);
      } else {
        posthog.reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return children;
}
