"use client";

import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/cn";

import { saleStatus, type SaleStatus } from "../../convex/lib/window";

const STATUS_LABEL: Record<SaleStatus, string> = {
  upcoming: "Upcoming",
  live: "Live now",
  ended: "Ended",
};

// Status is conveyed by STATUS_LABEL's text first — tone is a secondary,
// non-load-bearing cue (CLAUDE.md requirement: never colour alone).
const STATUS_TONE: Record<SaleStatus, string> = {
  upcoming: "border-primary text-primary",
  live: "border-transparent bg-accent text-surface",
  ended: "border-border text-muted",
};

type SaleStatusBadgeProps = {
  startsAt: number;
  endsAt: number;
  /** The status the server derived at request time — what this renders on first paint. */
  initialStatus: SaleStatus;
};

export function SaleStatusBadge({ startsAt, endsAt, initialStatus }: SaleStatusBadgeProps) {
  const now = useNow();
  // Before mount `now` is null: fall back to the server's own value so the
  // first client render matches the server HTML exactly — reading the
  // clock any earlier would hydration-mismatch. After mount, re-derive on
  // every tick from the one shared window function rather than storing a
  // second, driftable copy of status in state.
  const status = now === null ? initialStatus : saleStatus({ startsAt, endsAt }, now);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide uppercase",
        STATUS_TONE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
