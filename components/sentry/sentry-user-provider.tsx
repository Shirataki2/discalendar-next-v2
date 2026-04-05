"use client";

import { setUser } from "@sentry/nextjs";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type SentryUserProviderProps = {
  children: React.ReactNode;
};

export function SentryUserProvider({ children }: SentryUserProviderProps) {
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return children;
}
