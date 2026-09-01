import { SaleCard } from "@/components/sale-card";
import { fetchSalesWithBrands } from "@/lib/convex-server";

import { saleStatus } from "../../convex/lib/window";

// Forces per-request rendering: a statically cached page would freeze the
// `now` read below at build/cache time (CLAUDE.md, "Sale status is
// derived, never stored as truth" — never during a Server Component render
// that could be cached).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Read once, at request time, and thread it through — every sale on this
  // page is judged against the same instant.
  const now = Date.now();
  const result = await fetchSalesWithBrands();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-text">Sale Tracker</h1>
        <p className="text-sm text-muted">Upcoming sales, organised by brand.</p>
      </header>

      <section aria-labelledby="sales-heading" className="flex flex-col gap-4">
        <h2 id="sales-heading" className="text-lg font-semibold text-text">
          All sales
        </h2>

        {result.ok && result.sales.length > 0 ? (
          result.sales.map(({ sale, brandName }) => (
            <SaleCard key={sale._id} sale={sale} brandName={brandName} status={saleStatus(sale, now)} />
          ))
        ) : (
          <p className="text-sm text-muted">
            {result.ok ? "No sales are on the schedule right now." : "Sales aren't available yet — check back soon."}
          </p>
        )}
      </section>
    </main>
  );
}
