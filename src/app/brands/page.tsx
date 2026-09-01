/**
 * The public brand index (US-006): every covered brand, alphabetical by
 * name, each linking to its own page and showing how many sales it
 * currently has upcoming.
 *
 * `fetchSalesWithBrands()` (src/lib/convex-server.ts) joins sales to a
 * brand *name*, not a brand *slug* — this index needs the slug to link
 * (CLAUDE.md: slug is the stable URL identity, never derived from the
 * name), and it needs brands with zero sales at all to still appear
 * (AC-1, AC-5), which a sales-joined list can never surface. That file is
 * owned by another worker building in parallel this sprint, so rather than
 * editing it, this page reads `brands:list` directly — same
 * `makeFunctionReference`-by-name pattern `convex-server.ts` already uses,
 * for the same reason: this sandbox has never run `npx convex dev`, so the
 * generated `api` object predates these modules — then folds in
 * `fetchSalesWithBrands()`'s sales to compute each brand's upcoming count.
 */
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference, type FunctionReference } from "convex/server";
import Link from "next/link";

import { fetchSalesWithBrands } from "@/lib/convex-server";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { isUpcoming } from "../../../convex/lib/window";

// Forces per-request rendering: a statically cached page would freeze the
// `now` read below at build/cache time (CLAUDE.md, "Sale status is
// derived, never stored as truth" — never during a Server Component render
// that could be cached).
export const dynamic = "force-dynamic";

const brandsList: FunctionReference<"query", "public", Record<string, never>, Doc<"brands">[]> =
  makeFunctionReference("brands:list");

type BrandsFetchResult = { ok: true; brands: Doc<"brands">[] } | { ok: false };

function getConvexClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  return url === undefined || url === "" ? null : new ConvexHttpClient(url);
}

/**
 * Every brand, independent of whether it currently has any sales — see the
 * module comment for why `fetchSalesWithBrands` can't be the only source
 * here. Degrades to `{ ok: false }` rather than throwing on a missing or
 * unreachable deployment, matching `SalesFetchResult`'s posture, so the
 * page always has an explicit empty state to fall back to.
 */
async function fetchBrands(): Promise<BrandsFetchResult> {
  const client = getConvexClient();
  if (client === null) return { ok: false };

  try {
    const brands = await client.query(brandsList, {});
    return { ok: true, brands };
  } catch {
    return { ok: false };
  }
}

type BrandListEntry = {
  slug: string;
  name: string;
  upcomingCount: number;
};

/** Counts, per brand id, sales judged upcoming against one shared `now`. */
function countUpcomingByBrand(
  sales: { sale: Doc<"sales"> }[],
  now: number,
): Map<Id<"brands">, number> {
  const counts = new Map<Id<"brands">, number>();
  for (const { sale } of sales) {
    if (!isUpcoming(sale, now)) continue;
    counts.set(sale.brandId, (counts.get(sale.brandId) ?? 0) + 1);
  }
  return counts;
}

export default async function BrandsPage() {
  // Read once, at request time, and thread it through — every brand's
  // count on this page is judged against the same instant.
  const now = Date.now();
  const [brandsResult, salesResult] = await Promise.all([fetchBrands(), fetchSalesWithBrands()]);

  const upcomingCountByBrandId = brandsResult.ok
    ? countUpcomingByBrand(salesResult.ok ? salesResult.sales : [], now)
    : new Map<Id<"brands">, number>();

  const brands: BrandListEntry[] = brandsResult.ok
    ? brandsResult.brands
        .map((brand) => ({
          slug: brand.slug,
          name: brand.name,
          upcomingCount: upcomingCountByBrandId.get(brand._id) ?? 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-text">Brands</h1>
        <p className="text-sm text-muted">Every brand covered by Sale Tracker.</p>
      </header>

      <nav aria-labelledby="brands-heading" className="flex flex-col gap-4">
        <h2 id="brands-heading" className="text-lg font-semibold text-text">
          All brands
        </h2>

        {brands.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {brands.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={`/brands/${brand.slug}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-6 py-4 text-text hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="font-medium">{brand.name}</span>
                  <span className="text-sm text-muted">
                    {brand.upcomingCount} upcoming {brand.upcomingCount === 1 ? "sale" : "sales"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            {brandsResult.ok ? "No brands are on the schedule right now." : "Brands aren't available yet — check back soon."}
          </p>
        )}
      </nav>
    </main>
  );
}
