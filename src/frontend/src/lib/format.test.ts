/**
 * format.ts — shared formatter contract.
 *
 * These formatters are the display seam every dashboard panel renders through,
 * including the percentage and currency formatting a backtest comparison will
 * need. The tests pin the observable output for the value shapes the backend
 * actually sends: whole-unit bigint currency, 0..1 ratio floats, and epoch-ms
 * bigint timestamps.
 */

import {
  daysBetween,
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatNumber,
  formatPercent,
  formatPercentDelta,
  humanizeEnum,
  initials,
  toDate,
} from "@/lib/format";
import { describe, expect, it } from "vitest";

describe("formatCurrency", () => {
  it("renders whole currency units with thousands separators", () => {
    expect(formatCurrency(1_500_000n)).toBe("$1,500,000");
    expect(formatCurrency(0n)).toBe("$0");
  });

  it("renders an em dash for a missing value", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
  });
});

describe("formatCurrencyCompact", () => {
  it("renders a compact currency label for dense cells", () => {
    expect(formatCurrencyCompact(430_000n)).toBe("$430K");
    expect(formatCurrencyCompact(1_500_000n)).toBe("$1.5M");
  });
});

describe("formatNumber", () => {
  it("renders a plain integer with separators", () => {
    expect(formatNumber(120n)).toBe("120");
    expect(formatNumber(1_234n)).toBe("1,234");
  });
});

describe("formatPercent", () => {
  it("renders a 0..1 ratio as a whole percentage", () => {
    expect(formatPercent(0.12)).toBe("12%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("honours the requested fractional precision", () => {
    expect(formatPercent(0.1234, 1)).toBe("12.3%");
  });

  it("renders an em dash for a missing or non-finite value", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
    expect(formatPercent(Number.NaN)).toBe("—");
  });
});

describe("formatPercentDelta", () => {
  it("signs a positive and a negative delta", () => {
    expect(formatPercentDelta(0.12)).toBe("+12%");
    // U+2212 MINUS SIGN, not a hyphen.
    expect(formatPercentDelta(-0.04)).toBe("−4%");
  });

  it("leaves zero unsigned", () => {
    expect(formatPercentDelta(0)).toBe("0%");
  });
});

describe("formatDate", () => {
  it("renders epoch milliseconds as a readable date", () => {
    // 2026-03-14T12:00:00Z; the formatter is timezone-dependent, so assert the
    // stable month/day/year components rather than an exact string.
    const value = BigInt(Date.UTC(2026, 2, 14, 12, 0, 0));
    expect(formatDate(value)).toMatch(/Mar 1[34], 2026/);
  });

  it("renders an em dash for a missing value", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("toDate", () => {
  it("converts epoch milliseconds to a Date", () => {
    const date = toDate(0n);
    expect(date?.getTime()).toBe(0);
  });

  it("returns null for a missing or invalid value", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
  });
});

describe("daysBetween", () => {
  it("counts whole days between two epoch-ms values", () => {
    const from = BigInt(Date.UTC(2026, 0, 1));
    const to = BigInt(Date.UTC(2026, 0, 11));
    expect(daysBetween(from, to)).toBe(10);
  });

  it("returns null when either endpoint is missing", () => {
    expect(daysBetween(null, 0n)).toBeNull();
    expect(daysBetween(0n, undefined)).toBeNull();
  });
});

describe("initials", () => {
  it("takes the first two word initials", () => {
    expect(initials("Acme Corp")).toBe("AC");
    expect(initials("Northwind Logistics")).toBe("NL");
  });

  it("renders an em dash for an empty value", () => {
    expect(initials("")).toBe("—");
    expect(initials(null)).toBe("—");
  });
});

describe("humanizeEnum", () => {
  it("title-cases a camelCase backend enum value", () => {
    expect(humanizeEnum("economicBuyer")).toBe("Economic Buyer");
    expect(humanizeEnum("closedWon")).toBe("Closed Won");
  });
});
