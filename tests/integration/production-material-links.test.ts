import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { meta, sale, date } from "../fixtures/production";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { recordProduction } from "@/server/production/reports";
import { linkExistingConsumption } from "@/server/production/material-links";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { reserveStock, consumeStock } from "@/server/stock/reservations";
setupDatabase();
it("links a demonstrated old consumption up to its net quantity without consuming again", async () => {
  const a = await seedUser(),
    s = await sale();
  const m = await saveStockItem(a, {
    ...meta(),
    name: "PLA",
    unit: "G",
    method: "MANUAL",
    manualUnitCost: "0.1",
  });
  await openInventory(a, {
    ...meta(m.version),
    itemId: m.id,
    quantity: "100",
    value: "10",
    effectiveDate: date(),
  });
  const r = await reserveStock(a, {
    ...meta(2),
    itemId: m.id,
    saleId: s.id,
    lineKey: "line1",
    quantity: "50",
    effectiveDate: date(),
  });
  const move = await consumeStock(a, {
    ...meta(r.version),
    reservationId: r.id,
    quantity: "50",
    effectiveDate: date(),
  });
  let o = await saveOrder(a, {
    ...meta(),
    origin: "SALE",
    saleId: s.id,
    lines: [
      {
        saleLineKey: "line1",
        description: "Peça",
        technology: "FDM",
        targetUnits: 1,
      },
    ],
  });
  o = await releaseOrder(a, { ...meta(o.version), orderId: o.id });
  o = await recordProduction(a, {
    ...meta(o.version),
    lineId: o.lines[0].id,
    executorId: a.id,
    manualStage: true,
    goodUnits: 0,
    failedUnits: 0,
    machineMinutes: null,
    setupMinutes: "1",
    finishingMinutes: null,
    timeComplete: false,
    materialComplete: false,
    materials: [],
    effectiveDate: date(),
  });
  const e = await db.productionEvent.findFirstOrThrow();
  o = await linkExistingConsumption(a, {
    ...meta(o.version),
    eventId: e.id,
    movementId: move.id,
    quantity: "30",
    reason: "Conciliação",
  });
  o = await linkExistingConsumption(a, {
    ...meta(o.version),
    eventId: e.id,
    movementId: move.id,
    quantity: "20",
    reason: "Conciliação",
  });
  await expect(
    linkExistingConsumption(a, {
      ...meta(o.version),
      eventId: e.id,
      movementId: move.id,
      quantity: "1",
      reason: "Conciliação",
    }),
  ).rejects.toThrow();
  expect(await db.stockMovement.count()).toBe(2);
  expect(
    (
      await db.productionMaterialLink.aggregate({ _sum: { quantity: true } })
    )._sum.quantity?.toFixed(),
  ).toBe("50");
});
