import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { saveCustomer } from "@/server/customers";
import {
  saveQuote,
  transitionQuote,
  getQuote,
  listQuotes,
} from "@/server/quotes";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { saveAppearance } from "@/server/appearance";
import { defaultAppearance } from "@/domain/appearance/validation";
import { createProduct } from "@/server/products";
import { productInput } from "../fixtures/product";
setupDatabase();
it("filters issuance days in Sao Paulo instead of UTC", async () => {
  const { actor } = await fixture();
  const q = await saveQuote(actor, undefined, {});
  await db.quote.update({
    where: { id: q.id },
    data: { createdAt: new Date("2026-09-30T01:00:00Z") },
  });
  expect(
    (await listQuotes(actor, { from: "2026-09-29", to: "2026-09-29" })).total,
  ).toBe(1);
  expect(
    (await listQuotes(actor, { from: "2026-09-30", to: "2026-09-30" })).total,
  ).toBe(0);
});
it("archives the logo and negotiated product price at issuance", async () => {
  const { actor, input } = await fixture();
  await saveAppearance(
    actor,
    { ...defaultAppearance, name: "Empresa original", expectedVersion: 0 },
    { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/webp" },
  );
  const product = await createProduct(actor, productInput, {
    a: { bytes: new Uint8Array([9]), mimeType: "image/webp" },
  });
  const draft = await saveQuote(actor, undefined, {
    ...input,
    items: [
      {
        productId: product.id,
        description: "Negociado",
        quantity: 1,
        unitPrice: "60.00",
      },
    ],
  });
  const issued = await transitionQuote(actor, draft.id, 1, "ISSUE");
  await db.product.update({
    where: { id: product.id },
    data: { name: "Nome alterado", price: "90.00" },
  });
  await saveAppearance(
    actor,
    { ...defaultAppearance, name: "Empresa alterada", expectedVersion: 1 },
    { bytes: new Uint8Array([4, 5]), mimeType: "image/webp" },
  );
  const current = await getQuote(actor, draft.id);
  expect(current.snapshot).toEqual(issued.snapshot);
  expect(current.snapshot?.items[0].unitPrice).toBe("60.00");
  expect(current.snapshot?.items[0].name).toBe(productInput.name);
  expect(current.snapshot?.company.name).toBe("Empresa original");
  expect(
    Array.from(
      (
        await db.documentLogo.findUniqueOrThrow({
          where: { quoteId: draft.id },
        })
      ).bytes,
    ),
  ).toEqual([1, 2, 3]);
});
async function fixture() {
  const actor = await seedUser();
  const customer = await saveCustomer(actor, undefined, {
    name: "Cliente original",
    type: "PERSON",
    active: true,
    notes: "SEGREDO",
  });
  return {
    actor,
    customer,
    input: {
      customerId: customer.id,
      items: [
        { description: "Peça negociada", quantity: 2, unitPrice: "75.00" },
      ],
      discount: "10.00",
      shipping: "5.00",
      paymentTerms: "Pix",
      internalNotes: "CUSTO PRIVADO",
      validUntil: todaySaoPaulo(new Date()),
    },
  };
}
it("issues with inclusive validity, immutable commercial snapshot and audited reopening", async () => {
  const { actor, customer, input } = await fixture();
  const draft = await saveQuote(actor, undefined, input);
  const issued = await transitionQuote(actor, draft.id, draft.version, "ISSUE");
  expect(issued.totals?.total).toBe("145.00");
  expect(issued.number).toMatch(/^ORC-/);
  expect(issued.snapshot?.customer).not.toHaveProperty("notes");
  await db.customer.update({
    where: { id: customer.id },
    data: { name: "Nome novo" },
  });
  expect((await getQuote(actor, draft.id)).snapshot?.customer.name).toBe(
    "Cliente original",
  );
  const approved = await transitionQuote(
    actor,
    draft.id,
    issued.version,
    "APPROVE",
  );
  expect(approved.status).toBe("APROVADO");
  const reopened = await transitionQuote(
    actor,
    draft.id,
    approved.version,
    "REOPEN",
  );
  expect(reopened.status).toBe("RASCUNHO");
  expect(reopened.snapshot).toBeNull();
  expect(reopened.events.map((e) => e.action)).toContain("APPROVE");
  await expect(
    transitionQuote(actor, draft.id, approved.version, "ISSUE"),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("rejects incomplete, inactive, expired and converted documents", async () => {
  const { actor, customer, input } = await fixture();
  const empty = await saveQuote(actor, undefined, {});
  await expect(transitionQuote(actor, empty.id, 1, "ISSUE")).rejects.toThrow(
    /cliente.*itens.*validade.*pagamento/i,
  );
  const draft = await saveQuote(actor, undefined, input);
  await db.customer.update({
    where: { id: customer.id },
    data: { active: false },
  });
  await expect(transitionQuote(actor, draft.id, 1, "ISSUE")).rejects.toThrow();
  await db.customer.update({
    where: { id: customer.id },
    data: { active: true },
  });
  const sent = await transitionQuote(actor, draft.id, 1, "ISSUE");
  await db.quote.update({
    where: { id: draft.id },
    data: { validUntil: new Date("2000-01-01T00:00:00Z") },
  });
  expect((await getQuote(actor, draft.id)).status).toBe("EXPIRADO");
  await expect(
    transitionQuote(actor, draft.id, sent.version, "APPROVE"),
  ).rejects.toThrow();
  await db.quote.update({
    where: { id: draft.id },
    data: { status: "CONVERTIDO" },
  });
  await expect(
    transitionQuote(actor, draft.id, sent.version, "REOPEN"),
  ).rejects.toThrow();
});
