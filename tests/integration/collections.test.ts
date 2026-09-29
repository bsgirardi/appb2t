import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import {
  saveCollection,
  listPublicCollections,
  getCollectionImage,
} from "@/server/collections";
import {
  createProduct,
  updateProduct,
  getProduct,
  listPublicProducts,
  setProductActive,
} from "@/server/products";
import { productInput } from "../fixtures/product";
setupDatabase();
const photo = { bytes: new Uint8Array([1]), mimeType: "image/webp" as const };
const input = {
  name: "Decoração",
  description: "Peças para casa",
  active: true,
  position: 0,
  productIds: [] as string[],
};
it("filters active collections and products while preserving unassigned products", async () => {
  const actor = await seedUser();
  const a = await createProduct(actor, productInput, { a: photo });
  const b = await createProduct(actor, productInput, { a: photo });
  await createProduct(actor, productInput, { a: photo });
  const c = await saveCollection(actor, undefined, {
    ...input,
    productIds: [a.id, b.id],
  });
  await saveCollection(actor, undefined, {
    ...input,
    name: "Presentes",
    productIds: [a.id],
  });
  await saveCollection(actor, undefined, { ...input, name: "Vazia" });
  expect(await listPublicProducts()).toHaveLength(3);
  expect(await listPublicProducts(c.id)).toHaveLength(2);
  const currentB = await getProduct(actor, b.id);
  await setProductActive(actor, b.id, false, currentB.version);
  expect(await listPublicProducts(c.id)).toHaveLength(1);
  expect(
    (await listPublicCollections()).find((row) => row.id === c.id)?.imageUrl,
  ).toBe(`/api/products/${a.id}/image`);
  await saveCollection(actor, c.id, {
    ...input,
    productIds: [a.id, b.id],
    active: false,
    expectedVersion: c.version,
  });
  expect((await listPublicCollections()).some((row) => row.id === c.id)).toBe(
    false,
  );
  expect(await listPublicProducts(c.id)).toHaveLength(0);
  expect((await getProduct(actor, a.id)).active).toBe(true);
});
it("rejects stale memberships saved from the other editor", async () => {
  const actor = await seedUser();
  const p = await createProduct(actor, productInput, { a: photo });
  const c = await saveCollection(actor, undefined, input);
  const attempts = await Promise.allSettled([
    saveCollection(actor, c.id, {
      ...input,
      productIds: [p.id],
      expectedVersion: c.version,
    }),
    updateProduct(actor, p.id, {
      ...productInput,
      collectionIds: [c.id],
      images: p.images.map((i) => ({ id: i.id })),
      expectedVersion: p.version,
    }),
  ]);
  expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(attempts.find((r) => r.status === "rejected")).toMatchObject({
    reason: { code: "CONFLICT" },
  });
  expect((await getProduct(actor, p.id)).collectionIds).toEqual([c.id]);
});
it("protects unpublished collection images and detects stale collection edits", async () => {
  const actor = await seedUser();
  const c = await saveCollection(
    actor,
    undefined,
    { ...input, active: false },
    photo,
  );
  await expect(getCollectionImage(c.id, null)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect((await getCollectionImage(c.id, actor)).bytes).toEqual(photo.bytes);
  await saveCollection(actor, c.id, { ...input, expectedVersion: 1 });
  await expect(
    saveCollection(actor, c.id, { ...input, expectedVersion: 1 }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
