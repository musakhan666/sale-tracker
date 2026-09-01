/**
 * Public queries behind the sale listing pages: a filterable, bounded page
 * of sales ordered soonest-opening first.
 *
 * These return the *stored* rows, `status` mirror included. Callers derive
 * the display status from `convex/lib/window.ts`, never from this field
 * directly — see CLAUDE.md, "Sale status is derived, never stored as
 * truth" (ADR-002).
 *
 * public: read-only queries over the public sale catalogue. The catalogue
 * being world-readable is the point of the site, so no auth guard applies.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { SaleStatus } from "./lib/window";
import schema from "./schema";

/** Page size a caller gets when it doesn't ask for a specific `limit`. */
export const DEFAULT_PAGE_SIZE = 20;

// Mirrors `SaleStatus` (convex/lib/window.ts) and the stored `status`
// column (convex/schema.ts). Kept as its own literal union here because
// runtime input needs a runtime validator, which the TS type alone can't
// provide.
const saleStatusValidator = v.union(v.literal("upcoming"), v.literal("live"), v.literal("ended"));

// Tied to `SaleStatus` via `satisfies` so this list can't silently drift
// from the type it's meant to enumerate.
const ALL_SALE_STATUSES = ["upcoming", "live", "ended"] as const satisfies readonly SaleStatus[];

function byStartsAtAscending(a: Doc<"sales">, b: Doc<"sales">): number {
  return a.startsAt - b.startsAt;
}

export const list = query({
  args: {
    brandId: v.optional(v.id("brands")),
    status: v.optional(saleStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(schema.doc("sales")),
  handler: async (ctx, args) => {
    const limit = args.limit ?? DEFAULT_PAGE_SIZE;

    if (args.status !== undefined) {
      const status = args.status;
      const brandId = args.brandId;
      // by_status_and_start orders by (status, startsAt); pinning status
      // already returns startsAt-ascending rows, so no in-memory sort is
      // needed here.
      const rows = await ctx.db
        .query("sales")
        .withIndex("by_status_and_start", (q) => q.eq("status", status))
        .take(limit);
      // brandId isn't part of this index. Narrow the already-bounded page
      // in memory instead of adding a second index read — this runs on
      // the array already in hand, not on the `ctx.db.query` chain, so it
      // doesn't reintroduce the `.filter()`-on-query problem ADR-001 rules
      // out.
      return brandId === undefined ? rows : rows.filter((row) => row.brandId === brandId);
    }

    if (args.brandId !== undefined) {
      const brandId = args.brandId;
      // by_brand orders by (brandId, _creationTime), not startsAt, so the
      // bounded page is re-sorted here. It's still one indexed, bounded
      // read — the sort runs over at most `limit` rows already in memory.
      const rows = await ctx.db
        .query("sales")
        .withIndex("by_brand", (q) => q.eq("brandId", brandId))
        .take(limit);
      return rows.slice().sort(byStartsAtAscending);
    }

    // No filter given: merge the three status partitions of
    // by_status_and_start — each already startsAt-ordered and bounded to
    // `limit` — then take the globally soonest `limit` rows. Three bounded
    // index reads, still never a table scan.
    const partitions = await Promise.all(
      ALL_SALE_STATUSES.map((status) =>
        ctx.db
          .query("sales")
          .withIndex("by_status_and_start", (q) => q.eq("status", status))
          .take(limit),
      ),
    );
    return partitions.flat().sort(byStartsAtAscending).slice(0, limit);
  },
});
