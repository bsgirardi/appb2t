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
    effectiveDate: "2026-10-06",
    reason: "Contagem",
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const receipt = await receivePurchase(actor, {
    supplier: "Fornecedor",
    lines: [{ itemId: item.id, quantity: "1000" }],
    expectedVersion: 0,
    operationKey: randomUUID(),
    effectiveDate: "2026-10-06",
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
    installments: splitInstallments("100", 3, "2026-10-06"),
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
