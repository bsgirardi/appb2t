import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { saveCustomer } from "@/server/customers";
import { getQuote, saveQuote, transitionQuote } from "@/server/quotes";
import { saveQuoteWithClient } from "@/server/commerce/quote-write";
import type { CatalogLineOrigin } from "@/domain/catalog-requests/types";
setupDatabase();
const origin = (name: string): CatalogLineOrigin => ({
  schemaVersion: 1,
  requestId: "r",
  sourceLineId: name,
  snapshot: {
    schemaVersion: 1,
    lineId: name,
    productId: "p",
    commercialRevision: 1,
    name: "Peça",
    sku: "",
    color: "Azul",
    size: "P",
    answers: [{ fieldId: "name", value: name }],
    answerLabels: [{ fieldId: "name", label: "Nome", valueLabel: name }],
    quantity: 1,
    priceKind: "REFERENCE",
    unitPrice: "10.00",
    subtotal: "10.00",
    included: "Uma peça",
    leadTimeCondition: "Após arte",
    productionLeadDays: 5,
    paymentTerms: "Pix",
  },
});
async function fixture() {
  const actor = await seedUser();
  const customer = await saveCustomer(actor, undefined, {
    name: "Cliente",
    type: "PERSON",
    active: true,
  });
  const input = {
    customerId: customer.id,
    validUntil: "2099-12-31",
    paymentTerms: "Pix",
    discount: "0",
    shipping: "0",
    internalNotes: "",
    items: ["Ana", "Bia"].map((name) => ({
      lineId: name,
      description: `Peça para ${name}`,
      quantity: 1,
      unitPrice: "10.00",
      catalogOrigin: origin(name),
    })),
  };
  return { actor, input };
}
it("preserves received metadata by line identity through reorder, edits and issue", async () => {
  const { actor, input } = await fixture();
  const first = await db.$transaction((tx) =>
    saveQuoteWithClient(tx, actor, undefined, input),
  );
  const reversed = [...first.input.items!]
    .reverse()
    .map(({ catalogOrigin: _origin, ...item }) => ({
      ...item,
      unitPrice: "12.00",
      quantity: 2,
    }));
  const saved = await saveQuote(actor, first.id, {
    ...first.input,
    items: reversed,
    expectedVersion: first.version,
  });
  expect(saved.input.items!.map((i) => i.catalogOrigin?.sourceLineId)).toEqual([
    "Bia",
    "Ana",
  ]);
  const issued = await transitionQuote(actor, saved.id, saved.version, "ISSUE");
  expect(
    issued.snapshot!.items.map(
      (i) => i.catalogOrigin?.snapshot.answers[0].value,
    ),
  ).toEqual(["Bia", "Ana"]);
  expect((await getQuote(actor, saved.id)).snapshot).toEqual(issued.snapshot);
});
it("removing a line cannot move its origin to another line and generic saves reject forged origins", async () => {
  const { actor, input } = await fixture();
  await expect(saveQuote(actor, undefined, input)).rejects.toMatchObject({
    code: "VALIDATION",
  });
  const first = await db.$transaction((tx) =>
    saveQuoteWithClient(tx, actor, undefined, input),
  );
  const secondLine = first.input.items![1];
  const saved = await saveQuote(actor, first.id, {
    ...first.input,
    items: [secondLine],
    expectedVersion: first.version,
  });
  expect(saved.input.items![0].catalogOrigin?.sourceLineId).toBe("Bia");
  await expect(
    saveQuote(actor, saved.id, {
      ...saved.input,
      items: [{ ...saved.input.items![0], catalogOrigin: origin("Ana") }],
      expectedVersion: saved.version,
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
});
it("rejects oversized descriptions without discarding full metadata", async () => {
  const { actor, input } = await fixture();
  await expect(
    db.$transaction((tx) =>
      saveQuoteWithClient(tx, actor, undefined, {
        ...input,
        items: [{ ...input.items[0], description: "x".repeat(1001) }],
      }),
    ),
  ).rejects.toThrow();
  expect(await db.quote.count()).toBe(0);
});
it("allows an explicit duplicate to keep its existing origin with a fresh line identity", async () => {
  const { actor, input } = await fixture();
  const first = await db.$transaction((tx) =>
    saveQuoteWithClient(tx, actor, undefined, input),
  );
  const copy = { ...first.input.items![0], lineId: "ana-copy" };
  const saved = await saveQuote(actor, first.id, {
    ...first.input,
    items: [...first.input.items!, copy],
    expectedVersion: first.version,
  });
  expect(saved.input.items).toHaveLength(3);
  expect(saved.input.items![2].catalogOrigin).toEqual(
    first.input.items![0].catalogOrigin,
  );
});
