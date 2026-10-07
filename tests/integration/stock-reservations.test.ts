import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { reserveStock, consumeStock } from "@/server/stock/reservations";
import { balance } from "@/server/stock/movements";
import { receivePurchase } from "@/server/stock/receipts";
import { saveCustomer } from "@/server/customers";
import { saveSaleDraft, confirmSale, cancelSale } from "@/server/sales";
setupDatabase();
it("consuming a reservation does not deduct available stock twice and cancellation releases remainder", async () => {
  const actor = await seedUser();
  const item = await saveStockItem(actor, {
    name: "PLA",
    unit: "G",
    method: "MANUAL",
    manualUnitCost: "0.1",
    expectedVersion: 0,
    operationKey: randomUUID(),
  });
  await openInventory(actor, {
    itemId: item.id,
    quantity: "1000",
    effectiveDate: "2026-10-06",
    reason: "Contagem",
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const customer = await saveCustomer(actor, undefined, {
    name: "Cliente",
    type: "PERSON",
    active: true,
  });
  const lineId = randomUUID();
  const draft = await saveSaleDraft(actor, undefined, {
    customerId: customer.id,
    items: [{ lineId, description: "Peças", quantity: 1, unitPrice: "100" }],
    discount: "0",
    shipping: "0",
    paymentTerms: "Pix",
    internalNotes: "",
  });
  const sale = await confirmSale(
    actor,
    draft.id,
    draft.version,
    [{ number: 1, amount: "100", dueDate: "2026-10-06" }],
    randomUUID(),
  );
  const reservation = await reserveStock(actor, {
    itemId: item.id,
    saleId: sale.id,
    lineKey: lineId,
    quantity: "1200",
    expectedVersion: 2,
    reason: "Material em compra",
    operationKey: randomUUID(),
    effectiveDate: "2026-10-06",
  });
  expect((await db.$transaction((tx) => balance(tx, item.id))).available).toBe(
    "-200",
  );
  await consumeStock(actor, {
    reservationId: reservation.id,
    quantity: "300",
    expectedVersion: 1,
    operationKey: randomUUID(),
    effectiveDate: "2026-10-06",
  });
  expect(await db.$transaction((tx) => balance(tx, item.id))).toMatchObject({
    physical: "700",
    reserved: "900",
    available: "-200",
  });
  await receivePurchase(actor, {
    supplier: "Fornecedor",
    lines: [{ itemId: item.id, quantity: "500" }],
    expectedVersion: 0,
    operationKey: randomUUID(),
    effectiveDate: "2026-10-06",
  });
  expect((await db.$transaction((tx) => balance(tx, item.id))).available).toBe(
    "300",
  );
  await cancelSale(actor, sale.id, sale.version, "Cliente desistiu");
  expect(await db.$transaction((tx) => balance(tx, item.id))).toMatchObject({
    physical: "1200",
    reserved: "0",
    available: "1200",
  });
});
