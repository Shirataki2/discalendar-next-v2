"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPostHogClient } from "./client";

interface PostHogIdentifyProviderProps {
  children: React.ReactNode;
}

export function PostHogIdentifyProvider({
  children,
}: PostHogIdentifyProviderProps) {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const client = getPostHogClient();
      if (!client) {
        return;
      }

      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        session?.user
      ) {
        client.identify(session.user.id);
      } else if (event === "SIGNED_OUT" || !session) {
        client.reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return children;
}
