import { todaySaoPaulo } from "@/domain/commerce/dates";
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
    effectiveDate: todaySaoPaulo(new Date()),
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
    effectiveDate: todaySaoPaulo(new Date()),
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
    effectiveDate: todaySaoPaulo(new Date()),
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

import { saveStockIdentity } from "@/server/stock/catalog";
it("identified deficit requires justification even when total stock is positive", async () => {
  const { actor, item } = await fixture();
  const identity = await saveStockIdentity(actor, {
    itemId: item.id,
    label: "Rolo A",
    expectedVersion: 2,
    operationKey: randomUUID(),
  });
  const input = {
    itemId: item.id,
    kind: "CONSUMPTION",
    quantity: "10",
    allocations: [{ identityId: identity.id, quantity: "10" }],
    effectiveDate: todaySaoPaulo(new Date()),
    expectedVersion: 3,
    operationKey: randomUUID(),
  };
  await expect(recordMovement(actor, input)).rejects.toThrow();
  await recordMovement(actor, { ...input, reason: "Conferir peso do rolo" });
  expect(
    (
      await db.stockMovement.aggregate({ _sum: { quantity: true } })
    )._sum.quantity?.toFixed(),
  ).toBe("90");
});
it("serializes simultaneous withdrawals and identical receipt retries", async () => {
  const { actor, item } = await fixture();
  const input = {
    itemId: item.id,
    kind: "CONSUMPTION",
    quantity: "80",
    effectiveDate: todaySaoPaulo(new Date()),
    expectedVersion: 2,
    operationKey: randomUUID(),
  };
  const result = await Promise.allSettled([
    recordMovement(actor, input),
    recordMovement(actor, { ...input, operationKey: randomUUID() }),
  ]);
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const receipt = {
    supplier: "Fornecedor",
    effectiveDate: todaySaoPaulo(new Date()),
    expectedVersion: 0,
    operationKey: randomUUID(),
    lines: [{ itemId: item.id, quantity: "500" }],
  };
  const [a, b] = await Promise.all([
    receivePurchase(actor, receipt),
    receivePurchase(actor, receipt),
  ]);
  expect(a.id).toBe(b.id);
  expect(await db.purchaseReceipt.count()).toBe(1);
});
it("receives mixed allocations and rolls back a second invalid line", async () => {
  const { actor, item } = await fixture();
  const id = await saveStockIdentity(actor, {
    itemId: item.id,
    label: "Rolo A",
    expectedVersion: 2,
    operationKey: randomUUID(),
  });
  const input = {
    supplier: "Fornecedor",
    effectiveDate: todaySaoPaulo(new Date()),
    expectedVersion: 0,
    operationKey: randomUUID(),
    lines: [
      {
        itemId: item.id,
        quantity: "500",
        allocations: [
          { identityId: id.id, quantity: "300" },
          { identityId: null, quantity: "200" },
        ],
      },
    ],
  };
  await expect(
    receivePurchase(actor, {
      ...input,
      lines: [...input.lines, { itemId: "missing", quantity: "1" }],
    }),
  ).rejects.toThrow();
  expect(await db.purchaseReceipt.count()).toBe(0);
  await receivePurchase(actor, input);
  const rows = await db.stockMovementAllocation.groupBy({
    by: ["identityId"],
    _sum: { quantity: true },
  });
  expect(
    rows.find((r) => r.identityId === id.id)?._sum.quantity?.toFixed(),
  ).toBe("300");
  expect(
    rows.find((r) => r.identityId === null)?._sum.quantity?.toFixed(),
  ).toBe("300");
});
it("rejects future and unexplained past postings", async () => {
  const { actor, item } = await fixture();
  const v = {
    itemId: item.id,
    kind: "LOSS",
    quantity: "1",
    expectedVersion: 2,
    operationKey: randomUUID(),
  };
  await expect(
    recordMovement(actor, {
      ...v,
      effectiveDate: "2099-01-01",
      reason: "Ainda futura",
    }),
  ).rejects.toThrow();
  await expect(
    recordMovement(actor, { ...v, effectiveDate: "2020-01-01" }),
  ).rejects.toThrow();
  await recordMovement(actor, {
    ...v,
    effectiveDate: "2020-01-01",
    reason: "Registro retroativo",
  });
});
it("rejects unpriced weighted adjustment rather than creating an unresolvable cost", async () => {
  const { actor } = await fixture();
  const item = await saveStockItem(actor, {
    name: "Resina",
    unit: "ML",
    method: "WEIGHTED_AVERAGE",
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
  await expect(
    recordMovement(actor, {
      itemId: item.id,
      kind: "ADJUSTMENT_IN",
      quantity: "10",
      reason: "Contagem corrigida",
      effectiveDate: todaySaoPaulo(new Date()),
      expectedVersion: 2,
      operationKey: randomUUID(),
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await db.stockMovement.count({ where: { itemId: item.id } })).toBe(1);
});
import { vi } from "vitest";
it("replays a completed receipt after midnight before checking its effective date", async () => {
  const { actor, item } = await fixture();
  const current = new Date();
  const input = {
    supplier: "Fornecedor",
    effectiveDate: todaySaoPaulo(current),
    expectedVersion: 0,
    operationKey: randomUUID(),
    lines: [{ itemId: item.id, quantity: "10" }],
  };
  const first = await receivePurchase(actor, input);
  try {
    vi.setSystemTime(new Date(current.getTime() + 86400000));
    expect((await receivePurchase(actor, input)).id).toBe(first.id);
  } finally {
    vi.useRealTimers();
  }
  expect(await db.purchaseReceipt.count()).toBe(1);
});
