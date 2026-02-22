"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { getPostHogClient } from "./client";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    getPostHogClient()?.capture("$pageview");
  }, [pathname, searchParams]);

  return null;
}
