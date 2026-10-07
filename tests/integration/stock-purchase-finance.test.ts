import { todaySaoPaulo } from "@/domain/commerce/dates";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { receivePurchase } from "@/server/stock/receipts";
import { confirmReceiptFinance } from "@/server/stock/purchase-finance";
import { splitInstallments } from "@/domain/commerce/installments";
import { cancelEntry } from "@/server/finance/entries";
setupDatabase();
it("confirms received stock once, creates payables without payment and protects their origin", async () => {
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
    quantity: "0",
    effectiveDate: todaySaoPaulo(new Date()),
    reason: "Contagem",
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const receipt = await receivePurchase(actor, {
    supplier: "Fornecedor",
    lines: [{ itemId: item.id, quantity: "1000" }],
    expectedVersion: 0,
    operationKey: randomUUID(),
    effectiveDate: todaySaoPaulo(new Date()),
  });
  const cat = await db.financialCategory.create({
    data: { name: "Materiais", kind: "EXPENSE" },
  });
  const input = {
    receiptId: receipt.id,
    expectedVersion: 1,
    operationKey: randomUUID(),
    total: "100.00",
    lines: [{ id: receipt.lines[0].id, value: "100.00" }],
    mode: "CREATE",
    categoryId: cat.id,
    installments: splitInstallments("100", 3, todaySaoPaulo(new Date())),
  };
  await confirmReceiptFinance(actor, input);
  await confirmReceiptFinance(actor, input);
  expect(
    (await db.financialEntry.findMany({ orderBy: { dueDate: "asc" } })).map(
      (x) => x.amount.toFixed(2),
    ),
  ).toEqual(["33.34", "33.33", "33.33"]);
  expect(await db.cashMovement.count()).toBe(0);
  expect(await db.stockMovement.count()).toBe(2);
  const entry = await db.financialEntry.findFirstOrThrow();
  await expect(
    cancelEntry(actor, entry.id, entry.version, "Cancelar avulso"),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const op = await seedUser("OPERATOR", "op@example.test");
  await expect(confirmReceiptFinance(op, input)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
import { createEntryGroup } from "@/server/finance/entries";
it("links an entire payable group only once under competing receipts", async () => {
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
  const receive = () =>
    receivePurchase(actor, {
      supplier: "Fornecedor",
      effectiveDate: todaySaoPaulo(new Date()),
      expectedVersion: 0,
      operationKey: randomUUID(),
      lines: [{ itemId: item.id, quantity: "100" }],
    });
  const a = await receive(),
    b = await receive();
  const cat = await db.financialCategory.create({
    data: { name: "Materiais", kind: "EXPENSE" },
  });
  const group = await createEntryGroup(
    actor,
    {
      kind: "PAYABLE",
      description: "Compra",
      counterparty: "Fornecedor",
      categoryId: cat.id,
      amount: "10",
      dueDate: todaySaoPaulo(new Date()),
    },
    splitInstallments("10", 2, todaySaoPaulo(new Date())),
    randomUUID(),
  );
  const ids = group.map((e) => e.id);
  const cmd = (r: typeof a) => ({
    receiptId: r.id,
    expectedVersion: 1,
    operationKey: randomUUID(),
    mode: "LINK",
    total: "10",
    lines: [{ id: r.lines[0].id, value: "10" }],
    entryIds: ids,
  });
  await expect(
    confirmReceiptFinance(actor, {
      ...cmd(a),
      total: "5",
      lines: [{ id: a.lines[0].id, value: "5" }],
      entryIds: [ids[0]],
    }),
  ).rejects.toThrow();
  const result = await Promise.allSettled([
    confirmReceiptFinance(actor, cmd(a)),
    confirmReceiptFinance(actor, cmd(b)),
  ]);
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await db.receiptFinancialLink.count()).toBe(2);
  expect(await db.cashMovement.count()).toBe(0);
});
import { createEntry } from "@/server/finance/entries";
import { saveAccount } from "@/server/finance/accounts";
import { settleEntry } from "@/server/finance/settlements";
it("links an already paid purchase without repeating cash movement", async () => {
  const actor = await seedUser();
  const date = todaySaoPaulo(new Date());
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
    effectiveDate: date,
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const receipt = await receivePurchase(actor, {
    supplier: "Fornecedor",
    effectiveDate: date,
    expectedVersion: 0,
    operationKey: randomUUID(),
    lines: [{ itemId: item.id, quantity: "100" }],
  });
  const category = await db.financialCategory.create({
    data: { name: "Compras", kind: "EXPENSE" },
  });
  const entry = await createEntry(actor, {
    kind: "PAYABLE",
    description: "Compra paga",
    counterparty: "Fornecedor",
    categoryId: category.id,
    amount: "10",
    dueDate: date,
  });
  const account = await saveAccount(actor, undefined, {
    name: "Banco",
    type: "BANK",
    openingBalance: "50",
    openingDate: date,
    active: true,
  });
  await settleEntry(actor, {
    entryId: entry.id,
    accountId: account.id,
    amount: "10",
    effectiveDate: date,
    method: "PIX",
    notes: "Pago",
    expectedVersion: entry.version,
    operationKey: randomUUID(),
  });
  await confirmReceiptFinance(actor, {
    receiptId: receipt.id,
    expectedVersion: 1,
    operationKey: randomUUID(),
    mode: "LINK",
    total: "10",
    lines: [{ id: receipt.lines[0].id, value: "10" }],
    entryIds: [entry.id],
  });
  expect(await db.cashMovement.count()).toBe(1);
  expect(await db.financialEntry.count()).toBe(1);
});
