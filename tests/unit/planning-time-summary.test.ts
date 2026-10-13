import { expect, it } from "vitest";
import { summarizeTimes } from "@/domain/planning/time-summary";
it("does not duplicate the full time of an event shared across batches", () => {
  const result = summarizeTimes("60", true, [
    { eventId: "e", machineMinutes: "60", exclusive: false },
  ]);
  expect(result.reportedMachineMinutes).toBeNull();
  expect(result.complete).toBe(false);
});
it("counts an exclusive report once and marks discrepancies incomplete", () => {
  const event = { eventId: "e", machineMinutes: "30", exclusive: true };
  expect(summarizeTimes("60", true, [event, event])).toMatchObject({
    reportedMachineMinutes: "30",
    differenceMinutes: "-30",
    complete: false,
  });
  expect(summarizeTimes("30", true, [event])).toMatchObject({ complete: true });
});
