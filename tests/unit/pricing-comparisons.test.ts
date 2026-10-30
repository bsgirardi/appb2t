import { expect, it } from "vitest";
import Decimal from "decimal.js";
import { previewComparison } from "@/domain/pricing/comparisons/calculate";
import { comparisonDraftSchema } from "@/domain/pricing/comparisons/validation";
import { lotFixture } from "../fixtures/pricing";
import { requestFromInput } from "@/domain/pricing/resolve";

const input = {
  ...lotFixture,
  materials: [
    {
      ...lotFixture.materials[0],
      pricePerBase: "100",
      consumptionPerUnit: "90",
      fixedWaste: "0",
    },
  ],
  printer: { ...lotFixture.printer, acquisitionCost: "12000", watts: "0" },
  maintenancePerHour: "0",
  laborPerHour: "0",
  extras: [],
  channel: { ...lotFixture.channel, fixedCost: "0" },
  targetMarginPercent: "20",
};
const channels = [{ ...input.channel, ...input.channel.ref, active: true }];
const alternatives = [{ channelRef: input.channel.ref, discountPercent: "10" }];
function row(discount = "10") {
  const result = previewComparison(
    input,
    channels,
    { kind: "COMMON", unitPrice: "15" },
    [{ ...alternatives[0], discountPercent: discount }],
  ).alternatives[0];
  if (result.status !== "VALID") throw Error(result.message);
  return result.value;
}
it("computes coverage, target and discount using the final unit price", () => {
  const value = row();
  expect(value.metrics).toMatchObject({
    coverageUnitPrice: "11.12",
    targetUnitPrice: "12.86",
    finalUnitPrice: "13.50",
    contributionChange: "-13.5",
    coversFullCost: true,
    meetsTarget: true,
  });
  expect(value.result).toMatchObject({
    offeredRevenue: "135",
    contribution: "31.5",
    afterDepreciation: "21.5",
  });
  expect(new Decimal(value.metrics.marginChangePoints!).toFixed(6)).toBe(
    "-6.666667",
  );
});
it("preserves zero revenue, losses and null margins at 100 percent", () => {
  expect(row("100").result).toMatchObject({
    contribution: "-90",
    afterDepreciation: "-100",
    contributionMargin: null,
  });
  expect(row("100").metrics.marginChangePoints).toBeNull();
  expect(row("0").metrics.contributionChange).toBe("0");
});
it("normalizes commas and deduplicates equivalent alternatives without mutating input", () => {
  const before = structuredClone(input);
  const result = previewComparison(
    input,
    channels,
    { kind: "COMMON", unitPrice: "15,00" },
    [alternatives[0], { ...alternatives[0], discountPercent: "10,00" }],
  );
  expect(result.alternatives).toHaveLength(1);
  expect(input).toEqual(before);
});
it("keeps impossible targets local to a channel and can still evaluate a common offer", () => {
  const expensive = {
    ...channels[0],
    id: "high",
    fees: [{ label: "Taxa", percent: "85" }],
  };
  const refs = [
    ...alternatives,
    { channelRef: { id: "high", version: 1 }, discountPercent: "0" },
  ];
  const common = previewComparison(
    input,
    [...channels, expensive],
    { kind: "COMMON", unitPrice: "15" },
    refs,
  );
  expect(common.alternatives[1]).toMatchObject({
    status: "VALID",
    value: { metrics: { targetUnitPrice: null, meetsTarget: false } },
  });
  expect(
    previewComparison(
      { ...input, mode: "CONTRIBUTION" },
      [...channels, expensive],
      { kind: "CHANNEL" },
      refs,
    ).alternatives.map((r) => r.status),
  ).toEqual(["VALID", "INVALID"]);
});
it.each(["MARKUP", "CONTRIBUTION", "INFORMED"] as const)(
  "supports channel reference in %s mode",
  (mode) => {
    expect(
      previewComparison(
        { ...input, mode },
        channels,
        { kind: "CHANNEL" },
        alternatives,
      ).alternatives[0].status,
    ).toBe("VALID");
  },
);
it("rejects invalid discounts, names and excessive rows", () => {
  const draft = {
    name: "Teste",
    request: requestFromInput(input, 1),
    reference: { kind: "CHANNEL" },
    alternatives,
  };
  expect(comparisonDraftSchema.safeParse(draft).success).toBe(true);
  for (const discountPercent of ["-1", "101", "1.001"])
    expect(
      comparisonDraftSchema.safeParse({
        ...draft,
        alternatives: [{ ...alternatives[0], discountPercent }],
      }).success,
    ).toBe(false);
  expect(comparisonDraftSchema.safeParse({ ...draft, name: " " }).success).toBe(
    false,
  );
  expect(
    comparisonDraftSchema.safeParse({
      ...draft,
      alternatives: Array(11).fill(alternatives[0]),
    }).success,
  ).toBe(false);
});
it("separates contribution target from coverage and keeps exact input precision", () => {
  const lowTarget = { ...input, targetMarginPercent: "0" };
  const r = previewComparison(
    lowTarget,
    channels,
    { kind: "COMMON", unitPrice: "10" },
    [{ ...alternatives[0], discountPercent: "0" }],
  ).alternatives[0];
  expect(r).toMatchObject({
    status: "VALID",
    value: { metrics: { meetsTarget: true, coversFullCost: false } },
  });
  const highTarget = previewComparison(
    { ...input, targetMarginPercent: "50" },
    channels,
    { kind: "COMMON", unitPrice: "12" },
    [{ ...alternatives[0], discountPercent: "0" }],
  ).alternatives[0];
  expect(highTarget).toMatchObject({
    status: "VALID",
    value: { metrics: { meetsTarget: false, coversFullCost: true } },
  });
});
it("handles resin, zero commercial fees and fixed cost exactly once per lot", () => {
  const resin = {
    ...input,
    technology: "RESIN" as const,
    materials: input.materials.map((m) => ({ ...m, unit: "ML" as const })),
  };
  const c = [{ ...channels[0], fees: [], fixedCost: "10" }];
  const r = previewComparison(
    resin,
    c,
    { kind: "COMMON", unitPrice: "15" },
    alternatives,
  ).alternatives[0];
  expect(r).toMatchObject({
    status: "VALID",
    value: {
      result: { commercialFixed: "10", fees: "0", contribution: "35" },
      metrics: { coverageUnitPrice: "11.00", targetUnitPrice: "12.50" },
    },
  });
});
it("rejects oversized money and stale references per alternative", () => {
  const r = previewComparison(
    input,
    channels,
    { kind: "COMMON", unitPrice: "999999999999" },
    [
      {
        channelRef: { ...input.channel.ref, version: 2 },
        discountPercent: "0",
      },
    ],
  );
  expect(r.alternatives[0].status).toBe("INVALID");
  expect(
    previewComparison(
      {
        ...input,
        printer: { ...input.printer, acquisitionCost: "999999999999" },
        machineFixedMinutes: "6000000",
      },
      channels,
      { kind: "CHANNEL" },
      alternatives,
    ).alternatives[0].status,
  ).toBe("INVALID");
});
