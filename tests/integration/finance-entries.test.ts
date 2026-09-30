import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { saveCategory } from "@/server/finance/categories";
import { saveAccount } from "@/server/finance/accounts";
import {
  createEntry,
  createEntryGroup,
  getEntry,
  updateEntry,
  cancelEntry,
  listEntries,
} from "@/server/finance/entries";
import { splitInstallments } from "@/domain/commerce/installments";
import { saveCustomer } from "@/server/customers";
import {
  saveSaleDraft,
  confirmSale,
  getSale,
  cancelSale,
} from "@/server/sales";
setupDatabase();
it("protects sale receivables and derives commercial receipts from unreversed settlements", async () => {
  const { actor, input } = await fixture();
  const customer = await saveCustomer(actor, undefined, {
    name: "Cliente venda financeira",
    type: "PERSON",
    active: true,
  });
  const draft = await saveSaleDraft(actor, undefined, {
    customerId: customer.id,
    items: [{ description: "Venda teste", quantity: 1, unitPrice: "100.00" }],
    discount: "0.00",
    shipping: "0.00",
    paymentTerms: "Pix",
    internalNotes: "",
  });
  const sale = await confirmSale(
    actor,
    draft.id,
    draft.version,
    [{ number: 1, amount: "100.00", dueDate: "2026-01-01" }],
    "finance-sale-confirm",
  );
  const entry = await db.financialEntry.findFirstOrThrow({
    where: { saleInstallment: { saleId: sale.id } },
  });
  await expect(
    updateEntry(actor, entry.id, { ...input, expectedVersion: entry.version }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const account = await saveAccount(actor, undefined, {
    name: "Caixa venda",
    type: "CASH",
    openingBalance: "0",
    openingDate: "2026-01-01",
    active: true,
  });
  const settlement = await db.settlement.create({
    data: {
      entryId: entry.id,
      accountId: account.id,
      amount: "30.00",
      method: "PIX",
      effectiveDate: new Date("2026-01-02T00:00:00Z"),
    },
  });
  const movement = await db.cashMovement.create({
    data: {
      accountId: account.id,
      amount: "30.00",
      effectiveDate: new Date("2026-01-02T00:00:00Z"),
      kind: "RECEIPT",
      description: "Recebimento",
      actorId: actor.id,
      actorName: actor.name,
      settlementId: settlement.id,
    },
  });
  expect((await getSale(actor, sale.id)).receiptSummary).toMatchObject({
    received: "30.00",
    pending: "70.00",
  });
  await expect(
    cancelSale(actor, sale.id, sale.version, "Desistência"),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await db.cashMovement.create({
    data: {
      accountId: account.id,
      amount: "-30.00",
      effectiveDate: new Date("2026-01-03T00:00:00Z"),
      kind: "REVERSAL",
      description: "Estorno",
      actorId: actor.id,
      actorName: actor.name,
      reversalOfId: movement.id,
    },
  });
  expect((await getSale(actor, sale.id)).receiptSummary.received).toBe("0.00");
  expect(
    (await cancelEntry(actor, entry.id, entry.version, "Venda cancelada"))
      .state,
  ).toBe("CANCELADO");
  expect((await getSale(actor, sale.id)).status).toBe("CANCELADA");
});
async function fixture() {
  const actor = await seedUser(),
    category = await saveCategory(actor, undefined, {
      name: "Serviços",
      kind: "REVENUE",
      active: true,
    });
  const input = {
    kind: "RECEIVABLE",
    description: "Serviço avulso",
    counterparty: "Cliente avulso",
    categoryId: category.id,
    amount: "100.00",
    dueDate: "2026-01-01",
  };
  return { actor, input };
}
it("creates exact idempotent groups and protects commercial origins", async () => {
  const { actor, input } = await fixture();
  const rows = splitInstallments("100.00", 3, "2026-01-31");
  const first = await createEntryGroup(actor, input, rows, "entry-group-key");
  const replay = await createEntryGroup(actor, input, rows, "entry-group-key");
  expect(replay.map((e) => e.id)).toEqual(first.map((e) => e.id));
  expect(first.map((e) => e.amount)).toEqual(["33.34", "33.33", "33.33"]);
  expect(new Set(first.map((e) => e.groupId)).size).toBe(1);
  expect((await listEntries(actor, {})).total).toBe(3);
  await expect(
    createEntry(actor, { ...input, kind: "PAYABLE" }),
  ).rejects.toThrow();
  await expect(
    updateEntry(actor, first[0].id, { ...input, expectedVersion: 99 }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const canceled = await cancelEntry(
    actor,
    first[0].id,
    first[0].version,
    "Lançamento incorreto",
  );
  expect(canceled.state).toBe("CANCELADO");
});
it("counts only settlements with original movements and blocks changing partially paid obligations", async () => {
  const { actor, input } = await fixture();
  const entry = await createEntry(actor, input);
  const a = await saveAccount(actor, undefined, {
    name: "Caixa teste",
    type: "CASH",
    openingBalance: "0",
    openingDate: "2026-01-01",
    active: true,
  });
  const settlement = await db.settlement.create({
    data: {
      entryId: entry.id,
      accountId: a.id,
      amount: "30.00",
      method: "PIX",
      effectiveDate: new Date("2026-01-02T00:00:00Z"),
    },
  });
  await db.cashMovement.create({
    data: {
      accountId: a.id,
      amount: "30.00",
      effectiveDate: new Date("2026-01-02T00:00:00Z"),
      kind: "RECEIPT",
      description: "Recebimento teste",
      actorId: actor.id,
      actorName: actor.name,
      settlementId: settlement.id,
    },
  });
  expect(await getEntry(actor, entry.id)).toMatchObject({
    paidAmount: "30.00",
    remainingAmount: "70.00",
    state: "PARCIAL",
    overdue: true,
  });
  await expect(
    updateEntry(actor, entry.id, {
      ...input,
      amount: "90.00",
      expectedVersion: entry.version,
    }),
  ).rejects.toThrow();
  await expect(
    cancelEntry(actor, entry.id, entry.version, "Cancelar"),
  ).rejects.toThrow();
  const edited = await updateEntry(actor, entry.id, {
    ...input,
    description: "Descrição corrigida",
    expectedVersion: entry.version,
  });
  expect(edited.description).toBe("Descrição corrigida");
  expect(edited.remainingAmount).toBe("70.00");
});
