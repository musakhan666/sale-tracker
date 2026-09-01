import { SaleCard } from "@/components/sale-card";
import { SaleFilters } from "@/components/sale-filters";
import { fetchSalesWithBrands } from "@/lib/convex-server";
import { applySaleFilters, buildBrandOptions, parseSaleFilters, type SaleSearchParams } from "@/lib/sale-filters";

import { saleStatus } from "../../convex/lib/window";

// Forces per-request rendering: a statically cached page would freeze the
// `now` read below at build/cache time (CLAUDE.md, "Sale status is
// derived, never stored as truth" — never during a Server Component render
// that could be cached).
export const dynamic = "force-dynamic";

type HomePageProps = {
  // Next.js 16: `searchParams` is a Promise, not a plain object — must be awaited.
  searchParams: Promise<SaleSearchParams>;
};

/** Distinguishes "nothing was ever on the schedule" from "the current filters matched nothing" from "couldn't reach the deployment" — AC-4 requires all three to render, never crash. */
function emptyStateMessage(fetchOk: boolean, filtered: boolean, totalCount: number): string {
  if (!fetchOk) return "Sales aren't available yet — check back soon.";
  // Checked before the empty-schedule case: with a brand filter applied the
  // query is already brand-scoped, so an empty result means the filter
  // matched nothing, not that the schedule is bare.
  if (filtered) return "No sales match the selected filters.";
  if (totalCount === 0) return "No sales are on the schedule right now.";
  return "";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Read once, at request time, and thread it through — every sale on this
  // page is judged against the same instant.
  const now = Date.now();
  // The filters decide what to fetch, so they are parsed first: a brand
  // filter is pushed into the query rather than applied to its result.
  const filters = parseSaleFilters(await searchParams);
  const result = await fetchSalesWithBrands({ brandSlug: filters.brandSlug });

  const allSales = result.ok ? result.sales : [];
  // Options come from every brand, not from the returned sales — those are
  // already brand-scoped when a filter is on, which would collapse the list
  // to the single selected option.
  const brandOptions = result.ok
    ? buildBrandOptions(result.brands.map((brand) => ({ slug: brand.slug, brandName: brand.name })))
    : [];
  // Status still derives through saleStatus() here rather than the query's
  // stored-status index: the column is a cron-maintained mirror (ADR-002),
  // and the derived value is the one that is correct at this instant.
  const sales = applySaleFilters(allSales, filters, now);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-text">Sale Tracker</h1>
        <p className="text-sm text-muted">Upcoming sales, organised by brand.</p>
      </header>

      <SaleFilters brandOptions={brandOptions} filters={filters} />

      <section aria-labelledby="sales-heading" className="flex flex-col gap-4">
        <h2 id="sales-heading" className="text-lg font-semibold text-text">
          All sales
        </h2>

        {sales.length > 0 ? (
          sales.map(({ sale, brandName }) => (
            <SaleCard key={sale._id} sale={sale} brandName={brandName} status={saleStatus(sale, now)} />
          ))
        ) : (
          <p className="text-sm text-muted">
            {emptyStateMessage(result.ok, filters.brandSlug !== undefined || filters.status !== undefined, allSales.length)}
          </p>
        )}
      </section>
    </main>
  );
}
