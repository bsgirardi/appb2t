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
it("charges fixed maintenance once across machine reports of the same line", () => {
  const stage = {
    ...input.stages[0],
    maintenanceMode: "FIXED_PER_LOT" as const,
    maintenanceFixedPerLot: "15.5",
  };
  expect(
    calculateProductionCost({
      ...input,
      stages: [stage, { ...stage, machineMinutes: "120" }],
    }).components.maintenance,
  ).toBe("15.5");
});
it("charges fixed maintenance on manual batches without machine hours", () => {
  expect(
    calculateProductionCost({
      ...input,
      stages: [
        {
          ...input.stages[0],
          machineMinutes: "0",
          maintenanceMode: "FIXED_PER_LOT",
          maintenanceFixedPerLot: "15.5",
        },
      ],
    }).components.maintenance,
  ).toBe("15.5");
});
it("ignores reversed reports when selecting the fixed batch premise", () => {
  const fixed = {
    ...input.stages[0],
    maintenanceMode: "FIXED_PER_LOT" as const,
    maintenanceFixedPerLot: "15.5",
    maintenanceLotActive: false,
  };
  expect(
    calculateProductionCost({
      ...input,
      stages: [fixed, { ...fixed, machineMinutes: "-60" }],
    }).components.maintenance,
  ).toBe("0");
  expect(
    calculateProductionCost({
      ...input,
      stages: [
        fixed,
        { ...fixed, machineMinutes: "-60" },
        { ...fixed, maintenanceLotActive: true, maintenanceFixedPerLot: "20" },
      ],
    }).components.maintenance,
  ).toBe("20");
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
