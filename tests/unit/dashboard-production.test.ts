import { expect, it } from "vitest";
import {
  summarizeProduction,
  deliveryPerformance,
  machineCapacity,
} from "@/domain/dashboard/production";
it("applies signed corrections and counts reprints only once", () => {
  expect(
    summarizeProduction([
      {
        id: "a",
        kind: "REPORT",
        sourceId: null,
        goodUnits: 8,
        failedUnits: 2,
        reprintOf: null,
      },
      {
        id: "c",
        kind: "CORRECTION",
        sourceId: "a",
        goodUnits: -1,
        failedUnits: -1,
        reprintOf: null,
      },
      {
        id: "b",
        kind: "REPORT",
        sourceId: null,
        goodUnits: 1,
        failedUnits: 0,
        reprintOf: "a",
      },
    ]),
  ).toMatchObject({ good: 8, failed: 1, reprints: 1, yield: "88.89" });
});
it("counts complete delivery from signed quantities, not partial delivery dates", () => {
  const sale = {
    due: "2026-10-10",
    items: [{ key: "a", units: 10 }],
    deliveries: [
      { date: "2026-10-09", key: "a", units: 5 },
      { date: "2026-10-11", key: "a", units: 5 },
    ],
  };
  expect(deliveryPerformance([sale], "2026-10-01", "2026-10-26")).toEqual({
    count: 1,
    onTime: 0,
    rate: "0.00",
    withoutDate: 0,
  });
  expect(
    deliveryPerformance(
      [{ ...sale, deliveries: sale.deliveries.slice(0, 1) }],
      "2026-10-01",
      "2026-10-26",
    ).count,
  ).toBe(0);
  expect(
    deliveryPerformance([{ ...sale, due: null }], "2026-10-01", "2026-10-26")
      .withoutDate,
  ).toBe(1);
});
it("counts a shared lot once and marks unknown duration instead of zero", () => {
  expect(
    machineCapacity(
      [
        { id: "b", minutes: "120" },
        { id: "b", minutes: "120" },
      ],
      "480",
    ),
  ).toEqual({ committed: "2.00", free: "6.00" });
  expect(machineCapacity([{ id: "b", minutes: null }], "480")).toEqual({
    committed: null,
    free: null,
  });
  expect(machineCapacity([], null)).toEqual({ committed: "0.00", free: null });
});
