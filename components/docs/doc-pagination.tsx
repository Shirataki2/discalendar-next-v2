import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { DocEntry } from "@/lib/docs/config";
import { cn } from "@/lib/utils";

type DocPaginationProps = {
  prev: DocEntry | undefined;
  next: DocEntry | undefined;
};

export function DocPagination({ prev, next }: DocPaginationProps) {
  if (!(prev || next)) {
    return null;
  }

  return (
    <nav aria-label="ページ送り" className="mt-12 grid gap-4 sm:grid-cols-2">
      {prev ? (
        <Link
          className="group hover:-translate-y-0.5 flex items-center gap-3 rounded-xl border p-4 transition-all hover:bg-muted hover:shadow-md"
          href={`/docs/${prev.slug}`}
        >
          <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">前の記事</p>
            <p className="truncate font-medium text-sm">{prev.title}</p>
          </div>
        </Link>
      ) : null}
      {next ? (
        <Link
          className={cn(
            "group hover:-translate-y-0.5 flex items-center justify-end gap-3 rounded-xl border p-4 text-right transition-all hover:bg-muted hover:shadow-md",
            !prev && "sm:col-start-2"
          )}
          href={`/docs/${next.slug}`}
        >
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">次の記事</p>
            <p className="truncate font-medium text-sm">{next.title}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </Link>
      ) : null}
    </nav>
  );
}
