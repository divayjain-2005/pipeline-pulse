/**
 * pipeline.ts — derived helper and error-message contract.
 *
 * These helpers are the shared seam the pages and any new dashboard panel build
 * on: stage openness, risk ordering, score clamping, and the mapping from a
 * backend `#err` result to a human-readable message. The tests pin the current
 * observable behavior so a new panel or edit field cannot silently change it.
 */

import {
  DealStage,
  RiskBucket,
  byRiskDesc,
  clampRiskScore,
  isOpenStage,
  pipelineErrorMessage,
  resultErrorMessage,
  riskLabel,
  stageLabel,
} from "@/lib/pipeline";
import { describe, expect, it } from "vitest";

describe("isOpenStage", () => {
  it("treats the four funnel stages as open", () => {
    expect(isOpenStage(DealStage.prospecting)).toBe(true);
    expect(isOpenStage(DealStage.qualification)).toBe(true);
    expect(isOpenStage(DealStage.proposal)).toBe(true);
    expect(isOpenStage(DealStage.negotiation)).toBe(true);
  });

  it("treats both terminal outcomes as closed", () => {
    expect(isOpenStage(DealStage.closedWon)).toBe(false);
    expect(isOpenStage(DealStage.closedLost)).toBe(false);
  });
});

describe("byRiskDesc", () => {
  it("orders by descending score", () => {
    const rows = [
      { score: 20, amount: 100n },
      { score: 82, amount: 50n },
      { score: 55, amount: 75n },
    ];
    const sorted = [...rows].sort(byRiskDesc);
    expect(sorted.map((row) => row.score)).toEqual([82, 55, 20]);
  });

  it("breaks a score tie by descending amount", () => {
    const rows = [
      { score: 50, amount: 100n },
      { score: 50, amount: 250n },
    ];
    const sorted = [...rows].sort(byRiskDesc);
    expect(sorted.map((row) => row.amount)).toEqual([250n, 100n]);
  });
});

describe("clampRiskScore", () => {
  it("clamps a score into the 0..100 range", () => {
    expect(clampRiskScore(-5)).toBe(0);
    expect(clampRiskScore(150)).toBe(100);
    expect(clampRiskScore(72)).toBe(72);
  });

  it("treats a missing or non-finite score as zero", () => {
    expect(clampRiskScore(null)).toBe(0);
    expect(clampRiskScore(undefined)).toBe(0);
    expect(clampRiskScore(Number.NaN)).toBe(0);
  });
});

describe("label helpers", () => {
  it("renders a stage label and falls back for a missing stage", () => {
    expect(stageLabel(DealStage.negotiation)).toBe("Negotiation");
    expect(stageLabel(null)).toBe("—");
  });

  it("renders a risk label and falls back for a missing bucket", () => {
    expect(riskLabel(RiskBucket.high)).toBe("High risk");
    expect(riskLabel(null)).toBe("—");
  });
});

describe("resultErrorMessage", () => {
  it("returns null for an ok result", () => {
    expect(resultErrorMessage({ __kind__: "ok", ok: null })).toBeNull();
  });

  it("returns null for a missing result", () => {
    expect(resultErrorMessage(null)).toBeNull();
    expect(resultErrorMessage(undefined)).toBeNull();
  });

  it("maps a notAuthorized error to a permission message", () => {
    expect(
      resultErrorMessage({
        __kind__: "err",
        err: { __kind__: "notAuthorized" },
      }),
    ).toBe("You do not have permission to perform this action.");
  });

  it("maps an invalidInput error to its own message", () => {
    expect(
      resultErrorMessage({
        __kind__: "err",
        err: {
          __kind__: "invalidInput",
          invalidInput: "Deal name is required",
        },
      }),
    ).toBe("Deal name is required");
  });

  it("maps a notFound error to a refresh message", () => {
    expect(
      resultErrorMessage({
        __kind__: "err",
        err: { __kind__: "notFound", notFound: 7n },
      }),
    ).toBe("That deal no longer exists. Refresh to see the current pipeline.");
  });
});

describe("pipelineErrorMessage", () => {
  it("falls back to a generic message for an unknown variant", () => {
    expect(pipelineErrorMessage({ __kind__: "somethingElse" })).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("falls back when invalidInput carries no text", () => {
    expect(pipelineErrorMessage({ __kind__: "invalidInput" })).toBe(
      "The submitted values are not valid.",
    );
  });
});
