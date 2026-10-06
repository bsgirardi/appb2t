import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { pricingFixture } from "../fixtures/pricing-db";
import { productInput } from "../fixtures/product";
import { createPricingEstimate } from "@/server/pricing/estimates";
import {
  createProduct,
  updateProduct,
  getProduct,
  listPublicProducts,
} from "@/server/products";
import { saveMaterial } from "@/server/catalog-inputs";
import { db } from "@/lib/db";
setupDatabase();
const uploads = {
  a: { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/webp" as const },
};
it("readsLegacyWithoutWriting and archivesOldCalculationOnce", async () => {
  const { actor, request } = await pricingFixture();
  let p = await createProduct(actor, productInput, uploads);
  expect((await getProduct(actor, p.id)).calculation).toEqual(p.calculation);
  expect(
    (await db.product.findUniqueOrThrow({ where: { id: p.id } })).version,
  ).toBe(1);
  const s = await createPricingEstimate(actor, request, randomUUID());
  p = await updateProduct(actor, p.id, {
    ...productInput,
    images: p.images.map((i) => ({ id: i.id })),
    calculation: { version: 2, snapshotId: s.id },
    expectedVersion: p.version,
  });
  expect(p.price).toBe("75.00");
  expect(p.pricingSnapshot?.result.fullCost).toBe("56.2");
  expect(
    await db.productCalculationRevision.count({ where: { productId: p.id } }),
  ).toBe(1);
  p = await updateProduct(actor, p.id, {
    ...productInput,
    name: "Nome atualizado",
    images: p.images.map((i) => ({ id: i.id })),
    calculation: { version: 2, snapshotId: s.id },
    expectedVersion: p.version,
  });
  expect(
    await db.productCalculationRevision.count({ where: { productId: p.id } }),
  ).toBe(1);
  const publicProduct = (await listPublicProducts())[0];
  expect(publicProduct).not.toHaveProperty("pricingSnapshot");
  expect(publicProduct).not.toHaveProperty("calculation");
});
it("inactiveHistoricalReferencesRemainReadable and priceDoesNotFollowNewCost", async () => {
  const { actor, request, material } = await pricingFixture(),
    s = await createPricingEstimate(actor, request, randomUUID());
  const p = await createProduct(
    actor,
    { ...productInput, calculation: { version: 2, snapshotId: s.id } },
    uploads,
  );
  await saveMaterial(actor, {
    id: material.id,
    expectedVersion: 1,
    name: material.name,
    technology: "FDM",
    active: false,
    price: "900",
  });
  const read = await getProduct(actor, p.id);
  expect(read.pricingSnapshot?.result).toEqual(s.result);
  expect(read.price).toBe("75.00");
  await expect(
    updateProduct(actor, p.id, {
      ...productInput,
      images: p.images.map((i) => ({ id: i.id })),
      calculation: p.calculation,
      expectedVersion: p.version,
    }),
  ).resolves.toMatchObject({ price: "75.00" });
});
it("rejects invented snapshots and zero publication price", async () => {
  const { actor } = await pricingFixture();
  await expect(
    createProduct(
      actor,
      { ...productInput, calculation: { version: 2, snapshotId: "missing" } },
      uploads,
    ),
  ).rejects.toThrow();
  await expect(
    createProduct(actor, { ...productInput, price: "0" }, uploads),
  ).rejects.toThrow();
});
