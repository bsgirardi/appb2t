import { expect, it } from "vitest";
import { expandCalendar, findContinuousSlot } from "@/domain/planning/calendar";
import type { CalendarDTO } from "@/domain/planning/types";
const cal = (
  weekly: CalendarDTO["weekly"],
  exceptions: CalendarDTO["exceptions"] = [],
): CalendarDTO => ({ id: "p", version: 1, weekly, exceptions });
it("keeps printing continuous and fits the exact end boundary", () => {
  const windows = expandCalendar(
    cal([{ weekday: 1, startMinute: 480, endMinute: 1080 }]),
    "2026-10-12T00:00:00-03:00",
    "2026-10-13T00:00:00-03:00",
  );
  expect(
    findContinuousSlot(windows, "2026-10-12T08:00:00-03:00", "720"),
  ).toBeNull();
  expect(
    findContinuousSlot(windows, "2026-10-12T08:00:00-03:00", "600"),
  ).toEqual({
    start: "2026-10-12T11:00:00.000Z",
    end: "2026-10-12T21:00:00.000Z",
  });
});
it("joins adjacent nights but applies a closed-day exception", () => {
  const weekly = [
    { weekday: 1, startMinute: 1320, endMinute: 1440 },
    { weekday: 2, startMinute: 0, endMinute: 360 },
  ];
  const from = "2026-10-12T23:00:00-03:00",
    to = "2026-10-14T00:00:00-03:00";
  expect(
    findContinuousSlot(expandCalendar(cal(weekly), from, to), from, "240")?.end,
  ).toBe("2026-10-13T06:00:00.000Z");
  expect(
    findContinuousSlot(
      expandCalendar(
        cal(weekly, [{ date: "2026-10-13", intervals: [] }]),
        from,
        to,
      ),
      from,
      "240",
    ),
  ).toBeNull();
});
it("does not fabricate availability and rounds fractional minutes upward", () => {
  expect(
    expandCalendar(cal([]), "2026-10-12T00:00:00Z", "2026-10-13T00:00:00Z"),
  ).toEqual([]);
  expect(
    findContinuousSlot(
      [{ start: "2026-10-12T00:00:00Z", end: "2026-10-12T01:00:00Z" }],
      "2026-10-12T00:00:00Z",
      "0.000001",
    )?.end,
  ).toBe("2026-10-12T00:00:00.001Z");
});
