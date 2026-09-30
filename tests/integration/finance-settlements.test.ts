import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { saveAccount, listAccounts } from "@/server/finance/accounts";
import { saveCategory } from "@/server/finance/categories";
import { createEntry, getEntry } from "@/server/finance/entries";
import { settleEntry, reverseSettlement } from "@/server/finance/settlements";
setupDatabase();
it("rejects inactive accounts, dates before opening, and reversals before payment", async () => {
  const { actor, a, input } = await fixture();
  await expect(settleEntry(actor, { ...input, effectiveDate: "2025-12-31" })).rejects.toMatchObject({ code: "VALIDATION" });
  const inactive = await saveAccount(actor, a.id, { name: a.name, type: a.type, openingBalance: a.openingBalance, openingDate: a.openingDate, active: false, expectedVersion: a.version });
  await expect(settleEntry(actor, input)).rejects.toMatchObject({ code: "VALIDATION" });
  await saveAccount(actor, a.id, { name: a.name, type: a.type, openingBalance: a.openingBalance, openingDate: a.openingDate, active: true, expectedVersion: inactive.version });
  const settlement = await settleEntry(actor, input);
  await expect(reverseSettlement(actor, settlement.id, { reason: "Data incorreta", effectiveDate: "2026-01-01", operationKey: "early-reversal-key" })).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await db.cashMovement.count()).toBe(1);
});
async function fixture(kind: "RECEIVABLE" | "PAYABLE" = "RECEIVABLE") {
  const actor = await seedUser(),
    a = await saveAccount(actor, undefined, {
      name: "Conta teste",
      type: "BANK",
      openingBalance: "0",
      openingDate: "2026-01-01",
      active: true,
    }),
    c = await saveCategory(actor, undefined, {
      name: "Categoria teste",
      kind: kind === "RECEIVABLE" ? "REVENUE" : "EXPENSE",
      active: true,
    }),
    e = await createEntry(actor, {
      kind,
      description: "Obrigação teste",
      counterparty: "Contraparte",
      categoryId: c.id,
      amount: "100.00",
      dueDate: "2026-01-02",
    });
  return {
    actor,
    a,
    e,
    input: {
      entryId: e.id,
      accountId: a.id,
      amount: "30.00",
      effectiveDate: "2026-01-02",
      method: "PIX",
      notes: "Baixa interna",
      expectedVersion: e.version,
      operationKey: "settlement-operation",
    },
  };
}
it.each(["RECEIVABLE", "PAYABLE"] as const)(
  "settles %s partially once and reverses without modifying original movement",
  async (kind) => {
    const { actor, a, e, input } = await fixture(kind);
    const settlement = await settleEntry(actor, input);
    expect((await settleEntry(actor, input)).id).toBe(settlement.id);
    expect((await getEntry(actor, e.id)).remainingAmount).toBe("70.00");
    expect((await listAccounts(actor))[0].balance).toBe(
      kind === "RECEIVABLE" ? "30.00" : "-30.00",
    );
    await expect(
      settleEntry(actor, { ...input, amount: "40.00" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const original = await db.cashMovement.findUniqueOrThrow({
      where: { settlementId: settlement.id },
    });
    const reversed = await reverseSettlement(actor, settlement.id, {
      reason: "Registro incorreto",
      effectiveDate: "2026-01-03",
      operationKey: "reverse-settlement-key",
    });
    expect(reversed.reversed).toBe(true);
    expect((await getEntry(actor, e.id)).remainingAmount).toBe("100.00");
    expect((await listAccounts(actor))[0].balance).toBe("0.00");
    expect(
      await db.cashMovement.findUnique({ where: { id: original.id } }),
    ).toEqual(original);
    expect(await db.cashMovement.count({ where: { accountId: a.id } })).toBe(2);
    expect(
      (
        await reverseSettlement(actor, settlement.id, {
          reason: "Registro incorreto",
          effectiveDate: "2026-01-03",
          operationKey: "reverse-settlement-key",
        })
      ).id,
    ).toBe(settlement.id);
    await expect(
      reverseSettlement(actor, settlement.id, {
        reason: "Repetição",
        effectiveDate: "2026-01-03",
        operationKey: "reverse-other-key",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  },
);
it("rejects future dates and rolls back failed movement insertion", async () => {
  const { actor, e, input } = await fixture();
  await expect(
    settleEntry(actor, { ...input, effectiveDate: "2099-01-01" }),
  ).rejects.toThrow();
  await db.$executeRawUnsafe(
    'ALTER TABLE "CashMovement" ADD CONSTRAINT "test_cash_failure" CHECK (amount < 1)',
  );
  try {
    await expect(settleEntry(actor, input)).rejects.toThrow(
      /test_cash_failure/,
    );
    expect(await db.settlement.count()).toBe(0);
    expect((await getEntry(actor, e.id)).remainingAmount).toBe("100.00");
    expect(await db.financeCommand.count()).toBe(0);
  } finally {
    await db.$executeRawUnsafe(
      'ALTER TABLE "CashMovement" DROP CONSTRAINT "test_cash_failure"',
    );
  }
});
