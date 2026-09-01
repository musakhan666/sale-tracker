/**
 * Server-only Convex access for the root route.
 *
 * The route must stay crawlable with JavaScript disabled (CLAUDE.md), so it
 * fetches with `ConvexHttpClient` from a Server Component rather than a
 * `ConvexProvider` + hooks — no client-side round trip is needed for the
 * first paint. `sales:list` and `brands:list` are referenced by name via
 * `makeFunctionReference` instead of the generated `api` object: this
 * sandbox has never run `npx convex dev` against a live deployment, so
 * `convex/_generated/api.d.ts` predates these two modules and doesn't
 * declare them.
 *
 * No deployment exists in this environment, so a missing
 * `NEXT_PUBLIC_CONVEX_URL` — and any failure reaching one that is
 * configured — is treated as an empty catalogue rather than a thrown
 * error, so the page still renders an explicit empty state.
 */
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference, type FunctionReference } from "convex/server";

import type { Doc } from "../../convex/_generated/dataModel";

export type SaleWithBrand = {
  sale: Doc<"sales">;
  brandName: string;
};

export type SalesFetchResult =
  | { ok: true; sales: SaleWithBrand[] }
  | { ok: false; reason: "not-configured" | "fetch-failed" };

const salesList: FunctionReference<"query", "public", Record<string, never>, Doc<"sales">[]> =
  makeFunctionReference("sales:list");

const brandsList: FunctionReference<"query", "public", Record<string, never>, Doc<"brands">[]> =
  makeFunctionReference("brands:list");

function getConvexClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  return url === undefined || url === "" ? null : new ConvexHttpClient(url);
}

/** Every sale, soonest-opening first, paired with its brand's display name. */
export async function fetchSalesWithBrands(): Promise<SalesFetchResult> {
  const client = getConvexClient();
  if (client === null) return { ok: false, reason: "not-configured" };

  try {
    const [sales, brands] = await Promise.all([client.query(salesList, {}), client.query(brandsList, {})]);
    const brandNameById = new Map(brands.map((brand) => [brand._id, brand.name]));
    return {
      ok: true,
      sales: sales.map((sale) => ({
        sale,
        brandName: brandNameById.get(sale.brandId) ?? "Unknown brand",
      })),
    };
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
}
