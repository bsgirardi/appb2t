import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import {
  createProduct,
  updateProduct,
  getProduct,
  listPublicProducts,
} from "@/server/products";
import { productInput } from "../fixtures/product";
setupDatabase();
const uploads = {
  a: { bytes: new Uint8Array([1, 2]), mimeType: "image/webp" as const },
};
it("persists_tiers_and_only_commercial_changes_increase_revision", async () => {
  const actor = await seedUser();
  const p = await createProduct(actor, productInput, uploads);
  const input = {
    ...productInput,
    images: p.images.map((i) => ({ id: i.id })),
    expectedVersion: p.version,
  };
  const withTiers = await updateProduct(actor, p.id, {
    ...input,
    quantityTiers: [{ minQuantity: 10, baseUnitPrice: "65" }],
  });
  expect(withTiers.quantityTiers).toEqual([
    { minQuantity: 10, baseUnitPrice: "65.00" },
  ]);
  expect(withTiers.commercialRevision).toBe(2);
  const withPhoto = await updateProduct(actor, p.id, {
    ...input,
    expectedVersion: withTiers.version,
    compositionImageId: p.images[0].id,
  });
  expect(withPhoto.compositionImageId).toBe(p.images[0].id);
  expect(withPhoto.quantityTiers).toEqual([
    { minQuantity: 10, baseUnitPrice: "65.00" },
  ]);
  expect(withPhoto.commercialRevision).toBe(2);
  expect((await listPublicProducts())[0].quantityTiers).toEqual(
    withPhoto.quantityTiers,
  );
  const other = await createProduct(actor, productInput, uploads);
  await expect(
    updateProduct(actor, p.id, {
      ...input,
      expectedVersion: withPhoto.version,
      compositionImageId: other.images[0].id,
    }),
  ).rejects.toThrow();
  expect((await getProduct(actor, p.id)).version).toBe(withPhoto.version);
  const removed = await updateProduct(actor, p.id, {
    ...input,
    expectedVersion: withPhoto.version,
    quantityTiers: [],
    compositionImageId: null,
  });
  expect(removed.quantityTiers).toEqual([]);
  expect(removed.commercialRevision).toBe(3);
});
