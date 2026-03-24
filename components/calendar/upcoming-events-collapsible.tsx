"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

type UpcomingEventsCollapsibleProps = {
  children: ReactNode;
};

const STORAGE_KEY = "discalendar:upcoming-events-visible";

export function UpcomingEventsCollapsible({
  children,
}: UpcomingEventsCollapsibleProps) {
  const [visible, setVisible] = useLocalStorage<boolean>(STORAGE_KEY, true);

  return (
    <section>
      <div className="mb-2 flex items-center gap-1">
        <button
          aria-expanded={visible}
          aria-label={visible ? "直近の予定を非表示" : "直近の予定を表示"}
          className="flex items-center gap-1 font-semibold text-sm hover:text-muted-foreground"
          onClick={() => setVisible((prev) => !prev)}
          type="button"
        >
          {visible ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          直近の予定
        </button>
      </div>
      {visible ? children : null}
    </section>
  );
}
