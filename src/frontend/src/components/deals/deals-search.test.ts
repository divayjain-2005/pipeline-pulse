/**
 * deals-search.ts — URL parsing and row sorting contract.
 *
 * The rep-estimate column is a new sort key, and unestimated deals have no
 * value to compare. These tests pin the parser's total behavior and the
 * observed ordering rule: an unestimated deal is treated as the sentinel -1,
 * so it sorts first ascending and last descending, and ties fall back to
 * descending risk score.
 */

import type { DealRow } from "@/components/deals/DealsTable";
import {
  type DealsSearch,
  parseAmount,
  parseBucket,
  parseSortDir,
  parseSortKey,
  parseStage,
  sortRows,
} from "@/components/deals/deals-search";
import { DealStage, RiskBucket } from "@/lib/pipeline";
import { makeDeal, makeRisk } from "@/test/fixtures";
import { describe, expect, it } from "vitest";

function row(
  id: bigint,
  repEstimate: bigint | undefined,
  score: number,
): DealRow {
  return {
    deal: makeDeal({ id, repEstimate }),
    risk: makeRisk({ dealId: id, score, bucket: RiskBucket.medium }),
  };
}

describe("parseSortKey", () => {
  it("accepts the rep-estimate sort key", () => {
    expect(parseSortKey("repEstimate")).toBe("repEstimate");
  });

  it("falls back to risk for an unknown key", () => {
    expect(parseSortKey("nonsense")).toBe("risk");
    expect(parseSortKey(undefined)).toBe("risk");
  });
});

describe("parseSortDir", () => {
  it("accepts asc and defaults everything else to desc", () => {
    expect(parseSortDir("asc")).toBe("asc");
    expect(parseSortDir("desc")).toBe("desc");
    expect(parseSortDir("sideways")).toBe("desc");
  });
});

describe("parseStage / parseBucket / parseAmount", () => {
  it("accepts known enum values and rejects unknown ones", () => {
    expect(parseStage(DealStage.negotiation)).toBe(DealStage.negotiation);
    expect(parseStage("not-a-stage")).toBeUndefined();
    expect(parseBucket(RiskBucket.high)).toBe(RiskBucket.high);
    expect(parseBucket("not-a-bucket")).toBeUndefined();
  });

  it("accepts a non-negative numeric amount and rejects the rest", () => {
    expect(parseAmount("100000")).toBe("100000");
    expect(parseAmount("0")).toBe("0");
    expect(parseAmount("-1")).toBeUndefined();
    expect(parseAmount("abc")).toBeUndefined();
    expect(parseAmount("")).toBeUndefined();
  });
});

describe("sortRows", () => {
  it("orders by rep estimate ascending, unestimated first", () => {
    const rows = [
      row(1n, 240_000n, 50),
      row(2n, 150_000n, 40),
      row(3n, undefined, 30),
    ];
    const sorted = sortRows(rows, "repEstimate", "asc");
    // Unestimated is the -1 sentinel, so it leads an ascending sort.
    expect(sorted.map((entry) => entry.deal.id)).toEqual([3n, 2n, 1n]);
  });

  it("orders by rep estimate descending, unestimated last", () => {
    const rows = [
      row(1n, 240_000n, 50),
      row(2n, 150_000n, 40),
      row(3n, undefined, 30),
    ];
    const sorted = sortRows(rows, "repEstimate", "desc");
    expect(sorted.map((entry) => entry.deal.id)).toEqual([1n, 2n, 3n]);
  });

  it("breaks a rep-estimate tie on descending risk score", () => {
    const rows = [row(1n, 100_000n, 20), row(2n, 100_000n, 80)];
    const sorted = sortRows(rows, "repEstimate", "asc");
    expect(sorted.map((entry) => entry.deal.id)).toEqual([2n, 1n]);
  });

  it("does not mutate the input array", () => {
    const rows = [row(1n, 240_000n, 50), row(2n, 150_000n, 40)];
    const before = rows.map((entry) => entry.deal.id);
    sortRows(rows, "repEstimate", "asc");
    expect(rows.map((entry) => entry.deal.id)).toEqual(before);
  });
});

describe("DealsSearch shape", () => {
  it("carries the rep-estimate sort key", () => {
    const search: DealsSearch = { sort: "repEstimate", dir: "asc" };
    expect(search.sort).toBe("repEstimate");
  });
});
