import { todaySaoPaulo } from "@/domain/commerce/dates";
import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { setupDatabase, seedUser } from "./setup";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { listStock, getStock } from "@/server/stock/queries";
setupDatabase();
it("shows counted quantity to operators without administrative cost data", async () => {
  const admin = await seedUser();
  const op = await seedUser("OPERATOR", "op@example.test");
  const item = await saveStockItem(admin, {
    name: "PLA",
    unit: "G",
    method: "MANUAL",
    manualUnitCost: "0.1",
    expectedVersion: 0,
    operationKey: randomUUID(),
  });
  await openInventory(admin, {
    itemId: item.id,
    quantity: "1000",
    effectiveDate: todaySaoPaulo(new Date()),
    reason: "Contagem",
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const list = await listStock(op, {});
  expect(list.total).toBe(1);
  expect(list.items[0]).toMatchObject({ physical: "1000", available: "1000" });
  expect(JSON.stringify(await getStock(op, item.id))).not.toMatch(
    /manualUnitCost|confirmedValue|knownValue/,
  );
  expect(await getStock(admin, item.id)).toMatchObject({
    manualUnitCost: "0.1",
    valuation: { knownValue: "100" },
  });
});

it("parses false as an inactive shortage filter", async () => {
  const admin = await seedUser();
  await saveStockItem(admin, {
    name: "Item não contado",
    unit: "UNIT",
    method: "MANUAL",
    manualUnitCost: "1",
    expectedVersion: 0,
    operationKey: randomUUID(),
  });
  expect((await listStock(admin, { negative: "false" })).total).toBe(1);
});
