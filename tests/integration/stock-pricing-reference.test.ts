import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { applyStockReference } from "@/server/stock/pricing-reference";
setupDatabase();
it("applies stock reference explicitly with unit conversion and preserves prior price until commanded", async () => {
  const actor = await seedUser();
  const material = await db.material.create({
    data: { name: "PLA", technology: "FDM", price: "80" },
  });
  const item = await saveStockItem(actor, {
    name: "PLA",
    materialId: material.id,
    unit: "G",
    method: "WEIGHTED_AVERAGE",
    expectedVersion: 0,
    operationKey: randomUUID(),
  });
  await openInventory(actor, {
    itemId: item.id,
    quantity: "1000",
    value: "120",
    effectiveDate: todaySaoPaulo(new Date()),
    expectedVersion: 1,
    operationKey: randomUUID(),
  });
  expect(
    (
      await db.material.findUniqueOrThrow({ where: { id: material.id } })
    ).price.toFixed(),
  ).toBe("80");
  const input = {
    itemId: item.id,
    expectedVersion: 2,
    catalogVersion: 1,
    reason: "Atualizar referência",
    operationKey: randomUUID(),
  };
  const result = await applyStockReference(actor, input);
  expect(result.previous).toBe("80");
  expect(result.current).toBe("120");
  await applyStockReference(actor, input);
  expect(
    (await db.material.findUniqueOrThrow({ where: { id: material.id } }))
      .version,
  ).toBe(2);
  const op = await seedUser("OPERATOR", "op@example.test");
  await expect(applyStockReference(op, input)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
