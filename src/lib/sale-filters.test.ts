import { describe, expect, it } from "vitest";

import {
  applySaleFilters,
  buildBrandOptions,
  buildSaleFiltersHref,
  DEFAULT_SORT,
  filterSales,
  parseBrandSlug,
  parseSaleFilters,
  parseSort,
  parseStatus,
  sortSales,
  type FilterableSale,
  type SaleFilters,
} from "./sale-filters";

// A fixed reference instant, expressed as a UTC epoch ms literal so these
// tests do not depend on the host's local timezone (mirrors
// convex/lib/window.test.ts).
const NOW = Date.UTC(2026, 2, 15, 12, 0, 0); // 2026-03-15T12:00:00Z
const DAY_MS = 24 * 60 * 60 * 1000;

function sale(overrides: Partial<FilterableSale["sale"]> = {}): FilterableSale["sale"] {
  return { startsAt: NOW - DAY_MS, endsAt: NOW + DAY_MS, discountPercent: 10, ...overrides };
}

describe("parseBrandSlug", () => {
  it("treats an absent value as no brand filter", () => {
    expect(parseBrandSlug(undefined)).toBeUndefined();
  });

  it("treats an empty string as no brand filter, not a literal empty slug", () => {
    expect(parseBrandSlug("")).toBeUndefined();
  });

  // The bug this ticket exists to fix: a previous attempt keyed the `brand`
  // param on a slugified display name. "Acme & Co_1" is exactly the kind of
  // string a slugify function would rewrite (lowercased, spaces and `&`
  // stripped, underscore rewritten) — this proves no such transform runs.
  it("passes a stored slug through byte-for-byte, never slugifying or normalising it", () => {
    expect(parseBrandSlug("Acme & Co_1")).toBe("Acme & Co_1");
  });
});

describe("parseStatus", () => {
  it("treats an absent value as no status filter", () => {
    expect(parseStatus(undefined)).toBeUndefined();
  });

  it("treats an unrecognised value as no status filter (AC-4)", () => {
    expect(parseStatus("nonsense")).toBeUndefined();
  });

  it.each(["upcoming", "live", "ended"] as const)("accepts %s", (status) => {
    expect(parseStatus(status)).toBe(status);
  });
});

describe("parseSort", () => {
  it("defaults to soonest when absent", () => {
    expect(parseSort(undefined)).toBe("soonest");
  });

  it("defaults to soonest for an unrecognised value (AC-4)", () => {
    expect(parseSort("nonsense")).toBe("soonest");
  });

  it.each(["soonest", "discount"] as const)("accepts %s", (sort) => {
    expect(parseSort(sort)).toBe(sort);
  });
});

describe("parseSaleFilters", () => {
  it("falls back to every default when every param is missing", () => {
    expect(parseSaleFilters({})).toEqual<SaleFilters>({
      brandSlug: undefined,
      status: undefined,
      sort: DEFAULT_SORT,
    });
  });

  it("parses a fully specified combination", () => {
    expect(parseSaleFilters({ brand: "northfield-co", status: "upcoming", sort: "discount" })).toEqual<SaleFilters>({
      brandSlug: "northfield-co",
      status: "upcoming",
      sort: "discount",
    });
  });

  it("takes the first value when a param is repeated in the query string", () => {
    expect(parseSaleFilters({ status: ["live", "ended"] })).toEqual<SaleFilters>({
      brandSlug: undefined,
      status: "live",
      sort: DEFAULT_SORT,
    });
  });

  it("responds with a 200-able default view rather than throwing on a malformed combination (AC-4)", () => {
    expect(() => parseSaleFilters({ status: "nonsense", sort: "also-nonsense" })).not.toThrow();
    expect(parseSaleFilters({ status: "nonsense", sort: "also-nonsense" })).toEqual<SaleFilters>({
      brandSlug: undefined,
      status: undefined,
      sort: DEFAULT_SORT,
    });
  });
});

describe("buildSaleFiltersHref", () => {
  it("omits every param and returns the bare pathname for the all-default combination", () => {
    expect(buildSaleFiltersHref("/", { brandSlug: undefined, status: undefined, sort: DEFAULT_SORT })).toBe("/");
  });

  it("carries the brand's real stored slug into the query string, under the exact param name `brand`", () => {
    const href = buildSaleFiltersHref("/", { brandSlug: "lumen-outfitters", status: undefined, sort: DEFAULT_SORT });
    expect(new URL(href, "https://example.test").searchParams.get("brand")).toBe("lumen-outfitters");
  });

  it("round-trips through parseSaleFilters for a fully specified combination", () => {
    const filters: SaleFilters = { brandSlug: "northfield-co", status: "upcoming", sort: "discount" };
    const href = buildSaleFiltersHref("/", filters);
    const rawParams = Object.fromEntries(new URL(href, "https://example.test").searchParams);

    expect(parseSaleFilters(rawParams)).toEqual(filters);
  });
});

