import { expect, it } from "vitest";
import { reconcileProductiveLine } from "@/domain/profitability/productive-reconciliation";
import { calculateSale } from "@/domain/profitability/calculate";
import { reconcileSale } from "@/domain/profitability/reconciliation";
import { productiveInput } from "../fixtures/productive-reconciliation";
import type { SaleProfitabilityInput } from "@/domain/profitability/types";

const explain = (input: SaleProfitabilityInput) => {
  const sale = calculateSale(input);
  return reconcileProductiveLine(sale.lines[0], sale.administrative);
};
it("reconciles the approved example without depreciation or duplicate complements", () => {
  const input = productiveInput(), before = structuredClone(input), result = explain(input);
  expect(result.rows.map(r => [r.key, r.effect.value])).toEqual([
    ["material", "-10"], ["labor", "-4"], ["energy", "-1"], ["maintenance", "-1"], ["extras", "0"], ["failure", "6"],
  ]);
  expect(result.aggregateEffect.value).toBe("-10");
  expect(result.unexplained.value).toBe("0");
  expect(result.closed).toBe(true);
  expect(reconcileSale(calculateSale(input)).actualEffects[0].amount.value).toBe("-10");
  expect(input).toEqual(before);
});
it("keeps losses and reservations informational and confirmations do not debit costs", () => {
  const input = productiveInput();
  input.lines[0].actual.sources.push({ id: "loss", kind: "LOSS", label: "Perda vinculada", value: "30" });
  input.lines[0].actual.reservedTotal = "999";
  input.administrative!.confirmations = [
    { lineKey: "line", extraKey: "one", kind: "U3_SOURCE", sourceId: "delivery", value: "20" },
    { lineKey: "line", extraKey: "two", kind: "NOT_OCCURRED", reason: "Não ocorreu" },
    { lineKey: "line", extraKey: "three", kind: "COMPLEMENT", complementId: "complement" },
  ];
  const result = explain(input);
  expect(result.aggregateEffect.value).toBe("-10");
  expect(result.includedLosses).toEqual([{ id: "loss", kind: "LOSS", label: "Perda vinculada", value: "30" }]);
  expect(result.rows.find(r => r.key === "extras")?.actual.value).toBe("10");
});
it.each(["memory", "expectedComponents", "actualComponents", "missingKey", "malformed", "provisional", "delivery", "review"])("never closes incomplete composition: %s", condition => {
  const input = productiveInput(), line = input.lines[0];
  if (condition === "memory") line.expected = null;
  if (condition === "expectedComponents") delete line.expected!.components;
  if (condition === "actualComponents") line.actual.components = null;
  if (condition === "missingKey") delete line.actual.components!.labor;
  if (condition === "malformed") line.actual.components!.labor = "NaN";
  if (condition === "provisional") line.actual.provisional = true;
  if (condition === "delivery") line.actual.delivered = 0;
  if (condition === "review") input.administrative!.lineReviews = [];
  const result = explain(input);
  expect(result.closed).toBe(false);
  expect(result.unexplained.value).toBeNull();
  expect(result.rows.some(r => r.effect.value === null)).toBe(true);
});
it("retains known provisional amounts and does not depend on commercial declarations", () => {
  const input = productiveInput();
  input.administrative!.fees = input.administrative!.shipping = { state: "UNKNOWN" };
  expect(explain(input).closed).toBe(true);
  input.lines[0].actual.provisional = true;
  const row = explain(input).rows.find(r => r.key === "material")!;
  expect(row.actual).toMatchObject({ value: null, knownValue: "60", coverage: "PROVISIONAL" });
  expect(row.effect.value).toBeNull();
});
it("does not assign unexpected costs or decimal residue to failures", () => {
  const input = productiveInput();
  input.lines[0].actual.total = "100.000001";
  input.lines[0].actual.components!.other = "0.000001";
  const result = explain(input);
  expect(result.unexplained.value).toBe("-0.000001");
  expect(result.closed).toBe(false);
  expect(result.rows.find(r => r.key === "failure")?.effect.value).toBe("6");
});
it("detects composition errors even when expected and actual differences cancel", () => {
  const input = productiveInput();
  input.lines[0].expected!.variable = "97";
  input.lines[0].actual.total = "101";
  const result = explain(input);
  expect(result.unexplained.value).toBe("0");
  expect(result.closed).toBe(false);
});
it("handles zero revenue and separates multiple lines and complements", () => {
  const input = productiveInput();
  input.totals = { subtotal: "200", discount: "200", shipping: "0", total: "0" };
  expect(explain(input).aggregateEffect.value).toBe("-10");
  input.administrative!.extras.push({ ...input.administrative!.extras[0], id: "other", lineKey: "other", value: "999" });
  expect(explain(input).rows.find(r => r.key === "extras")?.actual.value).toBe("10");
});
