/**
 * Visual identity for a brand, derived from its stable slug.
 *
 * Sales carry no image, so each brand gets a gradient tile instead. Keying it
 * to the slug rather than to array position means a brand looks the same on
 * the listing, on its own page, and after the list is re-sorted or filtered.
 */

/** How many `.brand-tile-N` classes globals.css defines. */
const TILE_COUNT = 6;

/** Stable across processes and deploys — unlike a hashed object identity. */
function slugHash(slug: string): number {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) % 100_000_007;
  }
  return hash;
}

export function brandTileClass(slug: string): string {
  return `brand-tile-${slugHash(slug) % TILE_COUNT}`;
}

/** Up to two letters, for the watermark on the tile. Skips "&" and similar so
 *  "Harbor & Vine" reads HV rather than H&. */
export function brandInitials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 0)
    .map((word) => word[0] ?? "");
  return letters.slice(0, 2).join("").toUpperCase();
}
