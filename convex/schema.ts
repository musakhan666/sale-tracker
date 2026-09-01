/**
 * The whole data model, one place (see rules/convex-backend.md, "One file
 * per domain"). Two tables: `brands` and `sales`.
 *
 * `sales.status` mirrors `saleStatus()` from `convex/lib/window.ts` — the
 * one pure function that derives status from `startsAt`/`endsAt`/`now`
 * (ADR-002). The column exists solely so it can be indexed; a scheduled
 * function maintains it and nothing else writes it.
 */
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  brands: defineTable({
    slug: v.string(),
    name: v.string(),
  }).index("by_slug", ["slug"]),

  sales: defineTable({
    brandId: v.id("brands"),
    title: v.string(),
    discountPercent: v.number(),
    // Epoch ms, UTC — never a string, never a Convex date type. See
    // CLAUDE.md, "Sale status is derived, never stored as truth."
    startsAt: v.number(),
    endsAt: v.number(),
    status: v.union(v.literal("upcoming"), v.literal("live"), v.literal("ended")),
  })
    .index("by_brand", ["brandId"])
    .index("by_status_and_start", ["status", "startsAt"]),
});
