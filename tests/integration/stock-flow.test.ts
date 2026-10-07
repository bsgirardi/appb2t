import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { reserveStock, consumeStock } from "@/server/stock/reservations";
import { balance } from "@/server/stock/movements";
import { receivePurchase } from "@/server/stock/receipts";
import { confirmReceiptFinance } from "@/server/stock/purchase-finance";
import { cancelReceipt } from "@/server/stock/corrections";
import { readValuation } from "@/server/stock/valuation";
import { saveCustomer } from "@/server/customers";
import { saveSaleDraft, confirmSale, cancelSale } from "@/server/sales";
import { saveAccount } from "@/server/finance/accounts";
import { settleEntry } from "@/server/finance/settlements";
import { splitInstallments } from "@/domain/commerce/installments";
setupDatabase();
it("integrated acceptance keeps purchase, reservation, consumption and payment distinct", async () => {
  const admin = await seedUser(),
    op = await seedUser("OPERATOR", "op@example.test"),
    date = todaySaoPaulo(new Date());
  const item = await saveStockItem(admin, {
    name: "PLA",
    unit: "G",
    method: "WEIGHTED_AVERAGE",
    expectedVersion: 0,
    operationKey: randomUUID(),
  });
  await openInventory(admin, {
    itemId: item.id,
    quantity: "1000",
    value: "100",
    effectiveDate: date,
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const customer = await saveCustomer(admin, undefined, {
      name: "Cliente",
      type: "PERSON",
      active: true,
    }),
    lineId = randomUUID();
  const draft = await saveSaleDraft(admin, undefined, {
    customerId: customer.id,
    items: [{ lineId, description: "Peças", quantity: 1, unitPrice: "200" }],
    discount: "0",
    shipping: "0",
    paymentTerms: "Pix",
    internalNotes: "",
  });
  const sale = await confirmSale(
    admin,
    draft.id,
    draft.version,
    [{ number: 1, amount: "200", dueDate: date }],
    randomUUID(),
  );
  const reservation = await reserveStock(op, {
    itemId: item.id,
    saleId: sale.id,
    lineKey: lineId,
    quantity: "1200",
    reason: "Compra em andamento",
    effectiveDate: date,
    expectedVersion: 2,
    operationKey: randomUUID(),
  });
  await consumeStock(op, {
    reservationId: reservation.id,
    quantity: "300",
    effectiveDate: date,
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const receipt = await receivePurchase(op, {
    supplier: "Fornecedor",
    lines: [{ itemId: item.id, quantity: "500" }],
    effectiveDate: date,
    expectedVersion: 0,
    operationKey: randomUUID(),
  });
  expect(await db.$transaction((tx) => balance(tx, item.id))).toMatchObject({
    physical: "1200",
    reserved: "900",
    available: "300",
  });
  expect(
    (await db.$transaction((tx) => readValuation(tx, item.id))).provisional,
  ).toBe(true);
  const category = await db.financialCategory.create({
    data: { name: "Material", kind: "EXPENSE" },
  });
  const confirmed = await confirmReceiptFinance(admin, {
    receiptId: receipt.id,
    expectedVersion: 1,
    operationKey: randomUUID(),
    mode: "CREATE",
    categoryId: category.id,
    total: "75",
    lines: [{ id: receipt.lines[0].id, value: "75" }],
    installments: splitInstallments("75", 3, date),
  });
  expect(
    await db.$transaction((tx) => readValuation(tx, item.id)),
  ).toMatchObject({ knownValue: "145", provisional: false });
  expect(await db.cashMovement.count()).toBe(0);
  const account = await saveAccount(admin, undefined, {
    name: "Banco",
    type: "BANK",
    openingBalance: "100",
    openingDate: date,
    active: true,
  });
  await settleEntry(admin, {
    entryId: confirmed.entryIds[0],
    accountId: account.id,
    amount: "10",
    effectiveDate: date,
    method: "PIX",
    notes: "Parcial",
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  expect(await db.cashMovement.count()).toBe(1);
  expect(await db.receiptFinancialLink.count()).toBe(3);
  await expect(
    cancelReceipt(admin, {
      receiptId: receipt.id,
      expectedVersion: 2,
      reason: "Tentar cancelar pago",
      operationKey: randomUUID(),
    }),
  ).rejects.toThrow(/baixas/);
  expect(await db.stockMovement.count()).toBe(3);
  await cancelSale(admin, sale.id, sale.version, "Cliente cancelou");
  expect(await db.$transaction((tx) => balance(tx, item.id))).toMatchObject({
    physical: "1200",
    reserved: "0",
    available: "1200",
  });
});
