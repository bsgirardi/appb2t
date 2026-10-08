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
  await refreshProductionCosts(a, o.id);
  expect(await db.productionCostRevision.count()).toBe(2);
  expect(await db.stockMovement.count()).toBe(3);
  expect(await db.cashMovement.count()).toBe(0);
  const op = await seedUser("OPERATOR", "op@example.test");
  await expect(refreshProductionCosts(op, o.id)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
