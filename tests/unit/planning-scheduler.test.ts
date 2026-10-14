import { expect, it } from "vitest";
import { forecast } from "@/domain/planning/scheduler";
import type {
  BatchDTO,
  CalendarDTO,
  PlanningInput,
} from "@/domain/planning/types";
const calendar = (start = 0, end = 1440): CalendarDTO => ({
  id: "c",
  version: 1,
  weekly: Array.from({ length: 7 }, (_, i) => ({
    weekday: i + 1,
    startMinute: start,
    endMinute: end,
  })),
  exceptions: [],
});
const instant = (time: string) => `2026-10-12T${time}:00-03:00`;
function batch(id: string, overrides: Partial<BatchDTO> = {}): BatchDTO {
  return {
    estimates: [],
    id,
    version: 1,
    sequence: 1,
    printerId: "p",
    state: "SCHEDULED",
    position: 1,
    materialItemId: "m",
    colorLabel: "Azul",
    colorKey: "azul",
    profileConfirmed: true,
    fitConfirmed: true,
    colorAvailabilityConfirmed: true,
    durationMinutes: "120",
    durationConfirmedAt: instant("08:00"),
    prepareMinutes: "0",
    removeMinutes: "10",
    remainingMinutes: null,
    remainingAsOf: null,
    participants: [],
    coverage: [],
    milestones: [],
    blockers: [],
    ...overrides,
  };
}
function input(batches: BatchDTO[], asOf = instant("08:00")): PlanningInput {
  return {
    asOf,
    revision: 1,
    team: calendar(480, 1080),
    machines: [{ id: "p", calendar: calendar(), batches }],
  };
}
it("considers the successor of an ongoing removal before advancing to another machine's evening window", () => {
  const active = batch("active", {
    state: "AWAITING_REMOVAL",
    milestones: [
      {
        id: "start",
        kind: "PRINT_START",
        instant: instant("07:00"),
        sourceId: null,
      },
      {
        id: "end",
        kind: "PRINT_END",
        instant: instant("08:00"),
        sourceId: null,
      },
      {
        id: "remove",
        kind: "REMOVE_START",
        instant: instant("08:00"),
        sourceId: null,
      },
    ],
  });
  const data = input(
    [active, batch("next", { position: 2, prepareMinutes: "5" })],
    instant("08:05"),
  );
  data.team = calendar();
  data.machines.push({
    id: "q",
    calendar: calendar(1080, 1440),
    batches: [batch("evening", { printerId: "q", prepareMinutes: "10" })],
  });
  expect(
    forecast(data).batches.find((b) => b.batchId === "next")?.prepare?.start,
  ).toBe("2026-10-12T11:10:00.000Z");
});
it("waits for team in the morning after an unattended night", () => {
  const result = forecast(
    input(
      [
        batch("a", {
          state: "PRINTING",
          durationMinutes: "480",
          milestones: [
            {
              id: "s",
              kind: "PRINT_START",
              instant: "2026-10-11T18:00:00-03:00",
              sourceId: null,
            },
          ],
        }),
      ],
      "2026-10-12T00:00:00-03:00",
    ),
  );
  expect(result.batches[0].removal?.start).toBe("2026-10-12T11:00:00.000Z");
});
it("serializes simultaneous removals across machines", () => {
  const a = batch("a", {
    state: "AWAITING_REMOVAL",
    milestones: [
      { id: "e", kind: "PRINT_END", instant: instant("08:00"), sourceId: null },
    ],
  });
  const b = batch("b", { ...a, id: "b", printerId: "q" });
  const data = input([a]);
  data.machines.push({ id: "q", calendar: calendar(), batches: [b] });
  const result = forecast(data);
  expect(result.batches.map((x) => x.removal?.start)).toEqual([
    "2026-10-12T11:00:00.000Z",
    "2026-10-12T11:10:00.000Z",
  ]);
});
it("counts a mixed print once and preserves the chosen sequence", () => {
  const result = forecast(
    input([batch("a"), batch("b", { position: 2, durationMinutes: "60" })]),
  );
  expect(result.totals[0].printMinutes).toBe(180);
  expect(result.batches[1].print?.start).toBe("2026-10-12T13:10:00.000Z");
});
it("does not free an overdue running print until remaining time is supplied", () => {
  const a = batch("a", {
    state: "PRINTING",
    durationMinutes: "60",
    milestones: [
      {
        id: "s",
        kind: "PRINT_START",
        instant: instant("06:00"),
        sourceId: null,
      },
    ],
  });
  expect(forecast(input([a, batch("b")])).batches.map((x) => x.reason)).toEqual(
    ["UNCONFIRMED_END", "UNCONFIRMED_END"],
  );
  a.remainingMinutes = "30";
  a.remainingAsOf = instant("08:00");
  expect(forecast(input([a, batch("b")])).batches[0].removal?.start).toBe(
    "2026-10-12T11:30:00.000Z",
  );
});
it("does not split long prints or allocate material-pending jobs", () => {
  const data = input([
    batch("a", { durationMinutes: "720" }),
    batch("b", { position: 2, state: "PENDING" }),
  ]);
  data.machines[0].calendar = calendar(480, 1080);
  expect(forecast(data).batches.map((x) => x.reason)).toEqual([
    "NO_WINDOW",
    "MATERIAL_PENDING",
  ]);
});
it("uses stable ids for equal deadlines and ignores presentation order", () => {
  const data = input([batch("z")]);
  data.machines.push({
    id: "q",
    calendar: calendar(),
    batches: [batch("a", { printerId: "q", prepareMinutes: "10" })],
  });
  data.machines[0].batches[0].prepareMinutes = "10";
  const result = forecast(data);
  expect(result.batches.find((x) => x.batchId === "a")?.prepare?.start).toBe(
    "2026-10-12T11:00:00.000Z",
  );
  expect(result.batches.find((x) => x.batchId === "z")?.prepare?.start).toBe(
    "2026-10-12T11:10:00.000Z",
  );
});
