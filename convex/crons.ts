/**
 * Convex cron registrations. `export default crons` is the framework's own
 * convention (see the Convex docs), not this project's named-exports rule —
 * the job itself, `internalMutation`s like `maintenance.refreshStatus`, are
 * named exports in their own modules.
 *
 * The 5-minute interval is a correctness parameter, not a tuning knob
 * (ADR-002): it bounds how stale the indexed `sales.status` mirror can get.
 */
import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "refresh sale status",
  { minutes: 5 },
  internal.maintenance.refreshStatus,
);

export default crons;
