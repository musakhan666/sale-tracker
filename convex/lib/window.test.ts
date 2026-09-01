import { describe, expect, it } from "vitest";

import { isEnded, isLive, isUpcoming, saleStatus, type SaleWindow } from "./window";

// A fixed reference instant, expressed as a UTC epoch ms literal so the
// window under test does not depend on the host's local timezone.
const T_START = Date.UTC(2026, 2, 1, 9, 0, 0); // 2026-03-01T09:00:00Z
const T_END = Date.UTC(2026, 2, 8, 9, 0, 0); // 2026-03-08T09:00:00Z

const window: SaleWindow = { startsAt: T_START, endsAt: T_END };

describe("saleStatus", () => {
  // AC-1
  it("is upcoming one ms before the start instant", () => {
    expect(saleStatus(window, T_START - 1)).toBe("upcoming");
  });

  // AC-2
  it("is live at the exact start instant", () => {
    expect(saleStatus(window, T_START)).toBe("live");
  });

  it("is live one ms after the start instant", () => {
    expect(saleStatus(window, T_START + 1)).toBe("live");
  });

  // AC-3
  it("is live one ms before the end instant", () => {
    expect(saleStatus(window, T_END - 1)).toBe("live");
  });

  // AC-4
  it("is ended at the exact end instant", () => {
    expect(saleStatus(window, T_END)).toBe("ended");
  });

  it("is ended well after the end instant", () => {
    expect(saleStatus(window, T_END + 1_000)).toBe("ended");
  });

  // AC-5
  it("treats a zero-length window as ended at its instant, never live", () => {
    const instant = Date.UTC(2026, 5, 15, 12, 0, 0);
    const zeroLength: SaleWindow = { startsAt: instant, endsAt: instant };

    expect(saleStatus(zeroLength, instant)).toBe("ended");
  });

  it("treats a zero-length window as upcoming one ms before its instant", () => {
    const instant = Date.UTC(2026, 5, 15, 12, 0, 0);
    const zeroLength: SaleWindow = { startsAt: instant, endsAt: instant };

    expect(saleStatus(zeroLength, instant - 1)).toBe("upcoming");
  });

  it("treats a zero-length window as ended after its instant", () => {
    const instant = Date.UTC(2026, 5, 15, 12, 0, 0);
    const zeroLength: SaleWindow = { startsAt: instant, endsAt: instant };

    expect(saleStatus(zeroLength, instant + 1)).toBe("ended");
  });

  it("is never live for a window that ends before it starts", () => {
    const inverted: SaleWindow = { startsAt: 200, endsAt: 100 };

    // now < startsAt is checked first, so every instant before startsAt
    // reads as upcoming and every instant from startsAt onward reads as
    // ended — there is no instant where startsAt <= now < endsAt can
    // hold when endsAt < startsAt, so "live" is unreachable.
    expect(saleStatus(inverted, 50)).toBe("upcoming");
    expect(saleStatus(inverted, 100)).toBe("upcoming");
    expect(saleStatus(inverted, 150)).toBe("upcoming");
    expect(saleStatus(inverted, 200)).toBe("ended");
    expect(saleStatus(inverted, 250)).toBe("ended");
  });

  // AC-6: spring-forward — UK clocks jump 01:00 UTC -> 02:00 BST on the
  // last Sunday of March. The window spans that instant; results are
  // driven purely by UTC epoch comparison, so the clock jump is invisible
  // to this function regardless of what timezone the process runs under.
  describe("DST spring-forward transition", () => {
    const springStart = Date.UTC(2026, 2, 29, 0, 0, 0); // 2026-03-29T00:00:00Z
    const springTransition = Date.UTC(2026, 2, 29, 1, 0, 0); // 2026-03-29T01:00:00Z (UK: 01:00 -> 02:00)
    const springEnd = Date.UTC(2026, 2, 29, 3, 0, 0); // 2026-03-29T03:00:00Z
    const springWindow: SaleWindow = { startsAt: springStart, endsAt: springEnd };

    it("is live in the hour immediately before the transition instant", () => {
      expect(saleStatus(springWindow, springTransition - 1)).toBe("live");
    });

    it("is live at the transition instant itself", () => {
      expect(saleStatus(springWindow, springTransition)).toBe("live");
    });

    it("is live in the hour immediately after the transition instant", () => {
      expect(saleStatus(springWindow, springTransition + 1)).toBe("live");
    });

    it("is upcoming before the window starts, ended after it ends", () => {
      expect(saleStatus(springWindow, springStart - 1)).toBe("upcoming");
      expect(saleStatus(springWindow, springEnd)).toBe("ended");
    });
  });

  // AC-7: autumn-back — US clocks fall 06:00 UTC (2:00 EDT) back to
  // 06:00 UTC read again as 1:00 EST on the first Sunday of November.
  describe("DST autumn-back transition", () => {
    const fallStart = Date.UTC(2026, 10, 1, 5, 0, 0); // 2026-11-01T05:00:00Z
    const fallTransition = Date.UTC(2026, 10, 1, 6, 0, 0); // 2026-11-01T06:00:00Z (US: 2:00 EDT -> 1:00 EST)
    const fallEnd = Date.UTC(2026, 10, 1, 7, 0, 0); // 2026-11-01T07:00:00Z
    const fallWindow: SaleWindow = { startsAt: fallStart, endsAt: fallEnd };

    it("is live in the hour immediately before the transition instant", () => {
      expect(saleStatus(fallWindow, fallTransition - 1)).toBe("live");
    });

    it("is live at the transition instant itself", () => {
      expect(saleStatus(fallWindow, fallTransition)).toBe("live");
    });

    it("is live in the hour immediately after the transition instant", () => {
      expect(saleStatus(fallWindow, fallTransition + 1)).toBe("live");
    });

    it("is upcoming before the window starts, ended after it ends", () => {
      expect(saleStatus(fallWindow, fallStart - 1)).toBe("upcoming");
      expect(saleStatus(fallWindow, fallEnd)).toBe("ended");
    });
  });

  it("defaults now to the current instant when omitted", () => {
    const past: SaleWindow = { startsAt: 0, endsAt: 1 };

    expect(saleStatus(past)).toBe("ended");
  });
});

describe("isUpcoming", () => {
  it("is true one ms before the start instant", () => {
    expect(isUpcoming(window, T_START - 1)).toBe(true);
  });

  it("is false at the exact start instant", () => {
    expect(isUpcoming(window, T_START)).toBe(false);
  });
});

describe("isLive", () => {
  it("is true at the exact start instant", () => {
    expect(isLive(window, T_START)).toBe(true);
  });

  it("is false at the exact end instant", () => {
    expect(isLive(window, T_END)).toBe(false);
  });

  it("is false for a zero-length window at its instant", () => {
    const instant = Date.UTC(2026, 5, 15, 12, 0, 0);
    expect(isLive({ startsAt: instant, endsAt: instant }, instant)).toBe(false);
  });
});

describe("isEnded", () => {
  it("is false one ms before the end instant", () => {
    expect(isEnded(window, T_END - 1)).toBe(false);
  });

  it("is true at the exact end instant", () => {
    expect(isEnded(window, T_END)).toBe(true);
  });
});
