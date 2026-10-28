import { expect, it } from "vitest";
import { simulateQueue } from "@/domain/planning/scenario";
import { scenarioBatch, scenarioInput } from "../fixtures/planning-scenario";

it("simulates the complete installation without mutating data and exposes cross-machine impacts", () => {
  const input = scenarioInput(), saved = structuredClone(input);
  const result = simulateQueue(input, { printerId: "p", batchIds: ["b", "a"] });
  expect(input).toEqual(saved);
  expect(result.before.batches.find(b => b.batchId === "a")?.print?.start).toBe("2026-10-27T11:10:00.000Z");
  expect(result.after.batches.find(b => b.batchId === "b")?.print?.start).toBe("2026-10-27T11:10:00.000Z");
  expect(result.impacts.map(i => i.batchId)).toContain("c");
  expect(result.impacts.find(i => i.batchId === "c")?.participants[0].lineId).toBe("line-c");
});
it.each([["a"], ["a", "a"], ["a", "missing"], ["a", "c"], ["a", "b", "active"]])("rejects incomplete or invalid permutations %j", (...ids) => {
  expect(() => simulateQueue(scenarioInput(), { printerId: "p", batchIds: ids as string[] })).toThrow();
});
it("preserves actual active milestones and excludes active batches from reordering", () => {
  const input = scenarioInput();
  input.machines[0].batches.push(scenarioBatch("active", { state: "PRINTING", milestones: [{ id: "start", kind: "PRINT_START", instant: "2026-10-27T10:50:00Z", sourceId: null }] }));
  const result = simulateQueue(input, { printerId: "p", batchIds: ["b", "a"] });
  expect(result.after.batches.find(b => b.batchId === "active")?.print?.start).toBe("2026-10-27T10:50:00.000Z");
});
it("reports no impact for the same order and retains missing forecasts and absent deadlines", () => {
  const input = scenarioInput();
  input.machines[0].batches[0].state = "PENDING";
  input.machines[0].batches[0].participants[0].dueDate = null;
  const result = simulateQueue(input, { printerId: "p", batchIds: ["a", "b"] });
  expect(result.impacts).toEqual([]);
  expect(result.after.batches[0]).toMatchObject({ reason: "MATERIAL_PENDING", removal: null, dueDate: null, late: false });
});
it("compares deadline risk for all participants of a mixed batch", () => {
  const input = scenarioInput();
  input.machines[0].batches[0].participants.push({ ...input.machines[0].batches[0].participants[0], id: "other", lineId: "other", dueDate: "2026-10-26" });
  const result = simulateQueue(input, { printerId: "p", batchIds: ["b", "a"] });
  expect(result.impacts.find(i => i.batchId === "a")?.participants).toHaveLength(2);
  expect(result.impacts.find(i => i.batchId === "a")?.after.late).toBe(true);
});
