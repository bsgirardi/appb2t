import { todaySaoPaulo } from "@/domain/commerce/dates";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { recordMovement, balance } from "@/server/stock/movements";
import { correctStock } from "@/server/stock/corrections";
setupDatabase();
it("returns consumed quantity with its source and rejects cumulative excess", async () => {
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
    quantity: "100",
    effectiveDate: todaySaoPaulo(new Date()),
    reason: "Contagem",
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const consumption = await recordMovement(actor, {
    itemId: item.id,
    kind: "CONSUMPTION",
    quantity: "60",
    effectiveDate: todaySaoPaulo(new Date()),
    expectedVersion: 2,
    operationKey: randomUUID(),
  });
  const input = {
    sourceId: consumption.id,
    kind: "RETURN_CONSUMPTION",
    quantity: "40",
    effectiveDate: todaySaoPaulo(new Date()),
    reason: "Material não utilizado",
    expectedVersion: 3,
    operationKey: randomUUID(),
  };
  await correctStock(actor, input);
  expect((await db.$transaction((tx) => balance(tx, item.id))).physical).toBe(
    "80",
  );
  await expect(
    correctStock(actor, {
      ...input,
      quantity: "30",
      expectedVersion: 4,
      operationKey: randomUUID(),
    }),
  ).rejects.toThrow();
  expect(await db.stockMovement.count()).toBe(3);
  expect(await db.financialEntry.count()).toBe(0);
});

import { cancelReceipt } from "@/server/stock/corrections";
import { receivePurchase } from "@/server/stock/receipts";
import { readValuation } from "@/server/stock/valuation";
it("cancels unused pending receipt by compensation without leaving unknown valuation", async () => {
  const actor = await seedUser();
  const item = await saveStockItem(actor, {
    name: "PLA",
    unit: "G",
    method: "WEIGHTED_AVERAGE",
    expectedVersion: 0,
    operationKey: randomUUID(),
  });
  await openInventory(actor, {
    itemId: item.id,
    quantity: "100",
    value: "10",
    effectiveDate: todaySaoPaulo(new Date()),
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const r = await receivePurchase(actor, {
    supplier: "Fornecedor",
    lines: [{ itemId: item.id, quantity: "50" }],
    effectiveDate: todaySaoPaulo(new Date()),
    expectedVersion: 0,
    operationKey: randomUUID(),
  });
  const input = {
    receiptId: r.id,
    expectedVersion: 1,
    reason: "Recebimento duplicado",
    operationKey: randomUUID(),
  };
  await cancelReceipt(actor, input);
  await cancelReceipt(actor, input);
  expect((await db.$transaction((tx) => balance(tx, item.id))).physical).toBe(
    "100",
  );
  expect(
    await db.$transaction((tx) => readValuation(tx, item.id)),
  ).toMatchObject({ physical: "100", knownValue: "10", provisional: false });
  expect(await db.stockMovement.count()).toBe(3);
});
import { resolveReturnFinance } from "@/server/stock/corrections";
import { confirmReceiptFinance } from "@/server/stock/purchase-finance";
it("supplier return keeps debt until admin explicitly reduces the unpaid principal", async () => {
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
    quantity: "0",
    effectiveDate: todaySaoPaulo(new Date()),
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const r = await receivePurchase(actor, {
    supplier: "Fornecedor",
    lines: [{ itemId: item.id, quantity: "100" }],
    effectiveDate: todaySaoPaulo(new Date()),
    expectedVersion: 0,
    operationKey: randomUUID(),
  });
  const cat = await db.financialCategory.create({
    data: { name: "Materiais", kind: "EXPENSE" },
  });
  const confirmed = await confirmReceiptFinance(actor, {
    receiptId: r.id,
    expectedVersion: 1,
    operationKey: randomUUID(),
    mode: "CREATE",
    total: "10",
    categoryId: cat.id,
    lines: [{ id: r.lines[0].id, value: "10" }],
    installments: [
      { number: 1, amount: "10", dueDate: todaySaoPaulo(new Date()) },
    ],
  });
  const source = await db.stockMovement.findFirstOrThrow({
    where: { kind: "RECEIPT" },
  });
  const movement = await correctStock(actor, {
    sourceId: source.id,
    kind: "RETURN_SUPPLIER",
    quantity: "20",
    effectiveDate: todaySaoPaulo(new Date()),
    reason: "Devolução ao fornecedor",
    expectedVersion: 4,
    operationKey: randomUUID(),
  });
  expect(
    (
      await db.financialEntry.findUniqueOrThrow({
        where: { id: confirmed.entryIds[0] },
      })
    ).amount.toFixed(),
  ).toBe("10");
  await resolveReturnFinance(actor, {
    movementId: movement.id,
    expectedVersion: 3,
    operationKey: randomUUID(),
    mode: "REDUCE",
    reason: "Crédito concedido pelo fornecedor",
    entries: [{ id: confirmed.entryIds[0], amount: "8" }],
  });
  expect(
    (
      await db.financialEntry.findUniqueOrThrow({
        where: { id: confirmed.entryIds[0] },
      })
    ).amount.toFixed(),
  ).toBe("8");
  expect(await db.cashMovement.count()).toBe(0);
});
