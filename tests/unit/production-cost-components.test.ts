import { expect, it } from "vitest";
import { allocateCostComponents } from "@/domain/production/cost-allocation";
it("preserves legacy total allocations and every component", () => {
  const rows = allocateCostComponents(
    "1",
    { material: "0.2", depreciation: "0.8" },
    [0, 1, 2].map((i) => ({ key: String(i), position: i, weight: "1" })),
  );
  expect(rows.map((r) => r.total)).toEqual([
    "0.333333",
    "0.333333",
    "0.333334",
  ]);
  expect(rows.map((r) => r.components.depreciation)).toEqual([
    "0.266667",
    "0.266667",
    "0.266666",
  ]);
  expect(rows.map((r) => r.components.material)).toEqual([
    "0.066666",
    "0.066666",
    "0.066668",
  ]);
});
it("caps depreciation at subcentavo totals without negative components", () => {
  const rows = allocateCostComponents(
    "0.000001",
    { material: "0", depreciation: "0.000001" },
    [0, 1, 2].map((i) => ({ key: String(i), position: i, weight: "1" })),
  );
  expect(rows.map((r) => r.total)).toEqual(["0", "0", "0.000001"]);
  expect(rows.map((r) => r.components.material)).toEqual(["0", "0", "0"]);
  expect(rows.map((r) => r.components.depreciation)).toEqual([
    "0",
    "0",
    "0.000001",
  ]);
});
