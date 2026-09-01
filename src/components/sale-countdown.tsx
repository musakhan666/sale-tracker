"use client";

import { useNow } from "@/hooks/use-now";

import { saleStatus, type SaleStatus, type SaleWindow } from "../../convex/lib/window";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const DISPLAY_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

/**
 * Formats a fixed instant for display. Pass an explicit `timeZone` for a
 * render that must be byte-identical wherever it runs — the server, and the
 * client's first, hydration-sensitive render. Omit it only once mounted,
 * when the runtime really is the viewer's browser and its host default zone
 * is the viewer's own (CLAUDE.md: never approximate this with a date
 * comparison written on the spot — Intl carries the zone conversion).
 */
export function formatInstant(instant: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", { ...DISPLAY_FORMAT_OPTIONS, timeZone }).format(instant);
}

/** The machine-readable instant for the `<time>` element's `dateTime` attribute. */
export function toUtcIso(instant: number): string {
  return new Date(instant).toISOString();
}

/**
 * Days/hours once there's more than an hour left; minutes below that.
 * Never seconds — the clock backing this only ticks once a minute, so a
 * seconds digit would just sit there looking frozen.
 */
export function formatCountdown(remainingMs: number): string {
  const clampedMs = Math.max(remainingMs, 0);
  const days = Math.floor(clampedMs / MS_PER_DAY);
  const hours = Math.floor((clampedMs % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((clampedMs % MS_PER_HOUR) / MS_PER_MINUTE);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "less than a minute";
}

type SaleCountdownProps = SaleWindow & {
  /** The status the server derived at request time — what this renders on first paint. */
  initialStatus: SaleStatus;
};

export function SaleCountdown({ startsAt, endsAt, initialStatus }: SaleCountdownProps) {
  const now = useNow();
  // Before mount, `now` is null: render the server's own status and a
  // UTC-pinned time so the first client render matches the server HTML
  // exactly — reading the viewer's zone or the clock any earlier than this
  // is exactly the hydration hazard CLAUDE.md calls out. After mount,
  // re-derive from the shared window function (never reimplemented here) so
  // status and the countdown both keep advancing with the clock.
  const status = now === null ? initialStatus : saleStatus({ startsAt, endsAt }, now);
  const startTimeText = now === null ? formatInstant(startsAt, "UTC") : formatInstant(startsAt);

  return (
    <div className="flex flex-col gap-0.5">
      <time dateTime={toUtcIso(startsAt)}>{startTimeText}</time>
      {status === "upcoming" && (
        // Plain text, not a live region: a visible re-render every tick is
        // fine, but announcing it to a screen reader every minute is not.
        <p aria-live="off" className="text-xs text-muted">
          {now === null ? "Calculating…" : `Starts in ${formatCountdown(startsAt - now)}`}
        </p>
      )}
    </div>
  );
}
