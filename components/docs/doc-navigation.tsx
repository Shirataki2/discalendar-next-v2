"use client";

import Link from "next/link";
import type { DocEntry } from "@/lib/docs/config";
import { cn } from "@/lib/utils";

type DocNavigationProps = {
  entries: readonly DocEntry[];
  currentSlug: string;
};

export function DocNavigation({ entries, currentSlug }: DocNavigationProps) {
  return (
    <nav aria-label="ドキュメント目次">
      <h2 className="mb-3 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
        目次
      </h2>
      <ul className="space-y-1">
        {entries.map((entry) => {
          const isActive = entry.slug === currentSlug;
          return (
            <li key={entry.slug}>
              <Link
                {...(isActive ? { "aria-current": "page" as const } : {})}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                href={`/docs/${entry.slug}`}
              >
                {entry.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
