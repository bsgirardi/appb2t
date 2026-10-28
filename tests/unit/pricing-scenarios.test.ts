import { expect, it } from "vitest";
import { calculateScenarios } from "@/domain/pricing/scenarios";
import { lotFixture as f } from "../fixtures/pricing";
import { calculateV2 } from "@/domain/pricing/calculate";

it("normalizes decimal commas consistently with the V2 engine", () => {
  const [row] = calculateScenarios(
    {
      ...f,
      machineFixedMinutes: "120,5",
      machineMinutesPerUnit: "1,5",
      materials: f.materials.map((m) => ({ ...m, consumptionPerUnit: "10,5" })),
    },
    [10],
  );
  expect(row.machineMinutes).toBe("135.5");
  expect(row.materials[0].consumption).toBe("115");
});

it("shows machine time, contribution per machine hour and material consumption", () => {
  expect(calculateScenarios(f, [10])[0]).toMatchObject({
    machineMinutes: "120",
    contributionPerMachineHour: "29.105",
    materials: [
      { name: "A", unit: "G", consumption: "110" },
      { name: "B", unit: "G", consumption: "50" },
    ],
  });
});
it("includes fixed machine time and fixed waste only once per batch", () => {
  const [row] = calculateScenarios({ ...f, machineMinutesPerUnit: "6" }, [20]);
  expect(row.machineMinutes).toBe("240");
  expect(row.materials[0].consumption).toBe("210");
});
it("keeps resin consumption in milliliters", () => {
  const [row] = calculateScenarios(
    {
      ...f,
      technology: "RESIN",
      materials: f.materials.map((m) => ({ ...m, unit: "ML" })),
    },
    [10],
  );
  expect(row.materials).toEqual([
    { name: "A", unit: "ML", consumption: "110" },
    { name: "B", unit: "ML", consumption: "50" },
  ]);
});
it.each(["MARKUP", "CONTRIBUTION", "INFORMED"] as const)(
  "preserves the V2 result in %s mode",
  (mode) => {
    const input = { ...f, mode };
    for (const row of calculateScenarios(input, [1, 10, 20])) {
      expect(row.result).toEqual(
        calculateV2({ ...input, quantity: row.quantity }),
      );
    }
  },
);
it("preserves negative contribution and undefined margin for zero revenue", () => {
  const [row] = calculateScenarios(
    { ...f, mode: "INFORMED", informedUnitPrice: "0" },
    [10],
  );
  expect(row.result.contributionMargin).toBeNull();
  expect(row.contributionPerMachineHour).toBe("-27.1");
  expect(row.result.afterDepreciation).toBe("-56.2");
});
it("retains V2 limits for material consumption and machine time", () => {
  expect(() => calculateScenarios(f, [100000])).toThrow();
  expect(() =>
    calculateScenarios({ ...f, machineMinutesPerUnit: "6000000" }, [2]),
  ).toThrow();
});
it("keepsFixedWasteOnce", () =>
  expect(calculateScenarios(f, [20])[0]).toMatchObject({
    quantity: 20,
    result: {
      material: "41",
      labor: "30",
      variableCost: "94.2",
      depreciation: "2",
    },
  }));
it("doesNotMutateScenarioInput", () => {
  const before = structuredClone(f);
  calculateScenarios(f, [1, 20]);
  expect(f).toEqual(before);
});
it("accepts 10 scenarios but rejects 11", () => {
  expect(
    calculateScenarios(
      f,
      Array.from({ length: 10 }, (_, i) => i + 1),
    ),
  ).toHaveLength(10);
  expect(() =>
    calculateScenarios(
      f,
      Array.from({ length: 11 }, (_, i) => i + 1),
    ),
  ).toThrow();
});
it.each([0, 100001, 1.5])("validates scenario quantity %s", (q) =>
  expect(() => calculateScenarios(f, [q])).toThrow(),
);
