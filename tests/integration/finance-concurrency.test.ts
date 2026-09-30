import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { saveAccount } from "@/server/finance/accounts";
import { createEntry, getEntry } from "@/server/finance/entries";
import { settleEntry } from "@/server/finance/settlements";
import { saveCustomer } from "@/server/customers";
import {
  saveSaleDraft,
  confirmSale,
  cancelSale,
  getSale,
} from "@/server/sales";
import { db } from "@/lib/db";
setupDatabase();
it("serializes partial settlements so two 80 payments cannot exceed 100", async () => {
  const actor = await seedUser(),
    account = await saveAccount(actor, undefined, {
      name: "Caixa",
      type: "CASH",
      openingBalance: "0",
      openingDate: "2026-01-01",
      active: true,
    }),
    entry = await createEntry(actor, {
      kind: "RECEIVABLE",
      description: "Recebível",
      counterparty: "Cliente",
      categoryId: "system-sale-revenue",
      amount: "100",
      dueDate: "2026-01-01",
    });
  const input = {
    entryId: entry.id,
    accountId: account.id,
    amount: "80.00",
    effectiveDate: "2026-01-02",
    method: "PIX",
    expectedVersion: entry.version,
  };
  const result = await Promise.allSettled([
    settleEntry(actor, { ...input, operationKey: "concurrent-payment-a" }),
    settleEntry(actor, { ...input, operationKey: "concurrent-payment-b" }),
  ]);
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await getEntry(actor, entry.id)).remainingAmount).toBe("20.00");
});
it("never cancels a sale while leaving an unreversed receipt", async () => {
  const actor = await seedUser(),
    customer = await saveCustomer(actor, undefined, {
      name: "Cliente concorrência",
      type: "PERSON",
      active: true,
    }),
    account = await saveAccount(actor, undefined, {
      name: "Caixa",
      type: "CASH",
      openingBalance: "0",
      openingDate: "2026-01-01",
      active: true,
    });
  const draft = await saveSaleDraft(actor, undefined, {
    customerId: customer.id,
    items: [{ description: "Peça", quantity: 1, unitPrice: "100.00" }],
    discount: "0",
    shipping: "0",
    paymentTerms: "Pix",
    internalNotes: "",
  });
  const sale = await confirmSale(
    actor,
    draft.id,
    1,
    [{ number: 1, amount: "100.00", dueDate: "2026-01-02" }],
    "race-sale-confirm",
  );
  const entry = await db.financialEntry.findFirstOrThrow({
    where: { saleInstallment: { saleId: sale.id } },
  });
  const results = await Promise.allSettled([
    cancelSale(actor, sale.id, sale.version, "Desistência"),
    settleEntry(actor, {
      entryId: entry.id,
      accountId: account.id,
      amount: "30",
      effectiveDate: "2026-01-02",
      method: "PIX",
      expectedVersion: entry.version,
      operationKey: "race-settlement-key",
    }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const final = await getSale(actor, sale.id);
  expect(
    final.status !== "CANCELADA" || final.receiptSummary.received === "0.00",
  ).toBe(true);
});
