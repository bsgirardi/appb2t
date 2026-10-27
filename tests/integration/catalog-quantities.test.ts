import { expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { createProduct, updateProduct } from "@/server/products";
import { productInput } from "../fixtures/product";
import { reviewInquiry } from "@/server/inquiry";
import {
  createCatalogRequestFixture,
  requestQuoteInput,
} from "../fixtures/catalog-request-db";
import { createC3RequestFixture } from "../fixtures/catalog-c3";
import { changeCatalogRequest } from "@/server/catalog-requests/service";
import { prepareRequestQuote } from "@/server/catalog-requests/prepare-quote";
import {
  receiveCatalogRequest,
  requestHash,
} from "@/server/catalog-requests/receive";
import { saveCustomer } from "@/server/customers";
import { getCatalogRequest } from "@/server/catalog-requests/queries";
import { getQuote } from "@/server/quotes";
import { kitPreparationReview } from "@/domain/kits/document";
import { checkoutFixture } from "../fixtures/checkout";
import { reviewCheckout } from "@/server/checkout/review";
setupDatabase();
const uploads = {
  a: { bytes: new Uint8Array([1]), mimeType: "image/webp" as const },
};
it("persists minimum defaults, preserves older updates and enforces the database constraint", async () => {
  const actor = await seedUser();
  const product = await createProduct(actor, productInput, uploads);
  expect(product.minimumQuantity).toBe(1);
  const changed = await updateProduct(actor, product.id, {
    ...productInput,
    minimumQuantity: 5,
    images: product.images.map((i) => ({ id: i.id })),
    expectedVersion: product.version,
  });
  expect(changed.minimumQuantity).toBe(5);
  expect(changed.commercialRevision).toBe(product.commercialRevision! + 1);
  const older = await updateProduct(actor, product.id, {
    ...productInput,
    images: product.images.map((i) => ({ id: i.id })),
    expectedVersion: changed.version,
  });
  expect(older.minimumQuantity).toBe(5);
  expect(older.commercialRevision).toBe(changed.commercialRevision);
  for (const minimumQuantity of [0, 100001])
    await expect(
      db.product.update({
        where: { id: product.id },
        data: { minimumQuantity },
      }),
    ).rejects.toThrow();
});
it("does not combine different configurations to satisfy a minimum and revises stale quantities", async () => {
  const actor = await seedUser();
  const product = await createProduct(
    actor,
    { ...productInput, minimumQuantity: 5, colors: ["Azul", "Branco"] },
    uploads,
  );
  const items = ["Azul", "Branco"].map((color) => ({
    productId: product.id,
    color,
    quantity: 3,
  }));
  const review = await reviewInquiry({ items });
  expect(review.ready).toBe(false);
  expect(review.lines.every((l) => l.problem?.includes("5 unidades"))).toBe(
    true,
  );
  expect(review.lines.map((l) => l.quantity)).toEqual([3, 3]);
  expect(review.lines.every((l) => l.minimumQuantity === 5)).toBe(true);
  const allowed = await reviewInquiry({
    items: items.map((i) => ({ ...i, quantity: 6 })),
  });
  expect(allowed.lines.every((l) => !l.problem)).toBe(true);
});
it("requires the current minimum when preparing an old request but preserves an issued quote", async () => {
  const f = await createCatalogRequestFixture();
  await changeCatalogRequest(f.actor, f.request.id, {
    action: "START",
    assigneeId: f.actor.id,
    expectedVersion: 1,
  });
  const customer = await saveCustomer(f.actor, undefined, {
    name: "Cliente teste",
    type: "PERSON",
    active: true,
  });
  const input = requestQuoteInput(customer.id, f.lines);
  const updated = await updateProduct(f.actor, f.product.id, {
    ...productInput,
    minimumQuantity: 5,
    images: f.product.images.map((i) => ({ id: i.id })),
    expectedVersion: f.product.version,
  });
  await expect(
    prepareRequestQuote(f.actor, f.request.id, input),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  const result = await prepareRequestQuote(f.actor, f.request.id, {
    ...input,
    document: {
      ...input.document,
      items: input.document.items.map((i) => ({ ...i, quantity: 5 })),
    },
  });
  expect(result.quote.input.items!.map((i) => i.quantity)).toEqual([5, 5]);
  expect(result.quote.input.items![0].catalogOrigin!.snapshot.quantity).toBe(1);
  await updateProduct(f.actor, f.product.id, {
    ...productInput,
    minimumQuantity: 10,
    images: f.product.images.map((i) => ({ id: i.id })),
    expectedVersion: updated.version,
  });
  expect(
    (await getQuote(f.actor, result.quote.id)).input.items![0].quantity,
  ).toBe(5);
});
it("receives and prepares large kit components with only the kit discount", async () => {
  const f = await createC3RequestFixture();
  const items = f.payload.items.map((i) => ({ ...i, quantity: 100 }));
  const review = await reviewInquiry({
    schemaVersion: 2,
    items,
    groups: f.payload.groups,
  });
  const payload = {
    ...f.payload,
    attemptKey: randomBytes(32).toString("hex"),
    items: items.map((i, n) => ({
      ...i,
      commercialRevision: review.lines[n].currentRevision,
      seenPrice: review.lines[n].configuredPrice,
    })),
    groups: f.payload.groups.map((g, n) => ({
      ...g,
      seenPrice: review.groups![n].price,
    })),
  };
  await receiveCatalogRequest(payload, f.browserId);
  const row = await db.catalogRequest.findUniqueOrThrow({
    where: { attemptHash: requestHash(payload.attemptKey) },
  });
  const request = await changeCatalogRequest(f.actor, row.id, {
    action: "START",
    assigneeId: f.actor.id,
    expectedVersion: 1,
  });
  expect(request.lines.map((l) => l.quantity)).toEqual([100, 100, 100]);
  expect(request.lines.map((l) => l.unitPrice)).toEqual([
    "30.00",
    "20.00",
    "20.00",
  ]);
  const input = requestQuoteInput(f.customer.id, request.lines);
  input.document.discount = "1200.00";
  const result = await prepareRequestQuote(f.actor, request.id, {
    ...input,
    additionalDiscount: "0.00",
    kitReviewFingerprint: kitPreparationReview(
      input.document.items,
      input.sources,
      input.document.discount,
    ),
  });
  expect(result.quote.totals).toMatchObject({
    subtotal: "7000.00",
    discount: "1200.00",
    total: "5800.00",
  });
  expect((await getCatalogRequest(f.actor, request.id)).lines[0].quantity).toBe(
    100,
  );
});
it("uses the current minimum in checkout review without granting new direct purchase rights", async () => {
  const f = await checkoutFixture();
  await db.product.update({
    where: { id: f.product.id },
    data: { minimumQuantity: 5 },
  });
  await expect(
    db.$transaction((tx) => reviewCheckout(tx, f.draft)),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const draft = {
    ...f.draft,
    items: f.draft.items.map((i) => ({
      ...i,
      quantity: 100,
      seenPrice: {
        kind: "REFERENCE" as const,
        unit: "75.00",
        subtotal: "7500.00",
      },
    })),
  };
  expect(
    await db.$transaction((tx) => reviewCheckout(tx, draft)),
  ).toMatchObject({ route: "DIRECT", total: "7500.00" });
  await db.product.update({
    where: { id: f.product.id },
    data: { checkoutPolicy: Prisma.DbNull },
  });
  await expect(
    db.$transaction((tx) => reviewCheckout(tx, draft)),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
