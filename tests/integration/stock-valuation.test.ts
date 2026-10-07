import { todaySaoPaulo } from "@/domain/commerce/dates";
import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { revalueItem } from "@/server/stock/valuation";
setupDatabase();
it("persists valuation once for unchanged facts and keeps prior revisions", async () => {
  const actor = await seedUser();
  const item = await saveStockItem(actor, {
    name: "PLA",
    unit: "G",
    method: "WEIGHTED_AVERAGE",
    operationKey: randomUUID(),
    expectedVersion: 0,
  });
  await openInventory(actor, {
    itemId: item.id,
    quantity: "1000",
    value: "100",
    effectiveDate: todaySaoPaulo(new Date()),
    reason: "Contagem",
    operationKey: randomUUID(),
    expectedVersion: 1,
  });
  await db.$transaction((tx) => revalueItem(tx, item.id));
  await db.$transaction((tx) => revalueItem(tx, item.id));
  expect(await db.stockValuationRevision.count()).toBe(1);
  const r = await db.stockValuationRevision.findFirstOrThrow();
  expect(r.result).toMatchObject({
    physical: "1000",
    knownValue: "100",
    provisional: false,
  });
});
