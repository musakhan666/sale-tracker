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
 *
 * `fetchBrandWithSales` (brand page, /brands/[slug]) extends this same
 * posture but needs a third outcome the root route doesn't: a brand that
 * genuinely doesn't exist. That is `found: false` inside an `ok: true`
 * result, kept deliberately distinct from `ok: false` (deployment
 * unreachable) — the caller 404s on the former and degrades on the
 * latter, and conflating them would 404 a brand the page simply couldn't
 * reach.
 */
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference, type FunctionReference } from "convex/server";

import type { Doc, Id } from "../../convex/_generated/dataModel";

export type SaleWithBrand = {
  sale: Doc<"sales">;
  brandName: string;
  /** The brand's stable, stored slug — the URL identity (CLAUDE.md). Never
   *  derived from `brandName`: a filter or link keyed on a slugified
   *  display name breaks the moment the brand is renamed. */
  slug: string;
};

export type SalesFetchResult =
  | { ok: true; sales: SaleWithBrand[]; brands: Doc<"brands">[] }
  | { ok: false; reason: "not-configured" | "fetch-failed" };

export type BrandWithSales = {
  brand: Doc<"brands">;
  sales: Doc<"sales">[];
};

export type BrandPageFetchResult =
  | { ok: true; found: true; data: BrandWithSales }
  | { ok: true; found: false }
  | { ok: false; reason: "not-configured" | "fetch-failed" };

// Generous enough that a real brand's sale history is never silently
// truncated on its own page, while still bounding the query — see
// convex/sales.ts, DEFAULT_PAGE_SIZE, for the sibling constant on the
// unfiltered listing.
const BRAND_SALES_LIMIT = 200;

// The listing's own bound. Narrowing by brand happens in the query, through
// by_brand; everything after that — status derivation and sorting — runs in
// memory, so this must be large enough that it never truncates the set those
// steps operate on. A page-sized bound here silently drops a brand's sales
// past the page edge before the filter ever runs.
const LISTING_LIMIT = 200;

const salesList: FunctionReference<"query", "public", Record<string, never>, Doc<"sales">[]> =
  makeFunctionReference("sales:list");

const brandsList: FunctionReference<"query", "public", Record<string, never>, Doc<"brands">[]> =
  makeFunctionReference("brands:list");

const brandGetBySlug: FunctionReference<"query", "public", { slug: string }, Doc<"brands"> | null> =
  makeFunctionReference("brands:getBySlug");

const salesListFiltered: FunctionReference<
  "query",
  "public",
  { brandId?: Id<"brands">; limit?: number },
  Doc<"sales">[]
> = makeFunctionReference("sales:list");

const salesListByBrand: FunctionReference<
  "query",
  "public",
  { brandId: Id<"brands">; limit: number },
  Doc<"sales">[]
> = makeFunctionReference("sales:list");

function getConvexClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  return url === undefined || url === "" ? null : new ConvexHttpClient(url);
}

/**
 * Sales for the public listing, soonest-opening first, each paired with its
 * brand's display name and stable slug — plus every brand, for the filter's
 * option list.
 *
 * A `brandSlug` narrows the query itself, through the `by_brand` index. It is
 * deliberately not a caller-side filter: filtering a bounded page in memory
 * drops any sale that fell past the page edge, so a brand with more sales than
 * the page holds would silently under-report.
 */
export async function fetchSalesWithBrands(
  options: { brandSlug?: string } = {},
): Promise<SalesFetchResult> {
  const client = getConvexClient();
  if (client === null) return { ok: false, reason: "not-configured" };

  try {
    const brands = await client.query(brandsList, {});
    const brandById = new Map(brands.map((brand) => [brand._id, { name: brand.name, slug: brand.slug }]));

    let brandId: Id<"brands"> | undefined;
    if (options.brandSlug !== undefined) {
      const match = brands.find((brand) => brand.slug === options.brandSlug);
      // An unknown slug matches nothing — distinct from no filter at all.
      if (match === undefined) return { ok: true, sales: [], brands };
      brandId = match._id;
    }

    const sales = await client.query(salesListFiltered, { brandId, limit: LISTING_LIMIT });
    return {
      ok: true,
      brands,
      sales: sales.map((sale) => {
        const brand = brandById.get(sale.brandId);
        return {
          sale,
          brandName: brand?.name ?? "Unknown brand",
          slug: brand?.slug ?? "unknown",
        };
      }),
    };
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
}

/**
 * One brand, resolved by its stable slug, with its own sales — soonest
 * opening first (the `sales:list` handler already sorts a brand-scoped
 * page by `startsAt`, so no re-sort is needed here). See the module
 * comment above for why "no such brand" and "couldn't reach the
 * deployment" are kept as separate outcomes rather than both degrading
 * to a missing brand.
 */
export async function fetchBrandWithSales(slug: string): Promise<BrandPageFetchResult> {
  const client = getConvexClient();
  if (client === null) return { ok: false, reason: "not-configured" };

  try {
    const brand = await client.query(brandGetBySlug, { slug });
    if (brand === null) return { ok: true, found: false };

    const sales = await client.query(salesListByBrand, { brandId: brand._id, limit: BRAND_SALES_LIMIT });
    return { ok: true, found: true, data: { brand, sales } };
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
}
