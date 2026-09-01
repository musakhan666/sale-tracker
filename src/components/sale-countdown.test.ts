import { describe, expect, it } from "vitest";

import { formatCountdown, formatInstant, toUtcIso } from "./sale-countdown";

// 2026-06-15T12:00:00.000Z — a summer instant so DST-observing zones on
// both sides of UTC (US Pacific, Europe/London) are in their DST offset,
// matching what a viewer would actually see in that season.
const JUNE_INSTANT_MS = Date.UTC(2026, 5, 15, 12, 0, 0);

describe("formatInstant", () => {
  it("formats the same instant as an earlier local time for a viewer behind UTC (AC-4)", () => {
    // Los Angeles is UTC-7 in June (PDT): 12:00 UTC -> 05:00 local.
    expect(formatInstant(JUNE_INSTANT_MS, "America/Los_Angeles")).toBe("Jun 15, 2026, 5:00 AM");
  });

  it("formats the same instant as a later local time for a viewer ahead of UTC (AC-3)", () => {
    // Tokyo is UTC+9 year-round: 12:00 UTC -> 21:00 local, same calendar day.
    expect(formatInstant(JUNE_INSTANT_MS, "Asia/Tokyo")).toBe("Jun 15, 2026, 9:00 PM");
  });

  it("rolls the calendar day over for a zone far enough ahead of UTC", () => {
    // Auckland is UTC+12 in June (NZST): 12:00 UTC on the 15th -> 00:00 on the 16th local.
    expect(formatInstant(JUNE_INSTANT_MS, "Pacific/Auckland")).toBe("Jun 16, 2026, 12:00 AM");
  });
});

describe("toUtcIso", () => {
  it("carries an ISO 8601 UTC instant, suitable for a <time dateTime> attribute (AC-7)", () => {
    expect(toUtcIso(JUNE_INSTANT_MS)).toBe("2026-06-15T12:00:00.000Z");
  });

  it("matches the exact instant it was given, not a rounded or zone-shifted one", () => {
    const preciseInstantMs = Date.UTC(2026, 0, 1, 0, 0, 0, 1);
    expect(toUtcIso(preciseInstantMs)).toBe("2026-01-01T00:00:00.001Z");
  });
});

describe("formatCountdown", () => {
  const ONE_MINUTE_MS = 60_000;
  const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
  const ONE_DAY_MS = 24 * ONE_HOUR_MS;

  it("shows days and hours once more than a day remains", () => {
    expect(formatCountdown(2 * ONE_DAY_MS + 3 * ONE_HOUR_MS)).toBe("2d 3h");
  });

  it("shows hours and minutes once under a day but over an hour remains", () => {
    expect(formatCountdown(4 * ONE_HOUR_MS + 15 * ONE_MINUTE_MS)).toBe("4h 15m");
  });

  it("shows minutes once under an hour remains", () => {
    expect(formatCountdown(45 * ONE_MINUTE_MS)).toBe("45m");
  });

  it("shows a sub-minute message rather than 0m when under a minute remains", () => {
    expect(formatCountdown(30_000)).toBe("less than a minute");
  });

  it("clamps a negative remainder to the sub-minute message instead of a negative value", () => {
    expect(formatCountdown(-1)).toBe("less than a minute");
  });
});
