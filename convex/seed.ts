/**
 * Loads the v1 hand-maintained dataset (`src/data/seed-data.ts`, ADR-003)
 * into an empty deployment. Dev-only data loader: `internalMutation`, not
 * `mutation`, so it is not callable from the browser — run it with
 * `npx convex run seed:seedDataset` or the dashboard's function runner.
 *
 * Bound to this schema's `DataModel` via `internalMutationGeneric` rather
 * than `./_generated/server`: that module is written by `npx convex dev`
 * against a live deployment, and this offline sprint worktree has none.
 * The cast below reproduces exactly what codegen emits for `internalMutation`
 * once a deployment exists — see convex/schema.ts for the model it types
 * against.
 */
import { internalMutationGeneric, type DataModelFromSchemaDefinition, type MutationBuilder } from "convex/server";
import { v } from "convex/values";

import { saleStatus } from "./lib/window";
import schema from "./schema";
import { SEED_BRANDS } from "../src/data/seed-data";

type DataModel = DataModelFromSchemaDefinition<typeof schema>;

const internalMutation = internalMutationGeneric as MutationBuilder<DataModel, "internal">;

export const seedDataset = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    for (const brand of SEED_BRANDS) {
      const existingBrand = await ctx.db
        .query("brands")
        .withIndex("by_slug", (q) => q.eq("slug", brand.slug))
        .unique();

      // A brand and all of its sales are inserted together below, so an
      // existing slug means this brand's rows are already seeded —
      // re-running must not duplicate either, and the slug is never
      // rewritten once it exists.
      if (existingBrand !== null) continue;

      const brandId = await ctx.db.insert("brands", { slug: brand.slug, name: brand.name });

      for (const sale of brand.sales) {
        const startsAt = now + sale.startsOffsetMs;
        const endsAt = now + sale.endsOffsetMs;

        await ctx.db.insert("sales", {
          brandId,
          title: sale.title,
          discountPercent: sale.discountPercent,
          startsAt,
          endsAt,
          status: saleStatus({ startsAt, endsAt }, now),
        });
      }
    }

    return null;
  },
});
