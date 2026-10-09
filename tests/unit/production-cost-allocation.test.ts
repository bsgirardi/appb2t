import { expect, it } from "vitest";
import { StockDecimal as D } from "@/domain/stock/quantities";
import {
  apportionProductionCost,
  calculateProductionCost,
} from "@/domain/production/costs";
import { allocateCostComponents } from "@/domain/production/cost-allocation";
it("conserves tiny production costs without a negative last destination", () => {
  const values = apportionProductionCost("0.000002", [1, 1, 1, 1]);
  expect(values.every((v) => new D(v!).gte(0))).toBe(true);
  expect(values.reduce((s, v) => s.plus(v!), new D(0)).toFixed()).toBe(
    "0.000002",
  );
  const rows = allocateCostComponents(
    "0.000002",
    { depreciation: "0.000001", material: "0.000001" },
    [0, 1, 2, 3].map((position) => ({
      key: String(position),
      position,
      weight: "1",
    })),
  );
  for (const row of rows) {
    expect(Object.values(row.components).every((v) => new D(v).gte(0))).toBe(
      true,
    );
    expect(
      Object.values(row.components)
        .reduce((s, v) => s.plus(v), new D(0))
        .eq(row.total),
    ).toBe(true);
  }
});
it("reconciles independently rounded production components to the authoritative total", () => {
  const result = calculateProductionCost({
    goodUnits: 1,
    closed: true,
    materialComplete: true,
    timeComplete: true,
    materials: [],
    stages: [
      {
        machineMinutes: "2",
        watts: "100",
        energyRate: "0.8",
        maintenancePerHour: "0.5",
        acquisitionCost: "2000",
        amortizationMonths: "24",
        daysPerMonth: "22",
        hoursPerDay: "8",
        setupMinutes: "0",
        finishingMinutes: "0",
        laborPerHour: "0",
      },
    ],
  });
  const [row] = allocateCostComponents(result.total!, result.components, [
    { key: "one", position: 0, weight: "1" },
  ]);
  expect(row.total).toBe("0.035116");
  expect(row.components.depreciation).toBe(result.components.depreciation);
  expect(
    Object.values(row.components)
      .reduce((s, v) => s.plus(v), new D(0))
      .eq(row.total),
  ).toBe(true);
});
it("keeps depreciation bounded when total is below individually rounded components", () => {
  const [row] = allocateCostComponents(
    "0",
    { depreciation: "0.000001", material: "0" },
    [{ key: "one", position: 0, weight: "1" }],
  );
  expect(row.components.depreciation).toBe("0");
});
