import { expect, it } from "vitest";
import {
  batchSchema,
  calendarSchema,
  batchStateSchema,
} from "@/domain/planning/validation";
const meta = {
  operationKey: "11111111-1111-4111-8111-111111111111",
  expectedVersion: 0,
  expectedRevision: 0,
};
const batch = {
  ...meta,
  printerId: "p",
  participants: [{ lineId: "l", units: 1 }],
  materialItemId: "m",
  colorLabel: "Azul",
  durationMinutes: null,
  prepareMinutes: "0",
  removeMinutes: "10",
};
it("rejects fractional and overflowing pieces", () => {
  for (const units of [1.5, 0, 2147483648])
    expect(
      batchSchema.safeParse({
        ...batch,
        participants: [{ lineId: "l", units }],
      }).success,
    ).toBe(false);
});
it("keeps absent duration distinct from explicit zero and rejects empty input", () => {
  expect(batchSchema.parse(batch).durationMinutes).toBeNull();
  expect(
    batchSchema.parse({ ...batch, durationMinutes: "0" }).durationMinutes,
  ).toBe("0");
  expect(batchSchema.safeParse({ ...batch, durationMinutes: "" }).success).toBe(
    false,
  );
  expect(batchStateSchema.safeParse("READY").success).toBe(false);
});
it("rejects overlapping weekly windows and duplicate exception dates", () => {
  const base = {
    ...meta,
    resource: "TEAM",
    printerId: null,
    weekly: [{ weekday: 1, startMinute: 480, endMinute: 1080 }],
    exceptions: [],
  };
  expect(calendarSchema.parse(base).weekly).toHaveLength(1);
  expect(
    calendarSchema.safeParse({
      ...base,
      weekly: [
        ...base.weekly,
        { weekday: 1, startMinute: 600, endMinute: 700 },
      ],
    }).success,
  ).toBe(false);
  expect(
    calendarSchema.safeParse({
      ...base,
      exceptions: [
        { date: "2026-10-10", intervals: [] },
        { date: "2026-10-10", intervals: [] },
      ],
    }).success,
  ).toBe(false);
});
