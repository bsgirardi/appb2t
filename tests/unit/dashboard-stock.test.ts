import { expect, it } from "vitest";
import { summarizeStock } from "@/domain/dashboard/stock";
it("subtracts releases and consumption, keeps units separate and missing inventory unknown", () => {
  const result = summarizeStock([
    {
      id: "g",
      unit: "G",
      inventoried: true,
      physical: "100",
      events: [
        { kind: "RESERVE", quantity: "80" },
        { kind: "RELEASE", quantity: "10" },
        { kind: "CONSUME", quantity: "20" },
      ],
      need: "70",
      covered: "40",
    },
    {
      id: "ml",
      unit: "ML",
      inventoried: true,
      physical: "5",
      events: [],
      need: "10",
      covered: "0",
    },
    {
      id: "u",
      unit: "UNIT",
      inventoried: false,
      physical: "0",
      events: [],
      need: "10",
      covered: "0",
    },
  ]);
  expect(result.items[0]).toMatchObject({
    reserved: "50",
    available: "50",
    uncovered: "30",
    purchase: "0",
  });
  expect(result.items[1].purchase).toBe("5");
  expect(result.items[2].available).toBeNull();
  expect(result.units.map((x) => x.unit)).toEqual(["G", "ML", "UNIT"]);
  expect(result.units[2].physical).toBeNull();
});
