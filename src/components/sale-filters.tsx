"use client";

import type { ChangeEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  buildSaleFiltersHref,
  parseBrandSlug,
  parseSort,
  parseStatus,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  type BrandOption,
  type SaleFilters,
  type SortOption,
} from "@/lib/sale-filters";

import type { SaleStatus } from "../../convex/lib/window";

const SELECT_CLASS =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2";

const STATUS_LABEL: Record<SaleStatus, string> = {
  upcoming: "Upcoming",
  live: "Live now",
  ended: "Ended",
};

const SORT_LABEL: Record<SortOption, string> = {
  soonest: "Starting soonest",
  discount: "Biggest discount",
};

type SaleFiltersProps = {
  brandOptions: BrandOption[];
  /** The filters the server already derived from this same request's URL — read back, never mirrored into local state. */
  filters: SaleFilters;
};

export function SaleFilters({ brandOptions, filters }: SaleFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();

  function navigateTo(next: SaleFilters): void {
    router.push(buildSaleFiltersHref(pathname, next), { scroll: false });
  }

  function handleBrandChange(event: ChangeEvent<HTMLSelectElement>): void {
    navigateTo({ ...filters, brandSlug: parseBrandSlug(event.target.value) });
  }

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>): void {
    navigateTo({ ...filters, status: parseStatus(event.target.value) });
  }

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>): void {
    navigateTo({ ...filters, sort: parseSort(event.target.value) });
  }

  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-end sm:gap-6">
      <legend className="px-1 text-sm font-medium text-text">Filter and sort</legend>

      <div className="flex flex-col gap-1">
        <label htmlFor="sale-filter-brand" className="text-xs font-medium text-muted">
          Brand
        </label>
        <select
          id="sale-filter-brand"
          name="brand"
          value={filters.brandSlug ?? ""}
          onChange={handleBrandChange}
          className={SELECT_CLASS}
        >
          <option value="">All brands</option>
          {brandOptions.map((brand) => (
            <option key={brand.slug} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sale-filter-status" className="text-xs font-medium text-muted">
          Status
        </label>
        <select
          id="sale-filter-status"
          name="status"
          value={filters.status ?? ""}
          onChange={handleStatusChange}
          className={SELECT_CLASS}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sale-filter-sort" className="text-xs font-medium text-muted">
          Sort by
        </label>
        <select
          id="sale-filter-sort"
          name="sort"
          value={filters.sort}
          onChange={handleSortChange}
          className={SELECT_CLASS}
        >
          {SORT_OPTIONS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABEL[sort]}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
