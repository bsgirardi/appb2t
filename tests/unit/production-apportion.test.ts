import { expect, it } from "vitest";
import { apportionProductionCost } from "@/domain/production/costs";
it("preserves exact total with deterministic rounding residue and unknown coverage", () => {
  expect(apportionProductionCost("1", [1, 1, 1])).toEqual([
    "0.333333",
    "0.333333",
    "0.333334",
  ]);
  expect(apportionProductionCost(null, [1, 2])).toEqual([null, null]);
  expect(apportionProductionCost("10", [0, 2])).toEqual(["0", "10"]);
  expect(apportionProductionCost("10", [])).toEqual([]);
});
