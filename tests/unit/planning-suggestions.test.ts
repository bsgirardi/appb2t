import { expect, it } from "vitest";
import { suggestBatches } from "@/domain/planning/suggestions";
it("groups only known material/color/machine and suggests urgent pieces first", () => {
  const base = {
    printerId: "p",
    technology: "FDM",
    materialItemId: "m",
    colorKey: "azul",
    units: 2,
    orderSequence: 1,
  };
  const groups = suggestBatches([
    { ...base, lineId: "later", dueDate: "2026-10-15" },
    { ...base, lineId: "early", dueDate: "2026-10-13" },
    { ...base, lineId: "unknown", dueDate: null, colorKey: null },
    { ...base, lineId: "other", dueDate: null, printerId: "q" },
  ]);
  expect(groups).toHaveLength(2);
  expect(groups[0].candidates.map((x) => x.lineId)).toEqual(["early", "later"]);
});
