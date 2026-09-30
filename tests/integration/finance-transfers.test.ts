import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import {
  saveAccount,
  listAccounts,
  recordAdjustment,
} from "@/server/finance/accounts";
import {
  transferFunds,
  reverseTransfer,
  reverseAdjustment,
} from "@/server/finance/transfers";
setupDatabase();
async function fixture() {
  const actor = await seedUser();
  const accounts = [];
  for (const [name, openingBalance] of [
    ["Conta A", "100"],
    ["Conta B", "50"],
  ])
    accounts.push(
      await saveAccount(actor, undefined, {
        name,
        openingBalance,
        type: "BANK",
        openingDate: "2026-01-01",
        active: true,
      }),
    );
  return {
    actor,
    accounts,
    input: {
      fromAccountId: accounts[0].id,
      toAccountId: accounts[1].id,
      amount: "25",
      effectiveDate: "2026-01-02",
      description: "Transferência interna",
      operationKey: "transfer-test-key",
    },
  };
}
it("transfers and reverses both legs atomically with replay", async () => {
  const { actor, input } = await fixture();
  const transfer = await transferFunds(actor, input);
  expect((await transferFunds(actor, input)).id).toBe(transfer.id);
  expect((await listAccounts(actor)).map((a) => a.balance)).toEqual([
    "75.00",
    "75.00",
  ]);
  await expect(
    reverseAdjustment(actor, transfer.movements[0].id, {
      reason: "Uma perna",
      effectiveDate: "2026-01-03",
      operationKey: "invalid-reverse-key",
    }),
  ).rejects.toThrow();
  const reversal = {
    reason: "Transferência incorreta",
    effectiveDate: "2026-01-03",
    operationKey: "reverse-transfer-key",
  };
  expect((await reverseTransfer(actor, transfer.id, reversal)).reversed).toBe(
    true,
  );
  await reverseTransfer(actor, transfer.id, reversal);
  expect((await listAccounts(actor)).map((a) => a.balance)).toEqual([
    "100.00",
    "50.00",
  ]);
  expect(await db.cashMovement.count()).toBe(4);
  await expect(
    reverseTransfer(actor, transfer.id, {
      ...reversal,
      operationKey: "second-reversal-key",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("rolls back first leg when the second fails and rejects invalid accounts/dates", async () => {
  const { actor, input } = await fixture();
  await expect(
    transferFunds(actor, { ...input, toAccountId: input.fromAccountId }),
  ).rejects.toThrow();
  await expect(
    transferFunds(actor, { ...input, effectiveDate: "2025-12-31" }),
  ).rejects.toThrow();
  await db.$executeRawUnsafe(
    'ALTER TABLE "CashMovement" ADD CONSTRAINT "test_transfer_failure" CHECK (amount < 0)',
  );
  try {
    await expect(transferFunds(actor, input)).rejects.toThrow(
      /test_transfer_failure/,
    );
    expect(await db.cashMovement.count()).toBe(0);
    expect(await db.financialTransfer.count()).toBe(0);
    expect(await db.financeCommand.count()).toBe(0);
  } finally {
    await db.$executeRawUnsafe(
      'ALTER TABLE "CashMovement" DROP CONSTRAINT "test_transfer_failure"',
    );
  }
});
it("allows negative balances and reverses adjustments once without modifying original", async () => {
  const { actor, accounts, input } = await fixture();
  await transferFunds(actor, { ...input, amount: "125" });
  expect((await listAccounts(actor))[0].negative).toBe(true);
  const a = (await listAccounts(actor))[0];
  const adjustment = await recordAdjustment(actor, {
    accountId: accounts[0].id,
    amount: "10",
    effectiveDate: "2026-01-03",
    reason: "Correção de saldo",
    expectedVersion: a.version,
    operationKey: "adjustment-test-key",
  });
  const original = await db.cashMovement.findUniqueOrThrow({
    where: { id: adjustment.id },
  });
  await reverseAdjustment(actor, adjustment.id, {
    reason: "Correção indevida",
    effectiveDate: "2026-01-04",
    operationKey: "reverse-adjustment-key",
  });
  expect(
    await db.cashMovement.findUnique({ where: { id: adjustment.id } }),
  ).toEqual(original);
  expect((await listAccounts(actor))[0].balance).toBe("-25.00");
});
