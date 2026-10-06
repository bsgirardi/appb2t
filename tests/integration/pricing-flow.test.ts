import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { pricingFixture, pricingRates } from "../fixtures/pricing-db";
import { productInput } from "../fixtures/product";
import { db } from "@/lib/db";
import { createPricingEstimate } from "@/server/pricing/estimates";
import {
  createProduct,
  listPublicProducts,
  getProduct,
} from "@/server/products";
import { saveCustomer } from "@/server/customers";
import { saveQuote, transitionQuote, getQuote } from "@/server/quotes";
import { convertQuote, getSale } from "@/server/sales";
import { savePricingSettings } from "@/server/pricing/catalog";
import { saveAccount } from "@/server/finance/accounts";
import { settleEntry } from "@/server/finance/settlements";
import { todaySaoPaulo } from "@/domain/commerce/dates";
setupDatabase();
it("configures, saves V2, freezes quote, converts once and receives partially without changing historical pricing", async () => {
  const { actor, request, material } = await pricingFixture();
  const snapshot = await createPricingEstimate(actor, request, randomUUID());
  const product = await createProduct(
    actor,
    { ...productInput, calculation: { version: 2, snapshotId: snapshot.id } },
    { a: { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/webp" } },
  );
  const customer = await saveCustomer(actor, undefined, {
    name: "Cliente de validação",
    type: "PERSON",
    active: true,
    notes: "",
  });
  const input = {
    customerId: customer.id,
    items: [
      {
        lineId: randomUUID(),
        productId: product.id,
        description: "Lote negociado",
        quantity: 10,
        unitPrice: "8.00",
      },
    ],
    discount: "5.00",
    shipping: "3.00",
    paymentTerms: "Pix",
    internalNotes: "Memória privada",
    validUntil: "2099-12-31",
  };
  let quote = await saveQuote(actor, undefined, {
    ...input,
    costBindings: [{ lineId: input.items[0].lineId, snapshotId: snapshot.id }],
  });
  quote = await transitionQuote(actor, quote.id, quote.version, "ISSUE");
  const frozen = quote.costs;
  await savePricingSettings(actor, {
    ...pricingRates,
    energyRate: "2",
    expectedVersion: 1,
  });
  await db.material.update({
    where: { id: material.id },
    data: { active: false, price: "900", version: { increment: 1 } },
  });
  expect((await getQuote(actor, quote.id)).costs).toEqual(frozen);
  expect((await getProduct(actor, product.id)).price).toBe("75.00");
  expect(JSON.stringify(await listPublicProducts())).not.toMatch(
    /pricingSnapshot|energyRate|fullCost|actorName|snapshotId/,
  );
  expect(JSON.stringify(quote.snapshot)).not.toMatch(
    /snapshotId|fullCost|lineId/,
  );
  quote = await transitionQuote(actor, quote.id, quote.version, "APPROVE");
  const rows = [{ number: 1, amount: "78.00", dueDate: "2099-12-31" }],
    key = randomUUID();
  const sale = await convertQuote(actor, quote.id, quote.version, rows, key);
  expect(
    (await convertQuote(actor, quote.id, quote.version, rows, key)).id,
  ).toBe(sale.id);
  expect(sale.costs?.snapshots).toEqual(frozen?.snapshots);
  const account = await saveAccount(actor, undefined, {
    name: "Conta de validação",
    type: "BANK",
    openingBalance: "0",
    openingDate: "2026-01-01",
    active: true,
  });
  const entry = await db.financialEntry.findFirstOrThrow({
    where: { saleInstallment: { saleId: sale.id } },
  });
  const payment = {
    entryId: entry.id,
    accountId: account.id,
    amount: "30.00",
    effectiveDate: todaySaoPaulo(new Date()),
    method: "PIX",
    notes: "Validação isolada",
    expectedVersion: entry.version,
    operationKey: randomUUID(),
  };
  const settled = await settleEntry(actor, payment);
  expect((await settleEntry(actor, payment)).id).toBe(settled.id);
  expect((await getSale(actor, sale.id)).receiptSummary).toMatchObject({
    received: "30.00",
    pending: "48.00",
  });
  expect(await db.sale.count()).toBe(1);
  expect(await db.saleInstallment.count()).toBe(1);
  expect(await db.cashMovement.count()).toBe(1);
  if (process.env.B2T_PRICING_QA === "1") {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const sharp = (await import("sharp")).default;
    const bytes = await sharp({
      create: { width: 400, height: 400, channels: 3, background: "#6e3aba" },
    })
      .webp()
      .toBuffer();
    await db.productImage.updateMany({
      where: { productId: product.id },
      data: { bytes: new Uint8Array(bytes) },
    });
    await seedUser("OPERATOR", "operator@example.test");
    await db.material.update({
      where: { id: material.id },
      data: { active: true, price: "100" },
    });
    const draft = await saveQuote(actor, undefined, {
      ...input,
      costBindings: [
        { lineId: input.items[0].lineId, snapshotId: snapshot.id },
      ],
    });
    await mkdir("test-results/pricing-v2", { recursive: true });
    await writeFile(
      "test-results/pricing-v2/fixture.json",
      JSON.stringify({
        productId: product.id,
        quoteId: quote.id,
        draftId: draft.id,
        saleId: sale.id,
      }),
    );
  }
});
