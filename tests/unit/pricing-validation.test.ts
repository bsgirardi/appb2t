import { expect, it } from "vitest";
import { calculateV2 } from "@/domain/pricing/calculate";
import { lotFixture as f } from "../fixtures/pricing";
it.each(["-1", "NaN", "Infinity", "1e3", "", "0.0000001"])(
  "rejects malformed decimal %s",
  (value) => expect(() => calculateV2({ ...f, energyRate: value })).toThrow(),
);
it("accepts comma and explicit zero but not absent tariffs", () => {
  expect(calculateV2({ ...f, energyRate: "0,5" }).energy).toBe("0.1");
  expect(calculateV2({ ...f, energyRate: "0" }).energy).toBe("0");
  expect(() => calculateV2({ ...f, energyRate: undefined } as never)).toThrow();
});
it.each([0, 100001, 1.5])("rejects quantity %s", (quantity) =>
  expect(() => calculateV2({ ...f, quantity })).toThrow(),
);
it("rejectsMarginDenominatorZero", () =>
  expect(() =>
    calculateV2({ ...f, mode: "CONTRIBUTION", targetMarginPercent: "90" }),
  ).toThrow());
it("rejectsIncompatibleUnits", () =>
  expect(() =>
    calculateV2({ ...f, materials: [{ ...f.materials[0], unit: "ML" }] }),
  ).toThrow());
it("rejectsOverflowAfterQuantity", () =>
  expect(() =>
    calculateV2({
      ...f,
      laborPerHour: "999999999999",
      setupMinutes: "6000000",
    }),
  ).toThrow());
it("enforces positive useful consumption and machine time", () => {
  expect(() =>
    calculateV2({
      ...f,
      materials: f.materials.map((m) => ({ ...m, consumptionPerUnit: "0" })),
    }),
  ).toThrow();
  expect(() => calculateV2({ ...f, machineFixedMinutes: "0" })).toThrow();
});
it("accepts 20 materials and rejects 21", () => {
  const materials = Array.from({ length: 20 }, (_, i) => ({
    ...f.materials[0],
    ref: { id: `m${i}`, version: 1 },
  }));
  expect(() => calculateV2({ ...f, materials })).not.toThrow();
  expect(() =>
    calculateV2({
      ...f,
      materials: [
        ...materials,
        { ...materials[0], ref: { id: "extra", version: 1 } },
      ],
    }),
  ).toThrow();
});
it("accepts 30 extras and rejects 31", () => {
  const extras = Array.from({ length: 30 }, (_, i) => ({
    ...f.extras[0],
    ref: { id: `e${i}`, version: 1 },
  }));
  expect(() => calculateV2({ ...f, extras })).not.toThrow();
  expect(() => calculateV2({ ...f, extras: [...extras, extras[0]] })).toThrow();
});
it.each([
  { failurePercent: "101" },
  { machineFixedMinutes: "6000001" },
  { setupMinutes: "6000001" },
  { finishingMinutesPerUnit: "6000001" },
  { materials: [{ ...f.materials[0], consumptionPerUnit: "100001" }] },
  { channel: { ...f.channel, fees: [{ label: "Inválida", percent: "100" }] } },
  { printer: { ...f.printer, amortizationMonths: 0 } },
  { printer: { ...f.printer, daysPerMonth: 32 } },
  { printer: { ...f.printer, hoursPerDay: "0" } },
])("rejects out-of-range inputs %j", (patch) =>
  expect(() => calculateV2({ ...f, ...patch })).toThrow(),
);
