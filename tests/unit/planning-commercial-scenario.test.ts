import { it, expect } from "vitest";
import { simulateCommercial } from "@/domain/planning/commercial-scenario";
import { scenarioInput, asOf } from "../fixtures/planning-scenario";
import type { CommercialScenario } from "@/domain/planning/commercial-types";
const lines = [
  { lineKey: "x", description: "Peça", quantity: 2, technology: "FDM" },
];
export const scenario = (): CommercialScenario => ({
  completion: { post: { mode: "unknown" }, delivery: { mode: "unknown" } },
  lines: [
    {
      lineKey: "x",
      quantity: 2,
      mode: "produce",
      batches: [
        {
          id: "hyp",
          lineKey: "x",
          printerId: "p",
          units: 2,
          durationMinutes: "60",
          prepareMinutes: "10",
          removeMinutes: "10",
          materialItemId: "m",
          colorLabel: "Azul",
          availableAt: asOf,
          availabilityReason: "Disponível conferido",
          durationSource: "manual",
          reviewed: true,
          profileAssumed: true,
          fitAssumed: true,
        },
      ],
    },
  ],
});
const options = {
  printers: [
    { id: "p", technology: "FDM", active: true },
    { id: "q", technology: "FDM", active: true },
  ],
  materials: [{ id: "m", active: true, inventoried: true, available: "100" }],
};
it("appends hypothetical work without changing inputs and includes cross-machine impact", () => {
  const input = scenarioInput(),
    before = structuredClone(input);
  const r = simulateCommercial(input, lines, scenario(), options);
  expect(input).toEqual(before);
  expect(r.removalAt).not.toBeNull();
  expect(r.after.batches.at(-1)).toBeDefined();
  expect(
    r.after.batches.find((b) => b.batchId === "hyp:x:hyp")!.prepare!.start >=
      r.before.batches.find((b) => b.batchId === "b")!.removal!.end,
  ).toBe(true);
});
it("restricts real calendars before calculation for future availability", () => {
  const s = scenario();
  if (s.lines[0].mode === "produce")
    s.lines[0].batches[0].availableAt = "2026-10-28T11:00:00.000Z";
  const r = simulateCommercial(scenarioInput(), lines, s, options);
  expect(
    r.after.batches.find((b) => b.batchId === "hyp:x:hyp")!.prepare!.start >=
      "2026-10-28T11:00:00.000Z",
  ).toBe(true);
  expect(r.warnings.join()).toContain("conservadora");
  expect(r.impacts.some((b) => b.batchId === "a")).toBe(true);
});
it("rejects incomplete quantities, incompatible machines and unreviewed assumptions", () => {
  for (const mutate of [
    (s: CommercialScenario) => {
      s.lines = [];
    },
    (s: CommercialScenario) => {
      s.lines.push(s.lines[0]);
    },
    (s: CommercialScenario) => {
      if (s.lines[0].mode === "produce") s.lines[0].batches[0].units = 1;
    },
    (s: CommercialScenario) => {
      if (s.lines[0].mode === "produce") s.lines[0].batches[0].reviewed = false;
    },
  ]) {
    const s = scenario();
    mutate(s);
    expect(() =>
      simulateCommercial(scenarioInput(), lines, s, options),
    ).toThrow();
  }
  expect(() =>
    simulateCommercial(scenarioInput(), lines, scenario(), {
      ...options,
      printers: [{ id: "p", technology: "SLA", active: true }],
    }),
  ).toThrow();
});
it("does not yield a complete date with unconfirmed ending, unknown material or no window", () => {
  const input = scenarioInput();
  input.machines[0].batches[0].state = "PRINTING";
  expect(
    simulateCommercial(input, lines, scenario(), options).removalAt,
  ).toBeNull();
  expect(
    simulateCommercial(scenarioInput(), lines, scenario(), {
      ...options,
      materials: [],
    }).removalAt,
  ).toBeNull();
  const noWindow = scenarioInput();
  noWindow.team!.weekly = [];
  expect(
    simulateCommercial(noWindow, lines, scenario(), options).removalAt,
  ).toBeNull();
});
it("refuses future restrictions that intersect a real active service", () => {
  const input = scenarioInput();
  input.machines[0].batches[0].state = "PREPARING";
  input.machines[0].batches[0].milestones = [
    { id: "m", kind: "PREPARE_START", instant: asOf, sourceId: null },
  ];
  const s = scenario();
  if (s.lines[0].mode === "produce")
    s.lines[0].batches[0].availableAt = "2026-10-28T11:00:00Z";
  expect(simulateCommercial(input, lines, s, options).removalAt).toBeNull();
});
it("allows explicit manual technology when the quote has no usable memory", () => {
  const s = scenario();
  if (s.lines[0].mode === "produce")
    Object.assign(s.lines[0].batches[0], { technology: "FDM" });
  expect(
    simulateCommercial(
      scenarioInput(),
      [{ ...lines[0], technology: null }],
      s,
      options,
    ).removalAt,
  ).not.toBeNull();
});
