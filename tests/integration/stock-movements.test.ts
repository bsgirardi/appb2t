import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { recordMovement } from "@/server/stock/movements";
import { receivePurchase } from "@/server/stock/receipts";
setupDatabase();
async function fixture() {
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
    effectiveDate: "2026-10-06",
    reason: "Contagem",
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  return { actor, item };
}
it("operator must justify a deficit and cannot create financial movements", async () => {
  const { item } = await fixture();
  const op = await seedUser("OPERATOR", "op@example.test");
  const input = {
    itemId: item.id,
    kind: "CONSUMPTION",
    quantity: "150",
    effectiveDate: "2026-10-06",
    expectedVersion: 2,
    operationKey: randomUUID(),
  };
  await expect(recordMovement(op, input)).rejects.toThrow();
  await recordMovement(op, { ...input, reason: "Reposição em compra" });
  expect(
    (
      await db.stockMovement.aggregate({ _sum: { quantity: true } })
    )._sum.quantity?.toFixed(),
  ).toBe("-50");
  expect(await db.financialEntry.count()).toBe(0);
});
it("receives once and refuses inconsistent allocations atomically", async () => {
  const { item } = await fixture();
  const op = await seedUser("OPERATOR", "op@example.test");
  const input = {
    supplier: "Fornecedor",
    effectiveDate: "2026-10-06",
    expectedVersion: 0,
    operationKey: randomUUID(),
    lines: [
      {
        itemId: item.id,
        quantity: "500",
        allocations: [{ identityId: null, quantity: "400" }],
      },
    ],
  };
  await expect(receivePurchase(op, input)).rejects.toThrow();
  expect(await db.purchaseReceipt.count()).toBe(0);
  input.lines[0].allocations[0].quantity = "500";
  const a = await receivePurchase(op, input),
    b = await receivePurchase(op, input);
  expect(a.id).toBe(b.id);
  expect(a.status).toBe("PENDING");
  expect(
    (
      await db.stockMovement.aggregate({ _sum: { quantity: true } })
    )._sum.quantity?.toFixed(),
  ).toBe("600");
  expect(await db.financialEntry.count()).toBe(0);
});