describe("filterSales", () => {
  const sales: FilterableSale[] = [
    { slug: "northfield-co", sale: sale({ startsAt: NOW - DAY_MS, endsAt: NOW + DAY_MS }) }, // live
    { slug: "lumen-outfitters", sale: sale({ startsAt: NOW + DAY_MS, endsAt: NOW + 2 * DAY_MS }) }, // upcoming
    { slug: "northfield-co", sale: sale({ startsAt: NOW - 2 * DAY_MS, endsAt: NOW - DAY_MS }) }, // ended
  ];

  it("matches the brand filter against the stored slug, not any derived value", () => {
    const result = filterSales(sales, { brandSlug: "northfield-co", status: undefined }, NOW);
    expect(result).toHaveLength(2);
    expect(result.every((entry) => entry.slug === "northfield-co")).toBe(true);
  });

  it("returns every brand when no brand filter is set", () => {
    expect(filterSales(sales, { brandSlug: undefined, status: undefined }, NOW)).toHaveLength(3);
  });

  it("filters by status through the shared saleStatus derivation, never an inline comparison", () => {
    const result = filterSales(sales, { brandSlug: undefined, status: "upcoming" }, NOW);
    expect(result).toEqual([sales[1]]);
  });

  it("combines a brand and a status filter", () => {
    const result = filterSales(sales, { brandSlug: "northfield-co", status: "ended" }, NOW);
    expect(result).toEqual([sales[2]]);
  });

  it("returns an empty list, not a crash, for a brand slug that matches nothing", () => {
    expect(filterSales(sales, { brandSlug: "does-not-exist", status: undefined }, NOW)).toEqual([]);
  });
});

describe("sortSales", () => {
  const soon: FilterableSale = { slug: "a", sale: sale({ startsAt: NOW + DAY_MS, discountPercent: 10 }) };
  const soonest: FilterableSale = { slug: "b", sale: sale({ startsAt: NOW - DAY_MS, discountPercent: 50 }) };
  const later: FilterableSale = { slug: "c", sale: sale({ startsAt: NOW + 2 * DAY_MS, discountPercent: 25 }) };

  it("orders by startsAt ascending for sort=soonest", () => {
    expect(sortSales([later, soon, soonest], "soonest")).toEqual([soonest, soon, later]);
  });

  it("orders by discountPercent descending for sort=discount (AC-5)", () => {
    expect(sortSales([soon, soonest, later], "discount")).toEqual([soonest, later, soon]);
  });

  it("does not mutate the array it was given", () => {
    const input = [later, soon, soonest];
    const originalOrder = [...input];
    sortSales(input, "soonest");
    expect(input).toEqual(originalOrder);
  });
});

describe("applySaleFilters", () => {
  it("filters, then sorts, in one call", () => {
    const sales: FilterableSale[] = [
      { slug: "keep", sale: sale({ startsAt: NOW + DAY_MS, discountPercent: 10 }) },
      { slug: "keep", sale: sale({ startsAt: NOW - DAY_MS, discountPercent: 50 }) },
      { slug: "drop", sale: sale({ startsAt: NOW - 3 * DAY_MS, discountPercent: 90 }) },
    ];

    const result = applySaleFilters(sales, { brandSlug: "keep", status: undefined, sort: "discount" }, NOW);

    expect(result.every((entry) => entry.slug === "keep")).toBe(true);
    expect(result.map((entry) => entry.sale.discountPercent)).toEqual([50, 10]);
  });
});

describe("buildBrandOptions", () => {
  it("deduplicates by slug and alphabetises by display name", () => {
    const options = buildBrandOptions([
      { slug: "lumen-outfitters", brandName: "Lumen Outfitters" },
      { slug: "northfield-co", brandName: "Northfield & Co" },
      { slug: "lumen-outfitters", brandName: "Lumen Outfitters" },
    ]);

    expect(options).toEqual([
      { slug: "lumen-outfitters", name: "Lumen Outfitters" },
      { slug: "northfield-co", name: "Northfield & Co" },
    ]);
  });

  it("returns an empty list for an empty catalogue, never a crash", () => {
    expect(buildBrandOptions([])).toEqual([]);
  });
});
