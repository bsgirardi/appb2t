import { expect, it } from "vitest";
import { quoteConsolidation } from "@/domain/opportunities/consolidation";
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
const input = { items: [item], discount: "8", shipping: "10" };
it("allocates unequal revenues and applies each frozen fee rate without duplicating depreciation", () => {
  const second = { ...item, lineId: "second", unitPrice: "4.00" };
  const secondSnapshot = {
    ...costs.snapshots[0],
    id: "s2",
    input: {
      ...lotFixture,
      channel: {
        ...lotFixture.channel,
        fees: [{ label: "Taxa", percent: "20" }],
      },
    },
  };
  const mixed = {
    ...costs,
    snapshots: [...costs.snapshots, secondSnapshot],
    bindings: [
      ...costs.bindings,
      { ...costs.bindings[0], lineId: "second", snapshotId: "s2" },
    ],
  };
  const result = quoteConsolidation(
    { items: [item, second], discount: "12", shipping: "10" },
    mixed,
    { shippingCost: "6", shippingFees: "1" },
  );
  expect(result.allocations).toEqual([
    { key: "line", value: "8.00" },
    { key: "second", value: "4.00" },
  ]);
  expect(result).toMatchObject({
    revenue: "118.00",
    productFees: "14.40",
    contribution: "-11.80",
    afterDepreciation: "-15.80",
    margin: "-10.00",
  });
});
it("consolidates discount, frozen product fees and explicitly declared freight without mutation", () => {
  const before = JSON.stringify({ input, costs });
  const result = quoteConsolidation(input, costs, {
    shippingCost: "6",
    shippingFees: "1",
  });
  expect(result).toMatchObject({
    revenue: "82.00",
    productFees: "7.20",
    contribution: "13.60",
    margin: "16.59",
    covered: 1,
    total: 1,
  });
  expect(result.allocations).toEqual([{ key: "line", value: "8.00" }]);
  expect(JSON.stringify({ input, costs })).toBe(before);
});
it("does not replace missing freight or line costs with zero", () => {
  for (const declared of [
    { shippingCost: "", shippingFees: "0" },
    { shippingCost: "0", shippingFees: "" },
    { shippingCost: "-1", shippingFees: "0" },
  ]) {
    expect(quoteConsolidation(input, costs, declared).contribution).toBeNull();
  }
  const missing = quoteConsolidation(input, null, {
    shippingCost: "0",
    shippingFees: "0",
  });
  expect(missing.contribution).toBeNull();
  expect(missing.covered).toBe(0);
  expect(
    quoteConsolidation(input, costs, { shippingCost: "100", shippingFees: "0" })
      .contribution,
  ).toBe("-79.40");
});
it("uses cent-exact allocation and rejects invalid discounts and stale memories", () => {
  const items = [item, { ...item, lineId: "second" }];
  const both = {
    ...costs,
    bindings: [...costs.bindings, { ...costs.bindings[0], lineId: "second" }],
  };
  expect(
    quoteConsolidation({ ...input, items, discount: "0.01" }, both, {
      shippingCost: "0",
      shippingFees: "0",
    }).allocations,
  ).toEqual([
    { key: "line", value: "0.01" },
    { key: "second", value: "0.00" },
  ]);
  expect(
    quoteConsolidation({ ...input, discount: "81" }, costs, {
      shippingCost: "0",
      shippingFees: "0",
    }).contribution,
  ).toBeNull();
  expect(
    quoteConsolidation(
      input,
      {
        ...costs,
        bindings: [{ ...costs.bindings[0], state: "STALE" as const }],
      },
      { shippingCost: "0", shippingFees: "0" },
    ).contribution,
  ).toBeNull();
});
