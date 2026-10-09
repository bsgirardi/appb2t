import { expect, it } from "vitest";
import { aggregateSales } from "@/domain/profitability/aggregate";
import { calculateSale } from "@/domain/profitability/calculate";
import { completeInput, profitabilityInput } from "../fixtures/profitability";
it("uses covered revenue and the intersection for comparisons", () => {
  const r = aggregateSales([
    calculateSale(completeInput()),
    calculateSale({ ...profitabilityInput(), saleId: "unknown" }),
  ]);
  expect(r.summary.revenue).toBe("400");
  expect(r.summary.actual).toEqual({
    value: "90",
    coveredRevenue: "200",
    count: 1,
    margin: "45",
  });
  expect(r.summary.contributionChange.value).toBe("0");
  expect(r.summary.contributionChange.count).toBe(1);
  expect(r.channels[0].id).toBe("__none__");
});
it("does not consolidate canceled or commercially disputed orders", () => {
  const i = completeInput();
  i.status = "CANCELADA";
  expect(aggregateSales([calculateSale(i)]).summary.actual.value).toBeNull();
});
