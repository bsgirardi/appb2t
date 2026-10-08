import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { product, meta, date } from "../fixtures/production";
import {
  saveFinishedStock,
  openFinishedStock,
} from "@/server/production/finished-stock";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { recordProduction } from "@/server/production/reports";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { correctStock } from "@/server/stock/corrections";
setupDatabase();
async function fixture() {
  const a = await seedUser(),
    p = await product();
  let s = await saveFinishedStock(a, {
    ...meta(),
    productId: p.id,
    active: true,
  });
  s = await openFinishedStock(a, {
    ...meta(s.version),
    stockId: s.id,
    units: 0,
    value: null,
    effectiveDate: date(),
  });
  let o = await saveOrder(a, {
    ...meta(),
    origin: "STOCK",
    lines: [
      {
        productId: p.id,
        description: "Peça",
        technology: "FDM",
        targetUnits: 6,
      },
    ],
  });
  o = await releaseOrder(a, { ...meta(o.version), orderId: o.id });
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
    quantity: "500",
    value: "50",
    effectiveDate: date(),
  });
  return { a, p, s, o, m };
}
it("records actual material once and good pieces only, with atomic retry", async () => {
  const { a, o, m } = await fixture();
  const input = {
    ...meta(o.version),
    lineId: o.lines[0].id,
    executorId: a.id,
    manualStage: true,
    goodUnits: 5,
    failedUnits: 1,
    machineMinutes: null,
    setupMinutes: "10",
    finishingMinutes: "20",
    materialComplete: true,
    timeComplete: false,
    materials: [{ itemId: m.id, quantity: "120" }],
    effectiveDate: date(),
    reason: "Uma peça falhou",
  };
  const [x, y] = await Promise.all([
    recordProduction(a, input),
    recordProduction(a, input),
  ]);
  expect(x).toEqual(y);
  expect(
    (
      await db.stockMovement.aggregate({ _sum: { quantity: true } })
    )._sum.quantity?.toFixed(),
  ).toBe("380");
  expect(
    (await db.finishedMovement.aggregate({ _sum: { units: true } }))._sum.units,
  ).toBe(5);
  expect(x.lines[0]).toMatchObject({ goodUnits: 5, failedUnits: 1 });
  expect(await db.financialEntry.count()).toBe(0);
  const consumed = await db.stockMovement.findFirstOrThrow({
    where: { kind: "CONSUMPTION" },
  });
  const item = await db.stockItem.findUniqueOrThrow({ where: { id: m.id } });
  await expect(
    correctStock(a, {
      ...meta(item.version),
      sourceId: consumed.id,
      kind: "RETURN_CONSUMPTION",
      quantity: "1",
      effectiveDate: date(),
      reason: "Correção por fora",
    }),
  ).rejects.toThrow();
});
it("rolls back material and production if a later material is invalid", async () => {
  const { a, o, m } = await fixture();
  await expect(
    recordProduction(a, {
      ...meta(o.version),
      lineId: o.lines[0].id,
      executorId: a.id,
      manualStage: true,
      goodUnits: 1,
      failedUnits: 0,
      machineMinutes: null,
      setupMinutes: null,
      finishingMinutes: null,
      materialComplete: false,
      timeComplete: false,
      materials: [
        { itemId: m.id, quantity: "120" },
        { itemId: "missing", quantity: "1" },
      ],
      effectiveDate: date(),
    }),
  ).rejects.toThrow();
  expect(await db.productionEvent.count()).toBe(0);
  expect(await db.stockMovement.count()).toBe(1);
  expect(
    (await db.finishedMovement.aggregate({ _sum: { units: true } }))._sum.units,
  ).toBe(0);
});
it("accepts incremental time without inventing pieces and requires a failure reason", async () => {
  const { a, o } = await fixture();
  const input = {
    ...meta(o.version),
    lineId: o.lines[0].id,
    executorId: a.id,
    manualStage: true,
    goodUnits: 0,
    failedUnits: 0,
    machineMinutes: null,
    setupMinutes: "10",
    finishingMinutes: null,
    materialComplete: false,
    timeComplete: false,
    materials: [],
    effectiveDate: date(),
  };
  const x = await recordProduction(a, input);
  expect(x.lines[0].goodUnits).toBe(0);
  await expect(
    recordProduction(a, { ...input, ...meta(x.version), failedUnits: 1 }),
  ).rejects.toThrow();
});
