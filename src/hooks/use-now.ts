"use client";

import { useEffect, useState } from "react";

/** Matches sale-status-badge's re-derivation cadence — see react-patterns.md, "Time-dependent rendering". */
const DEFAULT_REFRESH_INTERVAL_MS = 60_000;

/**
 * The shared "read the clock after mount" primitive for every time-dependent
 * client component in this app (CLAUDE.md: never compute `now` during a
 * Server Component render or the first client render — both would freeze or
 * hydration-mismatch). Returns `null` until the first effect has run, so a
 * caller's first render — on the server and on the client — can render an
 * identical, clock-free fallback. Only once mounted does this start handing
 * out real epoch-ms values, refreshed on `intervalMs`.
 */
export function useNow(intervalMs: number = DEFAULT_REFRESH_INTERVAL_MS): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const intervalId = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(intervalId);
  }, [intervalMs]);

  return now;
}
