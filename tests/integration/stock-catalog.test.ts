import { todaySaoPaulo } from "@/domain/commerce/dates";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
setupDatabase();
const item = () => ({
  name: "PLA",
  unit: "G",
  method: "MANUAL",
  manualUnitCost: "0.1",
  operationKey: randomUUID(),
  expectedVersion: 0,
});
it("enables without inventing counted zero and opens only explicitly", async () => {
  const actor = await seedUser();
  const stock = await saveStockItem(actor, item());
  expect(stock.inventoriedAt).toBe(null);
  const opened = await openInventory(actor, {
    itemId: stock.id,
    quantity: "0",
    effectiveDate: todaySaoPaulo(new Date()),
    reason: "Contagem inicial",
    operationKey: randomUUID(),
    expectedVersion: stock.version,
  });
  expect(opened.inventoriedAt).not.toBe(null);
  expect(await db.stockMovement.count()).toBe(1);
});
it("requires admin and a known manual reference", async () => {
  const op = await seedUser("OPERATOR");
  await expect(saveStockItem(op, item())).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  const admin = await seedUser("ADMIN", "admin2@example.test");
  await expect(
    saveStockItem(admin, { ...item(), manualUnitCost: null }),
  ).rejects.toThrow();
  const free = await saveStockItem(admin, { ...item(), manualUnitCost: "0" });
  expect(free.manualUnitCost).toBe("0");
});
it("replays the same command once and rejects changed payload", async () => {
  const actor = await seedUser();
  const input = item();
  const a = await saveStockItem(actor, input);
  const b = await saveStockItem(actor, input);
  expect(a.id).toBe(b.id);
  expect(await db.stockItem.count()).toBe(1);
  await expect(
    saveStockItem(actor, { ...input, name: "Outro" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("requires opening value for positive weighted inventory and never opens twice", async () => {
  const actor = await seedUser();
  const stock = await saveStockItem(actor, {
    ...item(),
    method: "WEIGHTED_AVERAGE",
    manualUnitCost: null,
  });
  const input = {
    itemId: stock.id,
    quantity: "1000",
    effectiveDate: todaySaoPaulo(new Date()),
    reason: "Contagem inicial",
    expectedVersion: stock.version,
    operationKey: randomUUID(),
  };
  await expect(openInventory(actor, input)).rejects.toThrow();
  await openInventory(actor, { ...input, value: "100" });
  await expect(
    openInventory(actor, {
      ...input,
      value: "100",
      operationKey: randomUUID(),
      expectedVersion: 2,
    }),
  ).rejects.toThrow();
  expect(await db.stockMovement.count()).toBe(1);
});

it("records a reviewed method change and preserves quantity", async () => {
  const actor = await seedUser();
  const stock = await saveStockItem(actor, item());
  await openInventory(actor, {
    itemId: stock.id,
    quantity: "100",
    effectiveDate: todaySaoPaulo(new Date()),
    reason: "Contagem",
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  const changed = await saveStockItem(actor, {
    ...item(),
    id: stock.id,
    method: "WEIGHTED_AVERAGE",
    manualUnitCost: "0.2",
    expectedVersion: 2,
    reason: "Adotar custo médio",
  });
  expect(changed.method).toBe("WEIGHTED_AVERAGE");
  expect(
    (
      await db.stockMovement.aggregate({ _sum: { quantity: true } })
    )._sum.quantity?.toFixed(),
  ).toBe("100");
  expect(await db.stockMovement.count({ where: { kind: "REVALUE" } })).toBe(1);
});
import { saveMaterial } from "@/server/catalog-inputs";
it("prevents changing material technology after stock is linked", async () => {
  const actor = await seedUser();
  const m = await saveMaterial(actor, {
    name: "PLA real",
    technology: "FDM",
    price: "100",
    active: true,
  });
  await saveStockItem(actor, { ...item(), materialId: m.id });
  await expect(
    saveMaterial(actor, {
      id: m.id,
      name: m.name,
      price: "100",
      active: true,
      technology: "RESIN",
      expectedVersion: m.version,
    }),
  ).rejects.toThrow();
});
it("rejects duplicate material bindings with a clear validation error", async () => {
  const actor = await seedUser();
  const material = await db.material.create({
    data: { name: "PLA", technology: "FDM", price: "100" },
  });
  await saveStockItem(actor, { ...item(), materialId: material.id });
  await expect(
    saveStockItem(actor, { ...item(), materialId: material.id }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
});
