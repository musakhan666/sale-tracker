import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SaleCard } from "@/components/sale-card";
import { fetchBrandWithSales } from "@/lib/convex-server";

import { saleStatus } from "../../../../convex/lib/window";

// Forces per-request rendering: a statically cached page would freeze the
// `now` read below at build/cache time (CLAUDE.md, "Sale status is
// derived, never stored as truth" — mirrors src/app/page.tsx).
export const dynamic = "force-dynamic";

type BrandPageProps = {
  params: Promise<{ slug: string }>;
};

// generateMetadata and the page component both need this brand for the
// same request; cache() (React) dedupes the Convex round trip between
// them instead of fetching it twice.
const getBrandPageData = cache((slug: string) => fetchBrandWithSales(slug));

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getBrandPageData(slug);

  if (!result.ok) {
    // Deployment unreachable — we can't confirm the brand's real name, so
    // name the page by its URL identity rather than shipping a blank title.
    return {
      title: slug,
      description: "Sales for this brand aren't available right now.",
    };
  }

  if (!result.found) {
    return { title: "Brand not found" };
  }

  const { brand } = result.data;
  return {
    title: brand.name,
    description: `Upcoming and live sales from ${brand.name}.`,
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  // Read once, at request time, and thread it through — every sale on this
  // page is judged against the same instant (mirrors src/app/page.tsx).
  const now = Date.now();
  const result = await getBrandPageData(slug);

  if (!result.ok) {
    // Unreachable deployment is not the same as a missing brand (AC-3 vs.
    // "couldn't look") — degrade in place instead of 404ing a brand we
    // simply couldn't check.
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 p-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-text">{slug}</h1>
        </header>
        <p className="text-sm text-muted">Sales aren&apos;t available right now — check back soon.</p>
      </main>
    );
  }

  if (!result.found) {
    notFound();
  }

  const { brand, sales } = result.data;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-text">{brand.name}</h1>
      </header>

      <section aria-labelledby="brand-sales-heading" className="flex flex-col gap-4">
        <h2 id="brand-sales-heading" className="text-lg font-semibold text-text">
          Sales
        </h2>

        {sales.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sales.map((sale) => (
              <SaleCard
                key={sale._id}
                sale={sale}
                brandName={brand.name}
                brandSlug={brand.slug}
                status={saleStatus(sale, now)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No sales are on the schedule for this brand right now.</p>
        )}
      </section>
    </main>
  );
}
