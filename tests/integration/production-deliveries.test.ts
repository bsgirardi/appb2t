import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { product, meta, date, sale } from "../fixtures/production";
import {
  saveFinishedStock,
  openFinishedStock,
} from "@/server/production/finished-stock";
import { reserveFinished } from "@/server/production/fulfillment";
import {
  recordDelivery,
  correctDelivery,
} from "@/server/production/deliveries";
setupDatabase();
it("delivers partial pieces without negative stock or additional financial events", async () => {
  const a = await seedUser(),
    p = await product(),
    s = await sale(p.id, 5);
  let stock = await saveFinishedStock(a, {
    ...meta(),
    productId: p.id,
    active: true,
  });
  stock = await openFinishedStock(a, {
    ...meta(stock.version),
    stockId: stock.id,
    units: 8,
    value: null,
    effectiveDate: date(),
  });
  const origin = await db.finishedOrigin.findFirstOrThrow();
  await reserveFinished(a, {
    ...meta(stock.version),
    saleVersion: s.version,
    saleId: s.id,
    lineKey: "line1",
    stockId: stock.id,
    units: 5,
    originAllocations: [{ originId: origin.id, units: 5 }],
  });
  const c = await db.finishedCommitment.findFirstOrThrow(),
    current = await db.sale.findUniqueOrThrow({ where: { id: s.id } });
  const input = {
    ...meta(current.version),
    saleId: s.id,
    lines: [
      { lineKey: "line1", allocations: [{ commitmentId: c.id, units: 2 }] },
    ],
    effectiveDate: date(),
    notes: "Retirada parcial",
  };
  const delivery = await recordDelivery(a, input);
  expect((await recordDelivery(a, input)).id).toBe(delivery.id);
  expect(
    (await db.finishedMovement.aggregate({ _sum: { units: true } }))._sum.units,
  ).toBe(6);
  expect(
    (await db.finishedCommitmentEvent.aggregate({ _sum: { units: true } }))._sum
      .units,
  ).toBe(3);
  expect(await db.financialEntry.count()).toBe(0);
  const line = await db.productionDeliveryLine.findFirstOrThrow();
  await correctDelivery(a, {
    ...meta(delivery.version),
    deliveryId: delivery.id,
    lines: [{ deliveryLineId: line.id, units: 1 }],
    declaration: "ENTRY_ERROR",
    effectiveDate: date(),
    reason: "Uma peça registrada a mais",
  });
  expect(
    (await db.finishedMovement.aggregate({ _sum: { units: true } }))._sum.units,
  ).toBe(7);
  expect(
    (await db.finishedCommitmentEvent.aggregate({ _sum: { units: true } }))._sum
      .units,
  ).toBe(4);
});
it("serializes different sales competing for the last physical piece", async () => {
  const a = await seedUser(),
    p = await product(),
    s1 = await sale(p.id, 1),
    s2 = await sale(p.id, 1);
  let stock = await saveFinishedStock(a, {
    ...meta(),
    productId: p.id,
    active: true,
  });
  stock = await openFinishedStock(a, {
    ...meta(stock.version),
    stockId: stock.id,
    units: 1,
    value: null,
    effectiveDate: date(),
  });
  const origin = await db.finishedOrigin.findFirstOrThrow();
  const results = await Promise.allSettled(
    [s1, s2].map((s) =>
      reserveFinished(a, {
        ...meta(stock.version),
        saleVersion: s.version,
        saleId: s.id,
        lineKey: "line1",
        stockId: stock.id,
        units: 1,
        originAllocations: [{ originId: origin.id, units: 1 }],
      }),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    (await db.finishedCommitmentEvent.aggregate({ _sum: { units: true } }))._sum
      .units,
  ).toBe(1);
});
