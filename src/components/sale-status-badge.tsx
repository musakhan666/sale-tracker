"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

import { saleStatus, type SaleStatus } from "../../convex/lib/window";

/** Matches rules/react-patterns.md's "Time-dependent rendering" cadence. */
const REFRESH_INTERVAL_MS = 60_000;

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
  // Seeded from the server's value so the first client render matches the
  // server HTML exactly; reading Date.now() here would hydration-mismatch.
  const [status, setStatus] = useState<SaleStatus>(initialStatus);

  useEffect(() => {
    const recompute = () => setStatus(saleStatus({ startsAt, endsAt }, Date.now()));
    // Re-derive once immediately after mount — time may have already
    // passed since the server rendered — then on every tick after that.
    recompute();
    const intervalId = setInterval(recompute, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [startsAt, endsAt]);

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
