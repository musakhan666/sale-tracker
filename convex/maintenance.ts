/**
 * Background maintenance jobs — currently just the status-mirror cron's
 * mutation. Kept out of `convex/sales.ts` (the public read queries) so the
 * only writer of `sales.status` lives in a module the browser can never
 * reach (ADR-002; see CLAUDE.md, "Sale status is derived, never stored as
 * truth").
 */
import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { saleStatus } from "./lib/window";

// Caps the work a single tick can do so a growing sales table degrades into
// "takes a few more ticks to catch up", never into an unbounded scan.
const REFRESH_BATCH_SIZE = 200;

/**
 * The cron's target (see `convex/crons.ts`) and the sole writer of
 * `sales.status` anywhere in the codebase. Recomputes each sale's status
 * from `saleStatus()` — the one derivation this project allows — and
 * writes only the rows whose stored value has drifted from it.
 */
export const refreshStatus = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const sales = await ctx.db.query("sales").take(REFRESH_BATCH_SIZE);

    for (const sale of sales) {
      const derived = saleStatus(
        { startsAt: sale.startsAt, endsAt: sale.endsAt },
        now,
      );
      if (derived !== sale.status) {
        await ctx.db.patch(sale._id, { status: derived });
      }
    }

    return null;
  },
});
