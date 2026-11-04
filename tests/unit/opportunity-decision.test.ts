import { expect, it } from "vitest";
import { quoteDecisionLines } from "@/domain/opportunities/decision";
import { lineFingerprint } from "@/domain/pricing/document-costs";
import { calculateV2 } from "@/domain/pricing/calculate";
import { lotFixture } from "../fixtures/pricing";
const item = {
  lineId: "line",
  description: "Peça",
  quantity: 10,
  unitPrice: "8.00",
};
const costs = {
  revisionId: "r",
  bindings: [
    {
      lineId: "line",
      snapshotId: "s",
      state: "VALID" as const,
      fingerprint: lineFingerprint(item),
    },
  ],
  snapshots: [
    {
      id: "s",
      version: 2 as const,
      input: lotFixture,
      result: calculateV2(lotFixture),
      actorId: "a",
      actorName: "A",
      createdAt: "2026-11-04T12:00:00Z",
    },
  ],
};
it("uses the current offer and preserved assumptions without mutating inputs", () => {
  const before = JSON.stringify(costs);
  const [row] = quoteDecisionLines([item], costs);
  expect(row.result).toMatchObject({
    offeredRevenue: "80",
    contribution: "17.8",
  });
  expect(Number(row.result?.contributionMargin)).toBeCloseTo(22.25);
  expect(row.machineMinutes).toBe("120");
  expect(JSON.stringify(costs)).toBe(before);
});
it("rejects changed identities, quantities, stale bindings and missing costs", () => {
  for (const changed of [
    { ...item, description: "Outro" },
    { ...item, quantity: 11 },
    { ...item, lineId: "other" },
  ])
    expect(quoteDecisionLines([changed], costs)[0].result).toBeNull();
  expect(quoteDecisionLines([item], null)[0].result).toBeNull();
  expect(
    quoteDecisionLines([item], {
      ...costs,
      bindings: [{ ...costs.bindings[0], state: "STALE" }],
    })[0].result,
  ).toBeNull();
});
it("preserves zero and negative offers, and fractional machine time", () => {
  const zero = quoteDecisionLines([{ ...item, unitPrice: "0" }], costs)[0];
  expect(zero.result?.contributionMargin).toBeNull();
  expect(Number(zero.result?.contribution)).toBeLessThan(0);
  const partial = {
    ...costs,
    snapshots: [
      {
        ...costs.snapshots[0],
        input: {
          ...lotFixture,
          machineFixedMinutes: "1.25",
          machineMinutesPerUnit: "0.125",
        },
      },
    ],
  };
  expect(quoteDecisionLines([item], partial)[0].machineMinutes).toBe("2.5");
});
