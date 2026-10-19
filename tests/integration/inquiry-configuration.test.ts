import { it, expect } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { createProduct, updateProduct } from "@/server/products";
import { reviewInquiry } from "@/server/inquiry";
import { productInput } from "../fixtures/product";
setupDatabase();
const uploads = {
  a: { bytes: new Uint8Array([1, 2]), mimeType: "image/webp" as const },
};
it("preserves personalization and asks to confirm changed prices", async () => {
  const actor = await seedUser();
  const configuration = {
    formatVersion: 1,
    included: "",
    leadTimeCondition: "",
    fields: [
      {
        id: "name",
        label: "Nome",
        help: "",
        required: true,
        type: "SHORT_TEXT",
        maxLength: 120,
        effect: { kind: "ADD", amount: "1.00" },
      },
    ],
  };
  const p = await createProduct(
    actor,
    { ...productInput, configuration },
    uploads,
  );
  const items = ["Ana", "Bia"].map((value, i) => ({
    lineId: `l${i}`,
    productId: p.id,
    quantity: 1,
    answers: [{ fieldId: "name", value }],
    commercialRevision: p.commercialRevision,
    seenPrice: { kind: "REFERENCE", unit: "76.00", subtotal: "76.00" },
  }));
  const first = await reviewInquiry({ items });
  expect(first.ready).toBe(true);
  expect(first.message).toContain("Ana");
  expect(first.message).toContain("Bia");
  expect(first.knownTotal).toBe("152.00");
  await updateProduct(actor, p.id, {
    ...productInput,
    price: "80.00",
    configuration,
    images: p.images.map((i) => ({ id: i.id })),
    expectedVersion: p.version,
  });
  const changed = await reviewInquiry({ items });
  expect(changed.ready).toBe(false);
  expect(changed.lines[0].requiresConfirmation).toBe(true);
  expect(changed.contact).toBeNull();
});
it("lets valid consultation lines prepare contact without a false total", async () => {
  const actor = await seedUser();
  const p = await createProduct(
    actor,
    { ...productInput, publicPriceMode: "CONSULT" },
    uploads,
  );
  const result = await reviewInquiry({
    items: [
      {
        lineId: "l",
        productId: p.id,
        quantity: 2,
        commercialRevision: p.commercialRevision,
        seenPrice: { kind: "CONSULT", unit: null, subtotal: null },
      },
    ],
  });
  expect(result).toMatchObject({
    ready: true,
    knownTotal: null,
    consultCount: 1,
  });
  expect(result.lines[0].price).toBeNull();
  expect(result.message).not.toContain("R$ 0");
});
