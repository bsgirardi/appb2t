import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { saveCustomer } from "@/server/customers";
import { saveQuote, transitionQuote } from "@/server/quotes";
import {
  saveSaleDraft,
  confirmSale,
  convertQuote,
  cancelSale,
} from "@/server/sales";
import { splitInstallments } from "@/domain/commerce/installments";
import { todaySaoPaulo } from "@/domain/commerce/dates";
setupDatabase();
async function fixture() {
  const actor = await seedUser();
  const customer = await saveCustomer(actor, undefined, {
    name: "Cliente venda",
    type: "PERSON",
    active: true,
  });
  const document = {
    customerId: customer.id,
    items: [{ description: "Peça", quantity: 1, unitPrice: "100.00" }],
    discount: "0.00",
    shipping: "0.00",
    paymentTerms: "3 parcelas",
    internalNotes: "",
  };
  const date = todaySaoPaulo(new Date());
  return { actor, document, rows: splitInstallments("100.00", 3, date), date };
}
it("converts exactly once under concurrency and replays before checking consumed versions", async () => {
  const { actor, document, rows, date } = await fixture();
  let q = await saveQuote(actor, undefined, { ...document, validUntil: date });
  q = await transitionQuote(actor, q.id, q.version, "ISSUE");
  q = await transitionQuote(actor, q.id, q.version, "APPROVE");
  const [a, b] = await Promise.all([
    convertQuote(actor, q.id, q.version, rows, "conversion-key-1"),
    convertQuote(actor, q.id, q.version, rows, "conversion-key-1"),
  ]);
  expect(a.id).toBe(b.id);
  expect(await db.sale.count({ where: { quoteId: q.id } })).toBe(1);
  expect(await db.financialEntry.count()).toBe(3);
  expect(a.receiptSummary).toMatchObject({
    total: "100.00",
    received: "0.00",
    pending: "100.00",
  });
  await expect(
    convertQuote(
      actor,
      q.id,
      q.version,
      [{ number: 1, amount: "100.00", dueDate: date }],
      "conversion-key-1",
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    convertQuote(actor, q.id, q.version, rows, "conversion-key-2"),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("confirms direct sale once, preserves cents, and cancels its open receivables", async () => {
  const { actor, document, rows } = await fixture();
  const draft = await saveSaleDraft(actor, undefined, document);
  const sale = await confirmSale(actor, draft.id, 1, rows, "direct-sale-key-1");
  expect(sale.installments.map((i) => i.amount)).toEqual([
    "33.34",
    "33.33",
    "33.33",
  ]);
  expect(
    (await confirmSale(actor, draft.id, 1, rows, "direct-sale-key-1")).id,
  ).toBe(sale.id);
  await expect(
    saveSaleDraft(actor, sale.id, {
      ...document,
      expectedVersion: sale.version,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const canceled = await cancelSale(
    actor,
    sale.id,
    sale.version,
    "Cliente desistiu",
  );
  expect(canceled.status).toBe("CANCELADA");
  expect(await db.financialEntry.count({ where: { canceledAt: null } })).toBe(
    0,
  );
  expect(canceled.receiptSummary.pending).toBe("0.00");
});
it("rolls back conversion when a receivable insert fails after creating the sale", async () => {
  const { actor, document, rows, date } = await fixture();
  let q = await saveQuote(actor, undefined, { ...document, validUntil: date });
  q = await transitionQuote(actor, q.id, q.version, "ISSUE");
  q = await transitionQuote(actor, q.id, q.version, "APPROVE");
  await db.$executeRawUnsafe(
    'ALTER TABLE "FinancialEntry" ADD CONSTRAINT "test_reject_entry" CHECK (amount < 1)',
  );
  try {
    await expect(
      convertQuote(actor, q.id, q.version, rows, "rollback-key-1"),
    ).rejects.toThrow();
    expect(await db.sale.count()).toBe(0);
    expect(await db.saleInstallment.count()).toBe(0);
    expect(
      (await db.quote.findUniqueOrThrow({ where: { id: q.id } })).status,
    ).toBe("APROVADO");
    expect(await db.commercialOperation.count()).toBe(0);
  } finally {
    await db.$executeRawUnsafe(
      'ALTER TABLE "FinancialEntry" DROP CONSTRAINT "test_reject_entry"',
    );
  }
});
