import { expect, it } from "vitest";
import { assertPreviewCurrent, planningFingerprint } from "@/server/planning/preview-validity";
import { asOf, scenarioInput } from "../fixtures/planning-scenario";
const scenario = { printerId: "p", batchIds: ["b", "a"] };
it("accepts a recent matching preview but rejects expiration, invalid and future timestamps", () => {
  const input = scenarioInput(), preview = { asOf, fingerprint: planningFingerprint(input, scenario) };
  expect(() => assertPreviewCurrent(input, scenario, preview, "2026-10-27T11:00:59.999Z")).not.toThrow();
  for (const now of ["2026-10-27T11:01:00Z", "2026-10-27T10:59:59Z", "invalid"])
    expect(() => assertPreviewCurrent(input, scenario, preview, now)).toThrow();
});
it("rejects crossing an activity boundary even within 60 seconds", () => {
  const input = scenarioInput();
  input.machines[0].batches[0].prepareMinutes = "0.5";
  input.machines[0].batches[1].prepareMinutes = "0.5";
  const preview = { asOf, fingerprint: planningFingerprint(input, scenario) };
  expect(() => assertPreviewCurrent(input, scenario, preview, "2026-10-27T11:00:30Z")).toThrow();
});
it("fingerprints current inputs and scenario independently of database row ordering", () => {
  const input = scenarioInput(), fingerprint = planningFingerprint(input, scenario);
  input.machines.reverse(); input.machines.find(m => m.id === "p")!.batches.reverse();
  expect(planningFingerprint(input, scenario)).toBe(fingerprint);
  const changes = [
    (x: typeof input) => { x.revision++; },
    (x: typeof input) => { x.machines[0].batches[0].blockers.push("Material insuficiente"); },
    (x: typeof input) => { x.machines[0].batches[0].durationMinutes = "90"; },
    (x: typeof input) => { x.machines[0].batches[0].participants[0].dueDate = null; },
    (x: typeof input) => { x.machines[0].calendar!.exceptions.push({ date: "2026-10-28", intervals: [] }); },
    (x: typeof input) => { x.machines.push({ id: "new", calendar: null, batches: [] }); },
  ];
  for (const change of changes) {
    const current = structuredClone(input); change(current);
    expect(() => assertPreviewCurrent(current, scenario, { asOf, fingerprint }, asOf)).toThrow();
  }
  expect(planningFingerprint(input, { ...scenario, batchIds: ["a", "b"] })).not.toBe(fingerprint);
});
it("ignores command metadata when checking the same queue scenario", () => {
  const input = scenarioInput();
  const command = { ...scenario, operationKey: "key", expectedVersion: 0, previewAsOf: asOf };
  expect(planningFingerprint(input, command)).toBe(planningFingerprint(input, scenario));
});
