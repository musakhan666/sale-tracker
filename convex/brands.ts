/**
 * Public queries behind the brand pages: lookup by slug for a brand's own
 * page, and a bounded listing for the brand index page.
 *
 * public: read-only queries over the public brand directory — same posture
 * as convex/sales.ts, for the same reason.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import schema from "./schema";

/** Page size the brand index page gets — see convex/sales.ts for the sibling constant. */
export const DEFAULT_PAGE_SIZE = 20;

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(schema.doc("brands"), v.null()),
  handler: async (ctx, args) => {
    // slug is the brand's stable URL identity (CLAUDE.md) — at most one
    // brand can own it. `.unique()` returns that brand, `null` if none
    // (AC-4), and throws only if the data itself holds a duplicate slug,
    // which is a genuine integrity bug rather than an expected "not found".
    return await ctx.db
      .query("brands")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const list = query({
  args: {},
  returns: v.array(schema.doc("brands")),
  handler: async (ctx) => {
    // No listing-specific index exists or is needed beyond by_slug;
    // reading through it gives a bounded, alphabetically ordered page
    // without scanning the table.
    return await ctx.db.query("brands").withIndex("by_slug").take(DEFAULT_PAGE_SIZE);
  },
});
