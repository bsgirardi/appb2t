import { expect, it } from "vitest";
import { calculateV2 } from "@/domain/pricing/calculate";
import { lotFixture as f } from "../fixtures/pricing";
it("prices a mixed-material batch with one preparation and commercial fee", () => {
  expect(calculateV2(f)).toMatchObject({
    material: "21",
    energy: "0.2",
    depreciation: "2",
    maintenance: "1",
    labor: "20",
    variableCost: "54.2",
    fullCost: "56.2",
    offeredUnitPrice: "12.49",
    offeredRevenue: "124.9",
    contribution: "58.21",
    afterDepreciation: "56.21",
  });
});
it("reports the actual contribution after unit rounding", () => {
  const r = calculateV2({ ...f, mode: "CONTRIBUTION" });
  expect(r).toMatchObject({
    offeredUnitPrice: "9.03",
    offeredRevenue: "90.3",
    contribution: "27.07",
    afterDepreciation: "25.07",
  });
  expect(Number(r.contributionMargin)).toBeCloseTo(29.9778516, 5);
  expect(r.warnings).toContain("ROUNDED_TARGET");
});
it("uses informed price instead of overwriting the commercial decision", () => {
  expect(calculateV2({ ...f, mode: "INFORMED" })).toMatchObject({
    offeredRevenue: "80",
    contribution: "17.8",
    afterDepreciation: "15.8",
  });
});
it("resinUsesMlWithoutDensity", () => {
  expect(
    calculateV2({
      ...f,
      technology: "RESIN",
      materials: f.materials.map((m) => ({ ...m, unit: "ML" })),
    }).material,
  ).toBe("21");
});
it("zeroPriceHasNullMargin", () => {
  expect(
    calculateV2({ ...f, mode: "INFORMED", informedUnitPrice: "0" }),
  ).toMatchObject({
    offeredRevenue: "0",
    contribution: "-54.2",
    afterDepreciation: "-56.2",
    contributionMargin: null,
    warnings: ["BELOW_FULL_COST"],
  });
});
it("failure provision excludes depreciation labor and extras", () => {
  expect(calculateV2({ ...f, failurePercent: "10" })).toMatchObject({
    failure: "2.22",
    variableCost: "56.42",
  });
});
it("zero cost and rates do not divide by zero", () => {
  const r = calculateV2({
    ...f,
    materials: f.materials.map((m) => ({ ...m, pricePerBase: "0" })),
    printer: { ...f.printer, acquisitionCost: "0" },
    energyRate: "0",
    maintenancePerHour: "0",
    laborPerHour: "0",
    extras: [],
    channel: { ...f.channel, fees: [], fixedCost: "0" },
  });
  expect(r).toMatchObject({
    fullCost: "0",
    offeredRevenue: "0",
    contributionMargin: null,
  });
});
