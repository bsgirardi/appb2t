import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { product, meta, date, sale } from "../fixtures/production";
import {
  saveFinishedStock,
  openFinishedStock,
} from "@/server/production/finished-stock";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { recordProduction } from "@/server/production/reports";
import { refreshProductionCosts } from "@/server/production/costs";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { receivePurchase } from "@/server/stock/receipts";
import { confirmReceiptFinance } from "@/server/stock/purchase-finance";
setupDatabase();
it("reconciles late purchase value through new cost revisions without new physical or cash events", async () => {
  const a = await seedUser(),
    p = await product();
  let st = await saveFinishedStock(a, {
    ...meta(),
    productId: p.id,
    active: true,
  });
  st = await openFinishedStock(a, {
    ...meta(st.version),
    stockId: st.id,
    units: 0,
    value: null,
    effectiveDate: date(),
  });
  const m = await saveStockItem(a, {
    ...meta(),
    name: "PLA",
    unit: "G",
    method: "WEIGHTED_AVERAGE",
  });
  await openInventory(a, {
    ...meta(m.version),
    itemId: m.id,
    quantity: "0",
    effectiveDate: date(),
  });
  const r = await receivePurchase(a, {
    ...meta(),
    supplier: "Fornecedor",
    effectiveDate: date(),
    lines: [{ itemId: m.id, quantity: "100" }],
  });
  let o = await saveOrder(a, {
    ...meta(),
    origin: "STOCK",
    lines: [
      {
        productId: p.id,
        description: "Peça",
        technology: "FDM",
        targetUnits: 2,
      },
    ],
  });
  o = await releaseOrder(a, { ...meta(o.version), orderId: o.id });
  o = await recordProduction(a, {
    ...meta(o.version),
    lineId: o.lines[0].id,
    executorId: a.id,
    manualStage: true,
    goodUnits: 2,
    failedUnits: 0,
    machineMinutes: null,
    setupMinutes: "0",
    finishingMinutes: "0",
    materialComplete: true,
    timeComplete: true,
    materials: [{ itemId: m.id, quantity: "50" }],
    effectiveDate: date(),
  });
  await db.productionOrder.update({
    where: { id: o.id },
    data: { status: "CONCLUIDA" },
  });
  const { reserveFinished } = await import("@/server/production/fulfillment");
  const { recordDelivery } = await import("@/server/production/deliveries");
  const customerSale = await sale(p.id, 2);
  const produced = await db.finishedOrigin.findFirstOrThrow({
    where: { lineId: o.lines[0].id },
  });
  const physical = await db.finishedStock.findUniqueOrThrow({
    where: { id: st.id },
  });
  await reserveFinished(a, {
    ...meta(physical.version),
    saleVersion: customerSale.version,
    saleId: customerSale.id,
    lineKey: "line1",
    stockId: physical.id,
    units: 2,
    originAllocations: [{ originId: produced.id, units: 2 }],
  });
  const committed = await db.finishedCommitment.findFirstOrThrow({
    where: { saleId: customerSale.id },
  });
  const currentSale = await db.sale.findUniqueOrThrow({
    where: { id: customerSale.id },
  });
  await recordDelivery(a, {
    ...meta(currentSale.version),
    saleId: customerSale.id,
    lines: [
      {
        lineKey: "line1",
        allocations: [{ commitmentId: committed.id, units: 1 }],
      },
    ],
    effectiveDate: date(),
  });
  const before = await refreshProductionCosts(a, o.id);
  expect(before[0]).toMatchObject({ total: null, provisional: true });
  const cat = await db.financialCategory.create({
    data: { name: "Compra", kind: "EXPENSE" },
  });
  await confirmReceiptFinance(a, {
    ...meta(1),
    receiptId: r.id,
    total: "20.00",
    lines: [{ id: r.lines[0].id, value: "20.00" }],
    mode: "CREATE",
    categoryId: cat.id,
    installments: [{ number: 1, amount: "20.00", dueDate: date() }],
  });
  const after = await refreshProductionCosts(a, o.id);
  expect(after[0]).toMatchObject({
    total: "10",
    unitCost: "5",
    provisional: false,
  });
  expect(after[0].revisionId).not.toBe(before[0].revisionId);
  expect(after[0].origins).toEqual([
    expect.objectContaining({
      units: 2,
      value: "10",
      allocations: [
        expect.objectContaining({ kind: "DELIVERED", units: 1, value: "5" }),
        expect.objectContaining({ kind: "RESERVED", units: 1, value: "5" }),
      ],
    }),
  ]);
  await refreshProductionCosts(a, o.id);
  expect(await db.productionCostRevision.count()).toBe(2);
  expect(await db.stockMovement.count()).toBe(3);
  expect(await db.cashMovement.count()).toBe(0);
  const { releaseFinished } = await import("@/server/production/fulfillment");
  const { adjustFinishedStock } =
    await import("@/server/production/finished-stock");
  const live = await db.finishedStock.findUniqueOrThrow({
    where: { id: st.id },
  });
  const released = await releaseFinished(a, {
    ...meta(live.version),
    commitmentId: committed.id,
    units: 1,
    reason: "Conferência física",
  });
  await adjustFinishedStock(a, {
    ...meta(released.version),
    stockId: st.id,
    deltaUnits: -1,
    effectiveDate: date(),
    reason: "Peça faltante",
  });
  const revised = (await refreshProductionCosts(a, o.id))[0];
  expect(revised.origins?.[0].allocations).toEqual([
    expect.objectContaining({ kind: "DELIVERED", value: "5" }),
    expect.objectContaining({ kind: "ADJUSTMENT_OUT", value: "5" }),
  ]);
  const op = await seedUser("OPERATOR", "op@example.test");
  await expect(refreshProductionCosts(op, o.id)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
