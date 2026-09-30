import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import {
  saveAccount,
  listAccounts,
  getAccountBalance,
  recordAdjustment,
} from "@/server/finance/accounts";
import { saveCategory, listCategories } from "@/server/finance/categories";
setupDatabase();
const input = {
  name: "Caixa principal",
  type: "CASH",
  openingBalance: "100.00",
  openingDate: "2026-01-01",
  active: true,
};
it("tracks exact balances, immutable opening data after movements and idempotent adjustments", async () => {
  const actor = await seedUser();
  let a = await saveAccount(actor, undefined, input);
  const first = {
    accountId: a.id,
    amount: "25.50",
    effectiveDate: "2026-01-02",
    reason: "Conferência inicial",
    operationKey: "adjustment-first",
    expectedVersion: a.version,
  };
  const m = await recordAdjustment(actor, first);
  expect((await recordAdjustment(actor, first)).id).toBe(m.id);
  a = (await listAccounts(actor))[0];
  await recordAdjustment(actor, {
    ...first,
    amount: "-10.00",
    operationKey: "adjustment-second",
    expectedVersion: a.version,
  });
  a = (await listAccounts(actor))[0];
  expect(a.balance).toBe("115.50");
  expect(await getAccountBalance(db, a.id, "2025-12-31")).toBeNull();
  await expect(
    saveAccount(actor, a.id, {
      ...input,
      openingBalance: "200.00",
      expectedVersion: a.version,
    }),
  ).rejects.toThrow();
  await expect(
    saveAccount(actor, a.id, {
      ...input,
      active: false,
      expectedVersion: a.version,
    }),
  ).rejects.toThrow();
  await expect(
    recordAdjustment(actor, { ...first, amount: "99.00" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.cashMovement.count()).toBe(2);
});
it("rejects invalid adjustments and operator access, and preserves system categories", async () => {
  const actor = await seedUser(),
    operator = await seedUser("OPERATOR", "operator-finance@example.test"),
    a = await saveAccount(actor, undefined, {
      ...input,
      openingBalance: "-5.00",
    });
  expect(a.negative).toBe(true);
  for (const amount of ["0", "NaN", "10000000000000000.00"])
    await expect(
      recordAdjustment(actor, {
        accountId: a.id,
        amount,
        effectiveDate: "2026-01-02",
        reason: "Teste",
        operationKey: "invalid-adjust-key",
        expectedVersion: 1,
      }),
    ).rejects.toThrow();
  for (const effectiveDate of ["2025-12-31", "2099-01-01"])
    await expect(
      recordAdjustment(actor, {
        accountId: a.id,
        amount: "1",
        effectiveDate,
        reason: "Teste",
        operationKey: "invalid-date-key",
        expectedVersion: 1,
      }),
    ).rejects.toThrow();
  await expect(listAccounts(operator)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await expect(saveAccount(operator, undefined, input)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await expect(listCategories(operator)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  const system = (await listCategories(actor)).find(
    (c) => c.systemCode === "SALE_REVENUE",
  )!;
  expect(system).toBeDefined();
  await expect(
    saveCategory(actor, system.id, {
      name: system.name,
      kind: "EXPENSE",
      active: true,
      expectedVersion: system.version,
    }),
  ).rejects.toThrow();
  await expect(
    saveCategory(actor, system.id, {
      name: system.name,
      kind: "REVENUE",
      active: false,
      expectedVersion: system.version,
    }),
  ).rejects.toThrow();
});
it("serializes deactivation against adjustments", async () => {
  const actor = await seedUser(),
    a = await saveAccount(actor, undefined, {
      ...input,
      openingBalance: "0.00",
    });
  const outcomes = await Promise.allSettled([
    saveAccount(actor, a.id, {
      ...input,
      openingBalance: "0.00",
      active: false,
      expectedVersion: 1,
    }),
    recordAdjustment(actor, {
      accountId: a.id,
      amount: "10.00",
      effectiveDate: "2026-01-02",
      reason: "Correção",
      operationKey: "concurrent-adjust",
      expectedVersion: 1,
    }),
  ]);
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const final = (await listAccounts(actor))[0];
  expect(final.active || final.balance === "0.00").toBe(true);
});
