/**
 * Pure logic behind the listing page's brand/status/sort filters
 * (CLAUDE.md, "URL is the state"). No React here on purpose: the Server
 * Component page needs to call these directly, and a "use client" module
 * cannot have its plain function exports called from server code — only
 * its component exports can cross that boundary. `src/components/sale-
 * filters.tsx` is the client half; it imports these to stay symmetric with
 * how the URL itself is parsed.
 */
import type { SaleStatus, SaleWindow } from "../../convex/lib/window";
import { saleStatus } from "../../convex/lib/window";

export const SORT_OPTIONS = ["soonest", "discount"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
export const DEFAULT_SORT: SortOption = "soonest";

// Listed by hand rather than derived from `SaleStatus` — that type is owned
// by convex/lib/window.ts (ADR-002) and this is the one place outside it
// that needs every member enumerated, for the filter's option list.
export const STATUS_OPTIONS: readonly SaleStatus[] = ["upcoming", "live", "ended"];

/** What a Next.js Server Component page receives for `searchParams` (Next 16: a `Promise` of this shape). */
export type SaleSearchParams = Record<string, string | string[] | undefined>;

export type SaleFilters = {
  /** The brand's real stored slug, or `undefined` for every brand. Never a value derived from a display name. */
  brandSlug: string | undefined;
  status: SaleStatus | undefined;
  sort: SortOption;
};

/** The shape `filterSales`/`sortSales`/`applySaleFilters` actually read — deliberately narrower than `SaleWithBrand` so fixtures don't need a full Convex document. */
export type FilterableSale = {
  sale: SaleWindow & { discountPercent: number };
  slug: string;
};

export type BrandOption = {
  slug: string;
  name: string;
};

function isSaleStatus(value: string): value is SaleStatus {
  return value === "upcoming" || value === "live" || value === "ended";
}

function isSortOption(value: string): value is SortOption {
  return value === "soonest" || value === "discount";
}

/** A search param can arrive repeated (`?status=a&status=b`) — only the first occurrence is ever meaningful here. */
function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Empty string (`?brand=`) is treated the same as absent, not as a literal empty slug. */
export function parseBrandSlug(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

/** Absent or unrecognised falls back to "every status" — never a crash, never a filtered-to-nothing page. */
export function parseStatus(value: string | undefined): SaleStatus | undefined {
  return value !== undefined && isSaleStatus(value) ? value : undefined;
}

/** Absent or unrecognised falls back to `soonest`. */
export function parseSort(value: string | undefined): SortOption {
  return value !== undefined && isSortOption(value) ? value : DEFAULT_SORT;
}

export function parseSaleFilters(raw: SaleSearchParams): SaleFilters {
  return {
    brandSlug: parseBrandSlug(firstValue(raw.brand)),
    status: parseStatus(firstValue(raw.status)),
    sort: parseSort(firstValue(raw.sort)),
  };
}

/**
 * The inverse of `parseSaleFilters`: default values are left out of the
 * query string entirely, so a default filter combination round-trips to
 * the bare pathname rather than growing a redundant `?sort=soonest`.
 */
export function buildSaleFiltersHref(pathname: string, filters: SaleFilters): string {
  const params = new URLSearchParams();
  if (filters.brandSlug !== undefined) params.set("brand", filters.brandSlug);
  if (filters.status !== undefined) params.set("status", filters.status);
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);

  const query = params.toString();
  return query === "" ? pathname : `${pathname}?${query}`;
}

export function filterSales<T extends FilterableSale>(
  sales: readonly T[],
  filters: Pick<SaleFilters, "brandSlug" | "status">,
  now: number,
): T[] {
  return sales.filter((entry) => {
    if (filters.brandSlug !== undefined && entry.slug !== filters.brandSlug) return false;
    if (filters.status !== undefined && saleStatus(entry.sale, now) !== filters.status) return false;
    return true;
  });
}

export function sortSales<T extends FilterableSale>(sales: readonly T[], sort: SortOption): T[] {
  const sorted = [...sales];
  sorted.sort((a, b) =>
    sort === "discount" ? b.sale.discountPercent - a.sale.discountPercent : a.sale.startsAt - b.sale.startsAt,
  );
  return sorted;
}

/** Filter, then sort — the composition the listing page actually needs. */
export function applySaleFilters<T extends FilterableSale>(sales: readonly T[], filters: SaleFilters, now: number): T[] {
  return sortSales(filterSales(sales, filters, now), filters.sort);
}

/** Every brand present in `sales`, deduplicated by slug and alphabetised by display name, for the filter's brand option list. */
export function buildBrandOptions(sales: readonly { slug: string; brandName: string }[]): BrandOption[] {
  const nameBySlug = new Map<string, string>();
  for (const { slug, brandName } of sales) {
    if (!nameBySlug.has(slug)) nameBySlug.set(slug, brandName);
  }

  return [...nameBySlug.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
}
