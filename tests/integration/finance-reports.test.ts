import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { saveAccount, recordAdjustment } from "@/server/finance/accounts";
import { saveCategory } from "@/server/finance/categories";
import { createEntry } from "@/server/finance/entries";
import { settleEntry, reverseSettlement } from "@/server/finance/settlements";
import { transferFunds } from "@/server/finance/transfers";
import {
  getFinanceDashboard,
  getCashFlow,
  listMovements,
  exportFinanceCsv,
} from "@/server/finance/reports";
setupDatabase();
it("preserves dated receipts/reversals and projects only remaining overdue amounts", async () => {
  const actor = await seedUser();
  const account = await saveAccount(actor, undefined, {
    name: "Conta relatório",
    type: "BANK",
    openingBalance: "100",
    openingDate: "2026-01-01",
    active: true,
  });
  const revenue = await saveCategory(actor, undefined, {
    name: "Receita teste",
    kind: "REVENUE",
    active: true,
  });
  const expense = await saveCategory(actor, undefined, {
    name: "Despesa teste",
    kind: "EXPENSE",
    active: true,
  });
  const entry = await createEntry(actor, {
    kind: "RECEIVABLE",
    description: "Recebível teste",
    counterparty: "Cliente",
    categoryId: revenue.id,
    amount: "80",
    dueDate: "2026-01-02",
  });
  await createEntry(actor, {
    kind: "PAYABLE",
    description: "Pagável teste",
    counterparty: "Fornecedor",
    categoryId: expense.id,
    amount: "20",
    dueDate: "2026-01-02",
  });
  const settlement = await settleEntry(actor, {
    entryId: entry.id,
    accountId: account.id,
    amount: "30",
    effectiveDate: "2026-01-03",
    method: "PIX",
    expectedVersion: entry.version,
    operationKey: "report-settlement-key",
  });
  expect(await getFinanceDashboard(actor)).toMatchObject({
    balance: "130.00",
    receivablePending: "50.00",
    payablePending: "20.00",
    realizedIn: "30.00",
  });
  const projection = await getCashFlow(actor);
  expect(projection.overdueNet).toBe("30.00");
  expect(projection.projected[0].closingBalance).toBe("160.00");
  await reverseSettlement(actor, settlement.id, {
    reason: "Baixa incorreta",
    effectiveDate: "2026-01-04",
    operationKey: "report-reversal-key",
  });
  const flow = await getCashFlow(actor, {
    dateFrom: "2025-12-31",
    dateTo: "2026-01-04",
  });
  expect(
    flow.realized.find((d) => d.date === "2025-12-31")?.closingBalance,
  ).toBeNull();
  expect(flow.realized.find((d) => d.date === "2026-01-03")).toMatchObject({
    incoming: "30.00",
    closingBalance: "130.00",
  });
  expect(flow.realized.find((d) => d.date === "2026-01-04")).toMatchObject({
    incoming: "-30.00",
    closingBalance: "100.00",
  });
});
it("totals all filtered rows, exports safely and keeps inactive account history", async () => {
  const actor = await seedUser();
  const a = await saveAccount(actor, undefined, {
    name: "Conta A",
    type: "CASH",
    openingBalance: "-26",
    openingDate: "2026-01-01",
    active: true,
  });
  let version = a.version;
  for (let i = 0; i < 26; i++) {
    await recordAdjustment(actor, {
      accountId: a.id,
      amount: "1",
      effectiveDate: "2026-01-02",
      reason: '  =Formula;"teste"',
      expectedVersion: version++,
      operationKey: `report-adjustment-${i}`,
    });
  }
  await saveAccount(actor, a.id, {
    name: a.name,
    type: a.type,
    openingBalance: a.openingBalance,
    openingDate: a.openingDate,
    active: false,
    expectedVersion: version,
  });
  const page = await listMovements(actor, { accountId: a.id });
  expect(page.items).toHaveLength(25);
  expect(page.total).toBe(26);
  expect(page.totals).toMatchObject({
    adjustmentsNet: "26.00",
    incoming: "0.00",
    outgoing: "0.00",
  });
  const csv = await exportFinanceCsv(actor, { accountId: a.id });
  expect(csv.match(/1,00/g)).toHaveLength(26);
  expect(csv).toContain('"\'=Formula;""teste"""');
  expect(
    await exportFinanceCsv(actor, { dateFrom: "2026-02-01" }),
  ).not.toContain("1,00");
});
it("excludes transfers from operating totals and limits exports without truncation", async () => {
  const actor = await seedUser();
  const input = {
    type: "BANK",
    openingBalance: "100",
    openingDate: "2026-01-01",
    active: true,
  };
  const a = await saveAccount(actor, undefined, { ...input, name: "Conta A" }),
    b = await saveAccount(actor, undefined, { ...input, name: "Conta B" });
  await transferFunds(actor, {
    fromAccountId: a.id,
    toAccountId: b.id,
    amount: "25",
    effectiveDate: "2026-01-02",
    description: "Transferência",
    operationKey: "report-transfer-key",
  });
  expect((await listMovements(actor)).totals).toMatchObject({
    incoming: "0.00",
    outgoing: "0.00",
    transfersNet: "0.00",
  });
  expect(
    (await listMovements(actor, { accountId: a.id })).totals.transfersNet,
  ).toBe("-25.00");
  await db.cashMovement.createMany({
    data: Array.from({ length: 10001 }, (_, i) => ({
      accountId: a.id,
      amount: "1.00",
      effectiveDate: new Date("2026-01-03"),
      kind: "ADJUSTMENT" as const,
      description: `Fixture ${i}`,
      actorId: actor.id,
      actorName: actor.name,
    })),
  });
  await expect(exportFinanceCsv(actor)).rejects.toMatchObject({
    code: "VALIDATION",
  });
});
