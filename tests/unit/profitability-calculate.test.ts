import { expect, it } from "vitest";
import { calculateSale } from "@/domain/profitability/calculate";
import { completeInput, profitabilityInput } from "../fixtures/profitability";
it("uses negotiated revenue and separates contribution from depreciation", () => {
  const r = calculateSale(completeInput());
  expect(r.actual.contribution.value).toBe("90");
  expect(r.actual.margin.value).toBe("45");
  expect(r.actual.afterDepreciation.value).toBe("85");
  expect(r.expected.contribution.value).toBe("90");
});
it("never publishes partial production as full contribution", () => {
  const i = completeInput();
  i.lines[0].actual.delivered = 0;
  expect(calculateSale(i).actual.contribution.value).toBeNull();
});
it("explicit zero fees does not resolve unknown freight", () => {
  const i = completeInput();
  i.administrative!.fees = { state: "DECLARED", value: "0" };
  i.administrative!.shipping = { state: "UNKNOWN" };
  expect(calculateSale(i).actual.contribution.value).toBeNull();
  i.administrative!.shipping = { state: "DECLARED", value: "0" };
  expect(calculateSale(i).actual.contribution.value).toBe("120");
});
it("keeps unknown history unavailable and negative results explicit", () => {
  expect(
    calculateSale(profitabilityInput()).actual.contribution.value,
  ).toBeNull();
  const i = completeInput();
  i.administrative!.fees = { state: "DECLARED", value: "210" };
  expect(calculateSale(i).actual.contribution.value).toBe("-110");
});
it("allocates discounts and freight, including fully discounted lines", () => {
  const i = completeInput();
  i.totals = { subtotal: "150", discount: "30", shipping: "12", total: "132" };
  i.lines = [
    { ...i.lines[0], grossRevenue: "100" },
    { ...i.lines[0], key: "second", position: 1, grossRevenue: "50" },
  ];
  expect(calculateSale(i).lines.map((l) => l.revenue)).toEqual(["88", "44"]);
  i.totals = { subtotal: "150", discount: "150", shipping: "12", total: "12" };
  expect(calculateSale(i).lines.map((l) => l.revenue)).toEqual(["6", "6"]);
});
it("retains total-cost result when opening stock lacks decomposition", () => {
  const i = completeInput();
  i.lines[0].actual.components = null;
  const r = calculateSale(i);
  expect(r.actual.contribution.value).toBeNull();
  expect(r.actual.afterDepreciation.value).toBe("85");
  expect(r.compositionMissing).toBe(true);
});
it("invalidates extra review when production facts change", () => {
  const i = completeInput();
  i.lines[0].sourceHash = "changed";
  expect(calculateSale(i).actual.contribution.value).toBeNull();
});
it("does not calculate a margin with zero revenue", () => {
  const i = completeInput();
  i.totals = { subtotal: "200", discount: "200", shipping: "0", total: "0" };
  expect(calculateSale(i).actual.margin.value).toBeNull();
});
