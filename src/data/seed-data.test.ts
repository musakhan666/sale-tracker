import { describe, expect, it } from "vitest";

import { saleStatus } from "../../convex/lib/window";
import { SEED_BRANDS } from "./seed-data";

const MIN_BRANDS = 6;
const MIN_SALES = 20;

describe("SEED_BRANDS", () => {
  it("has at least 6 brands", () => {
    expect(SEED_BRANDS.length).toBeGreaterThanOrEqual(MIN_BRANDS);
  });

  it("has at least 20 sales across all brands", () => {
    const saleCount = SEED_BRANDS.reduce((total, brand) => total + brand.sales.length, 0);
    expect(saleCount).toBeGreaterThanOrEqual(MIN_SALES);
  });

  it("gives every brand a unique, URL-safe slug", () => {
    const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    const slugs = SEED_BRANDS.map((brand) => brand.slug);

    for (const slug of slugs) {
      expect(slug).toMatch(slugPattern);
    }
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("covers all three sale statuses, whenever it is seeded", () => {
    // Each sale's window is an offset from the seed run's `now` (see
    // convex/seed.ts), so status coverage must hold at any `now` — not
    // just the instant this test happens to run.
    const now = Date.now();
    const statuses = new Set(
      SEED_BRANDS.flatMap((brand) =>
        brand.sales.map((sale) =>
          saleStatus({ startsAt: now + sale.startsOffsetMs, endsAt: now + sale.endsOffsetMs }, now),
        ),
      ),
    );

    expect(statuses).toEqual(new Set(["upcoming", "live", "ended"]));
  });
});
