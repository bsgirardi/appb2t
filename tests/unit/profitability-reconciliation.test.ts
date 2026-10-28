import { expect, it } from "vitest";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { calculateSale } from "@/domain/profitability/calculate";
import { reconcileSale } from "@/domain/profitability/reconciliation";
import { completeInput, profitabilityInput } from "../fixtures/profitability";

it("bridges memory to negotiated to actual without subtracting depreciation", () => {
  const dto = calculateSale(completeInput());
  const before = JSON.stringify(dto);
  const r = reconcileSale(dto);
  expect(r.reference.contribution.value).toBe("185");
  expect(new D(r.reference.margin.value!).toFixed(4)).toBe("61.6667");
  expect(r.commercialEffects.map((e) => e.amount.value)).toEqual([
    "-100",
    "0",
    "0",
    "5",
  ]);
  expect(r.negotiated.contribution.value).toBe("90");
  expect(r.actual.contribution.value).toBe("90");
  expect(r.actual.margin.value).toBe("45");
  expect(r.actualEffects.map((e) => e.amount.value)).toEqual(["0", "0", "0"]);
  expect(r.commercialClosed).toBe(true);
  expect(r.actualClosed).toBe(true);
  expect(r.lines[0].referenceSnapshotId).toBe("snapshot");
  expect(r.lines[0].commercialEffects[0].source).toContain("snapshot");
  expect(dto.actual.afterDepreciation.value).toBe("85");
  expect(JSON.stringify(dto)).toBe(before);
});

it("reuses discount and charged shipping allocation across multiple lines", () => {
  const i = completeInput();
  i.totals = { subtotal: "300", discount: "30", shipping: "12", total: "282" };
  i.lines = [
    i.lines[0],
    {
      ...structuredClone(i.lines[0]),
      key: "second",
      position: 1,
      grossRevenue: "100",
      sourceHash: "second-facts",
    },
  ];
  i.administrative!.lineReviews.push({
    lineKey: "second",
    sourceHash: "second-facts",
    complete: true,
  });
  const r = reconcileSale(calculateSale(i));
  expect(r.commercialEffects.map((e) => e.amount.value)).toEqual([
    "-300",
    "-30",
    "12",
    "16.5",
  ]);
  expect(r.reference.contribution.value).toBe("390");
  expect(r.negotiated.contribution.value).toBe("88.5");
  expect(r.actual.contribution.value).toBe("92");
  expect(r.actualEffects.map((e) => e.amount.value)).toEqual(["0", "3.5", "0"]);
  expect(r.commercialClosed && r.actualClosed).toBe(true);
  expect(r.lines.every((l) => l.commercialClosed && l.actualClosed)).toBe(true);
});

it("reconciles rounded fractional fees exactly", () => {
  const i = completeInput();
  i.lines[0].expected!.suggestedRevenue = "1.234567";
  i.lines[0].expected!.feePercent = "3.333333";
  const r = reconcileSale(calculateSale(i));
  expect(r.commercialEffects[3].amount.value).toBe("-6.625514");
  expect(r.commercialClosed).toBe(true);
});

it("keeps available effects when memory or expected shipping is missing", () => {
  const i = completeInput();
  i.administrative!.expectedShipping = { state: "UNKNOWN" };
  const r = reconcileSale(calculateSale(i));
  expect(r.reference.contribution.value).toBeNull();
  expect(r.reference.contribution.reasons).toContain(
    "Frete previsto não informado",
  );
  expect(r.commercialEffects[0].amount.value).toBe("-100");
  expect(r.actualEffects[0].amount.value).toBe("0");
  expect(r.commercialClosed || r.actualClosed).toBe(false);
  const absent = reconcileSale(calculateSale(profitabilityInput()));
  expect(absent.reference.revenue).toBeNull();
  expect(absent.commercialEffects[0].amount.value).toBeNull();
  expect(absent.commercialEffects[1].amount.value).toBe("0");
});

it.each([
  "delivery",
  "review",
  "provisional",
  "composition",
  "fees",
  "shipping",
])("does not close actual bridge with incomplete %s", (kind) => {
  const i = completeInput();
  if (kind === "delivery") i.lines[0].actual.delivered = 0;
  if (kind === "review") i.lines[0].sourceHash = "changed";
  if (kind === "provisional") i.lines[0].actual.provisional = true;
  if (kind === "composition") i.lines[0].actual.components = null;
  if (kind === "fees") i.administrative!.fees = { state: "UNKNOWN" };
  if (kind === "shipping") i.administrative!.shipping = { state: "UNKNOWN" };
  const r = reconcileSale(calculateSale(i));
  expect(r.commercialClosed).toBe(true);
  expect(r.actualClosed).toBe(false);
  expect(r.actual.contribution.value).toBeNull();
});

it("distinguishes declared zero from unknown and keeps negative/zero-revenue results", () => {
  const i = completeInput();
  i.totals = { subtotal: "200", discount: "200", shipping: "0", total: "0" };
  i.administrative!.fees = { state: "DECLARED", value: "0" };
  i.administrative!.shipping = { state: "DECLARED", value: "0" };
  const r = reconcileSale(calculateSale(i));
  expect(r.actual.contribution.value).toBe("-80");
  expect(r.actual.margin.value).toBeNull();
  expect(r.commercialEffects.map((e) => e.amount.value)).toEqual([
    "-100",
    "-200",
    "0",
    "15",
  ]);
  expect(r.actualEffects.map((e) => e.amount.value)).toEqual(["0", "0", "20"]);
  expect(r.commercialClosed && r.actualClosed).toBe(true);
  i.lines[0].expected!.suggestedRevenue = "0";
  const zero = reconcileSale(calculateSale(i));
  expect(zero.reference.contribution.value).toBe("-100");
  expect(zero.reference.margin.value).toBeNull();
  expect(zero.commercialClosed).toBe(true);
});

it("uses allocated costs once, regardless of LOSS, extras, reserves or receipts", () => {
  const i = completeInput();
  i.lines[0].actual.sources = [
    { id: "loss", label: "Perda vinculada", kind: "LOSS", value: "85" },
  ];
  i.lines[0].actual.reservedTotal = "500";
  i.received = "900";
  i.administrative!.extras = [
    {
      id: "extra",
      lineKey: "line",
      reference: "ref",
      description: "Complemento",
      value: "10",
      effectiveDate: "2026-10-27",
      notInProduction: true,
    },
  ];
  const r = reconcileSale(calculateSale(i));
  expect(r.actual.contribution.value).toBe("80");
  expect(r.actualEffects.map((e) => e.amount.value)).toEqual(["-10", "0", "0"]);
  expect(r.actualClosed).toBe(true);
});

it("does not report a closed bridge for inconsistent aggregate destinations", () => {
  const dto = calculateSale(completeInput());
  dto.actual.contribution.value = "999";
  expect(reconcileSale(dto).actualClosed).toBe(false);
});
