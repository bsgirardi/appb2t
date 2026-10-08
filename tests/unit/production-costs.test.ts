import { expect, it } from "vitest";
import { calculateProductionCost } from "@/domain/production/costs";
const input = {
  goodUnits: 3,
  closed: true,
  materialComplete: true,
  timeComplete: true,
  materials: [{ value: "30", provisional: false }],
  stages: [
    {
      machineMinutes: "60",
      setupMinutes: "30",
      finishingMinutes: "0",
      watts: "100",
      energyRate: "1",
      maintenancePerHour: "2",
      laborPerHour: "10",
      acquisitionCost: "1200",
      amortizationMonths: "12",
      daysPerMonth: "20",
      hoursPerDay: "5",
    },
  ],
};
it("uses actual material and time without applying estimated failure percent", () => {
  expect(calculateProductionCost(input)).toMatchObject({
    total: "38.1",
    unitCost: "12.7",
    provisional: false,
  });
});
it("does not report missing cost as zero or divide all-failed production by zero", () => {
  expect(
    calculateProductionCost({
      ...input,
      stages: [{ ...input.stages[0], energyRate: null }],
    }),
  ).toMatchObject({ total: null, unitCost: null, provisional: true });
  expect(calculateProductionCost({ ...input, goodUnits: 0 })).toMatchObject({
    lossCost: "38.1",
    unitCost: null,
  });
});
it("keeps known values provisional until measurements and valuation are complete", () => {
  expect(calculateProductionCost({ ...input, closed: false })).toMatchObject({
    total: "38.1",
    provisional: true,
  });
  expect(
    calculateProductionCost({
      ...input,
      materials: [{ value: null, provisional: true }],
    }),
  ).toMatchObject({
    total: null,
    unitCost: null,
    knownTotal: "8.1",
    provisional: true,
  });
});
