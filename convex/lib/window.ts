/**
 * The single source of truth for deriving a sale's status from its own
 * timestamps and the current instant (ADR-002). Backend queries, the
 * status-mirroring cron, and every React component import this module
 * rather than re-deriving status from a date comparison written on the
 * spot — see CLAUDE.md, "Sale status is derived, never stored as truth."
 *
 * Plain TypeScript only: nothing here imports from Convex, React, or
 * Next.js, so the same module runs unchanged in both runtimes. Every
 * function is pure — the only way to read the clock is the `now`
 * parameter default, which is what makes the boundary instants testable
 * and keeps this module free of module-level state.
 */

export type SaleWindow = {
  startsAt: number;
  endsAt: number;
};

export type SaleStatus = "upcoming" | "live" | "ended";

/**
 * live when startsAt <= now < endsAt; upcoming when now < startsAt;
 * ended when now >= endsAt. A zero-length window (startsAt === endsAt)
 * therefore can never be live: at the instant now === startsAt === endsAt
 * the endsAt check already fails, so it reads as ended.
 */
export function saleStatus(window: SaleWindow, now: number = Date.now()): SaleStatus {
  if (now < window.startsAt) return "upcoming";
  if (now < window.endsAt) return "live";
  return "ended";
}

export function isUpcoming(window: SaleWindow, now: number = Date.now()): boolean {
  return saleStatus(window, now) === "upcoming";
}

export function isLive(window: SaleWindow, now: number = Date.now()): boolean {
  return saleStatus(window, now) === "live";
}

export function isEnded(window: SaleWindow, now: number = Date.now()): boolean {
  return saleStatus(window, now) === "ended";
}
