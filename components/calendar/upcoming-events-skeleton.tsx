import { Skeleton } from "@/components/ui/skeleton";

function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border-transparent border-l-4 px-3 py-2.5"
      data-testid="upcoming-event-skeleton-row"
    >
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function UpcomingEventsSkeleton() {
  return (
    <div
      aria-busy="true"
      className="space-y-2"
      data-testid="upcoming-events-skeleton"
    >
      <div className="space-y-1">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
