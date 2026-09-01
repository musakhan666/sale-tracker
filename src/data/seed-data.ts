/**
 * The v1 hand-maintained dataset (ADR-003): a demo catalogue of invented
 * retail brands and their sales, committed to the repo rather than fetched.
 *
 * Every sale's timing is an offset from the seed run's `now`, not an
 * absolute timestamp — a hardcoded date would eventually sit entirely in
 * the past no matter how long the dataset goes unrun. `convex/seed.ts`
 * resolves each offset against `Date.now()` at seed time, so the dataset
 * always reads as freshly upcoming/live/ended, however long it sits on
 * the shelf. A negative offset is in the past, a positive one in the
 * future; sign alone is what determines `saleStatus()`'s verdict, so it
 * is stable however long the dataset sits unrun.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type SeedSale = {
  title: string;
  discountPercent: number;
  /** Offset from the seed run's `now`, ms. Negative is in the past. */
  startsOffsetMs: number;
  /** Offset from the seed run's `now`, ms. Negative is in the past. */
  endsOffsetMs: number;
};

export type SeedBrand = {
  slug: string;
  name: string;
  sales: SeedSale[];
};

/** A window expressed in whole days from the seed run's `now`. */
function daysWindow(startsInDays: number, endsInDays: number): Pick<SeedSale, "startsOffsetMs" | "endsOffsetMs"> {
  return { startsOffsetMs: startsInDays * DAY_MS, endsOffsetMs: endsInDays * DAY_MS };
}

export const SEED_BRANDS: SeedBrand[] = [
  {
    slug: "northfield-co",
    name: "Northfield & Co",
    sales: [
      { title: "Fall Layers Preview", discountPercent: 20, ...daysWindow(3, 10) },
      { title: "Weekend Flash Event", discountPercent: 30, ...daysWindow(-2, 5) },
      { title: "Summer Clearance", discountPercent: 50, ...daysWindow(-20, -13) },
    ],
  },
  {
    slug: "lumen-outfitters",
    name: "Lumen Outfitters",
    sales: [
      { title: "New Season Launch", discountPercent: 15, ...daysWindow(7, 14) },
      { title: "Holiday Preview", discountPercent: 10, ...daysWindow(21, 35) },
      { title: "Spring Refresh Sale", discountPercent: 40, ...daysWindow(-45, -30) },
    ],
  },
  {
    slug: "cedar-grove-home",
    name: "Cedar Grove Home",
    sales: [
      { title: "Autumn Homeware Drop", discountPercent: 25, ...daysWindow(14, 21) },
      { title: "End of Line Bedding", discountPercent: 35, ...daysWindow(-10, -3) },
      { title: "Warehouse Clearout", discountPercent: 60, ...daysWindow(-60, -50) },
    ],
  },
  {
    slug: "pixel-forge-electronics",
    name: "Pixel Forge Electronics",
    sales: [
      { title: "Back to Campus Tech", discountPercent: 18, ...daysWindow(2, 9) },
      { title: "Flash Discount Weekend", discountPercent: 22, ...daysWindow(-1, 3) },
      { title: "Last Season Models", discountPercent: 45, ...daysWindow(-15, -8) },
    ],
  },
  {
    slug: "marrow-coffee-co",
    name: "Marrow Coffee Co",
    sales: [
      { title: "Roastery Restock Sale", discountPercent: 12, ...daysWindow(5, 12) },
      { title: "Holiday Gift Sets Preview", discountPercent: 20, ...daysWindow(30, 45) },
      { title: "Subscriber Appreciation Days", discountPercent: 15, ...daysWindow(-4, 2) },
    ],
  },
  {
    slug: "solstice-athletics",
    name: "Solstice Athletics",
    sales: [
      { title: "New Kit Launch Sale", discountPercent: 20, ...daysWindow(10, 17) },
      { title: "Marathon Season Clearance", discountPercent: 55, ...daysWindow(-25, -18) },
      { title: "Members Early Access", discountPercent: 25, ...daysWindow(-3, 10) },
    ],
  },
  {
    slug: "harbor-vine",
    name: "Harbor & Vine",
    sales: [
      { title: "Weekend Preview Sale", discountPercent: 15, ...daysWindow(1, 8) },
      { title: "Winter Collection Preview", discountPercent: 10, ...daysWindow(45, 60) },
      { title: "Anniversary Sale Archive", discountPercent: 70, ...daysWindow(-90, -75) },
    ],
  },
];
