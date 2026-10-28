import { expect, it } from "vitest";
import { timelineSegments, timelineWindow } from "@/domain/planning/timeline";
import type { Forecast } from "@/domain/planning/types";
const data: Forecast = { asOf: "2026-10-27T03:00:00Z", revision: 1, totals: [], batches: [{
  batchId: "a", printerId: "p", prepare: null, print: { start: "2026-10-27T02:00:00Z", end: "2026-10-28T05:00:00Z" },
  waitingRemoval: { start: "2026-10-28T05:00:00Z", end: "2026-10-28T05:00:00Z" }, removal: null, dueDate: null, late: false, reason: "UNCONFIRMED_END",
}] };
it("clips partial intervals to the civil week without mutating original instants or inventing completion", () => {
  const input = structuredClone(data);
  expect(timelineSegments(input, { start: "2026-10-28T03:00:00Z", end: "2026-10-29T03:00:00Z" })).toEqual([{
    batchId: "a", printerId: "p", kind: "print", original: data.batches[0].print,
    visible: { start: "2026-10-28T03:00:00.000Z", end: "2026-10-28T05:00:00.000Z" },
  }]);
  expect(input).toEqual(data);
  expect(timelineSegments(input, { start: "2026-10-29T03:00:00Z", end: "2026-10-30T03:00:00Z" })).toEqual([]);
});
it("starts at local midnight and clamps navigation to 90 days", () => {
  expect(timelineWindow("2026-10-27T11:00:00Z", 0)).toEqual({ start: "2026-10-27T03:00:00.000Z", end: "2026-11-03T03:00:00.000Z" });
  expect(timelineWindow("2026-10-27T11:00:00Z", -1)).toEqual(timelineWindow("2026-10-27T11:00:00Z", 0));
  expect(timelineWindow("2026-10-27T11:00:00Z", 999).end).toBe("2027-01-25T11:00:00.000Z");
});
