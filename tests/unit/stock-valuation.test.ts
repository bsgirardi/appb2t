import { expect, it } from "vitest";
import { valueLedger, type ValuationEvent } from "@/domain/stock/valuation";
const e = (
  id: string,
  sequence: number,
  kind: string,
  quantity: string,
  value: string | null,
  more: Partial<ValuationEvent> = {},
): ValuationEvent => ({
  id,
  sequence,
  kind,
  quantity,
  confirmedValue: value,
  sourceId: null,
  method: "WEIGHTED_AVERAGE",
  manualUnitCost: null,
  ...more,
});
it("values weighted issues independently of purchase price", () => {
  const r = valueLedger([
    e("a", 1, "RECEIPT", "1000", "100"),
    e("b", 2, "RECEIPT", "500", "75"),
    e("c", 3, "CONSUMPTION", "300", null),
  ]);
  expect(r.physical).toBe("1200");
  expect(r.knownValue).toBe("140");
  expect(r.allocations.find((a) => a.targetId === "c")?.value).toBe("35");
  expect(r.provisional).toBe(false);
});
it("covers a deficit with incoming value and keeps positive remainder", () => {
  const r = valueLedger([
    e("a", 1, "CONSUMPTION", "200", null),
    e("b", 2, "RECEIPT", "500", "60"),
  ]);
  expect(r.physical).toBe("300");
  expect(r.knownValue).toBe("36");
  expect(r.unitCost).toBe("0.12");
  expect(r.allocations.find((a) => a.targetId === "a")?.value).toBe("24");
  expect(r.provisional).toBe(false);
});
it("keeps partial uncovered deficits explicitly unknown", () => {
  const r = valueLedger([
    e("a", 1, "CONSUMPTION", "200", null),
    e("b", 2, "RECEIPT", "50", "6"),
  ]);
  expect(r.physical).toBe("-150");
  expect(r.provisional).toBe(true);
  expect(r.knownValue).toBe(null);
  expect(
    r.allocations.filter((a) => a.targetId === "a").map((a) => a.value),
  ).toEqual(["6", null]);
});
it("does not change manual reference on a purchase", () => {
  const r = valueLedger([
    e("a", 1, "RECEIPT", "500", "60", {
      method: "MANUAL",
      manualUnitCost: "0.1",
    }),
    e("b", 2, "CONSUMPTION", "100", null, {
      method: "MANUAL",
      manualUnitCost: "0.1",
    }),
  ]);
  expect(r.allocations.find((a) => a.targetId === "b")?.value).toBe("10");
  expect(r.knownValue).toBe("40");
  expect(r.provisional).toBe(false);
});
it("propagates missing receipt cost and resolves it on replay", () => {
  const events = [
    e("a", 1, "RECEIPT", "1000", null),
    e("b", 2, "CONSUMPTION", "300", null),
  ];
  const r = valueLedger(events);
  expect(r.knownValue).toBe(null);
  expect(r.allocations[0].provisional).toBe(true);
  const resolved = valueLedger([
    { ...events[0], confirmedValue: "100" },
    events[1],
  ]);
  expect(resolved.knownValue).toBe("70");
  expect(resolved.allocations[0].value).toBe("30");
  expect(resolved.provisional).toBe(false);
});
it("preserves original consumption cost for a return after price changes", () => {
  const r = valueLedger([
    e("a", 1, "RECEIPT", "100", "10"),
    e("b", 2, "CONSUMPTION", "100", null),
    e("c", 3, "RECEIPT", "100", "20"),
    e("d", 4, "RETURN_CONSUMPTION", "50", null, { sourceId: "b" }),
  ]);
  expect(r.physical).toBe("150");
  expect(r.knownValue).toBe("25");
});
it("rejects duplicate events and returning above original quantity", () => {
  const a = e("a", 1, "RECEIPT", "100", "10");
  expect(() => valueLedger([a, a])).toThrow();
  expect(() =>
    valueLedger([
      a,
      e("b", 2, "CONSUMPTION", "10", null),
      e("c", 3, "RETURN_CONSUMPTION", "11", null, { sourceId: "b" }),
    ]),
  ).toThrow();
});
it("keeps manual deficit consumption at its original reference after restocking", () => {
  const r = valueLedger([
    e("a", 1, "CONSUMPTION", "100", null, {
      method: "MANUAL",
      manualUnitCost: "0.1",
    }),
    e("b", 2, "RECEIPT", "200", "40", {
      method: "MANUAL",
      manualUnitCost: "0.2",
    }),
  ]);
  expect(
    r.allocations.filter((a) => a.targetId === "a").map((a) => a.value),
  ).toEqual(["10"]);
  expect(r.knownValue).toBe("20");
});
it("return before deficit coverage cancels only the returned deficit", () => {
  const r = valueLedger([
    e("a", 1, "CONSUMPTION", "100", null),
    e("b", 2, "RETURN_CONSUMPTION", "40", null, { sourceId: "a" }),
    e("c", 3, "RECEIPT", "100", "12"),
  ]);
  expect(r.physical).toBe("40");
  expect(r.knownValue).toBe("4.8");
  expect(
    r.allocations.filter((a) => a.targetId === "a").map((a) => a.value),
  ).toEqual(["7.2"]);
});
it("returns the covered portion at original cost after canceling an uncovered deficit", () => {
  const r = valueLedger([
    e("a", 1, "CONSUMPTION", "100", null),
    e("b", 2, "RECEIPT", "50", "5"),
    e("c", 3, "RETURN_CONSUMPTION", "100", null, { sourceId: "a" }),
  ]);
  expect(r.physical).toBe("50");
  expect(r.knownValue).toBe("5");
  expect(r.provisional).toBe(false);
});
it("keeps a return dependent on unconfirmed purchase cost until replay", () => {
  const input = [
    e("a", 1, "RECEIPT", "100", null),
    e("b", 2, "CONSUMPTION", "60", null),
    e("c", 3, "RETURN_CONSUMPTION", "20", null, { sourceId: "b" }),
  ];
  expect(valueLedger(input).provisional).toBe(true);
  const r = valueLedger([
    { ...input[0], confirmedValue: "12" },
    ...input.slice(1),
  ]);
  expect(r.physical).toBe("60");
  expect(r.knownValue).toBe("7.2");
  expect(r.provisional).toBe(false);
});
it("changes method only prospectively with an explicit reference", () => {
  const r = valueLedger([
    e("a", 1, "RECEIPT", "100", "10"),
    e("b", 2, "CONSUMPTION", "20", null),
    e("c", 3, "REVALUE", "0", null, {
      method: "MANUAL",
      manualUnitCost: "0.2",
    }),
    e("d", 4, "CONSUMPTION", "10", null, {
      method: "MANUAL",
      manualUnitCost: "0.2",
    }),
  ]);
  expect(r.allocations.find((a) => a.targetId === "b")?.value).toBe("2");
  expect(r.allocations.find((a) => a.targetId === "d")?.value).toBe("2");
  expect(r.physical).toBe("70");
  expect(r.knownValue).toBe("14");
});
it("rejects valuation outside persisted decimal limits", () => {
  expect(() =>
    valueLedger([
      e("a", 1, "OPENING", "999999999999999999", "1", {
        method: "MANUAL",
        manualUnitCost: "999999999999999999",
      }),
    ]),
  ).toThrow();
});
it("closes rounded cost allocations without losing the final micro-unit", () => {
  const r = valueLedger([
    e("a", 1, "RECEIPT", "3", "1"),
    e("b", 2, "CONSUMPTION", "1", null),
    e("c", 3, "CONSUMPTION", "1", null),
    e("d", 4, "CONSUMPTION", "1", null),
  ]);
  expect(r.allocations.map((a) => a.value)).toEqual([
    "0.333333",
    "0.333334",
    "0.333333",
  ]);
});
