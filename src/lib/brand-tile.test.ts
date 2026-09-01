import { describe, expect, it } from "vitest";

import { brandInitials, brandTileClass } from "./brand-tile";

describe("brandTileClass", () => {
  it("is stable for the same slug", () => {
    expect(brandTileClass("harbor-vine")).toBe(brandTileClass("harbor-vine"));
  });

  it("always names a class globals.css actually defines", () => {
    const slugs = ["harbor-vine", "solstice-athletics", "a", "", "z".repeat(200)];
    for (const slug of slugs) {
      expect(brandTileClass(slug)).toMatch(/^brand-tile-[0-5]$/);
    }
  });

  it("spreads a realistic brand set across more than one tile", () => {
    const slugs = [
      "harbor-vine",
      "solstice-athletics",
      "marrow-coffee-co",
      "lumen-outfitters",
      "cedar-grove-home",
      "pixel-forge-electronics",
      "northfield-co",
    ];
    expect(new Set(slugs.map(brandTileClass)).size).toBeGreaterThan(1);
  });
});

describe("brandInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(brandInitials("Solstice Athletics")).toBe("SA");
  });

  it("skips punctuation-only words so an ampersand never becomes an initial", () => {
    expect(brandInitials("Harbor & Vine")).toBe("HV");
  });

  it("handles a single-word brand", () => {
    expect(brandInitials("Northfield")).toBe("N");
  });

  it("returns an empty string rather than throwing on an empty name", () => {
    expect(brandInitials("")).toBe("");
  });

  it("uppercases a lowercase name", () => {
    expect(brandInitials("cedar grove")).toBe("CG");
  });
});
