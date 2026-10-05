import { expect, it } from "vitest";
import { calculateScenarios } from "@/domain/pricing/scenarios";
import { lotFixture as f } from "../fixtures/pricing";
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
