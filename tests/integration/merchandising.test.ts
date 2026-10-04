import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { createProduct, updateProduct } from "@/server/products";
import {
  publicProduct,
  catalogPage,
  featuredCollections,
} from "@/server/storefront";
import { saveCollection } from "@/server/collections";
import { getPublicAppearance, saveAppearance } from "@/server/appearance";
import { defaultAppearance } from "@/domain/appearance/validation";
import { defaultStorefront } from "@/domain/appearance/storefront";
import { productInput } from "../fixtures/product";
setupDatabase();
const uploads = {
  a: { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/webp" as const },
};
it("preserves old commercial data on legacy edits and enforces unique normalized SKU", async () => {
  const actor = await seedUser();
  const product = await createProduct(
    actor,
    {
      ...productInput,
      sku: " pla-1 ",
      availability: "MADE_TO_ORDER",
      leadTimeDays: 7,
      colors: ["Azul"],
      sizes: ["P"],
      specifications: "PLA",
    },
    uploads,
  );
  expect((await publicProduct(product.id))?.availability).toBe("MADE_TO_ORDER");
  expect((await catalogPage(undefined, "pla-1", "nome", 1)).total).toBe(1);
  await expect(
    createProduct(actor, { ...productInput, sku: "pla-1" }, uploads),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  const updated = await updateProduct(actor, product.id, {
    ...productInput,
    images: product.images.map((i) => ({ id: i.id })),
    expectedVersion: product.version,
  });
  expect(updated).toMatchObject({
    sku: "PLA-1",
    availability: "MADE_TO_ORDER",
    leadTimeDays: 7,
    colors: ["Azul"],
    sizes: ["P"],
    specifications: "PLA",
  });
  const blank = await createProduct(actor, productInput, uploads);
  expect(blank).toMatchObject({
    sku: "",
    availability: "CONSULT",
    leadTimeDays: null,
  });
  await createProduct(actor, { ...productInput, sku: "" }, uploads);
});
it("keeps configured ordering and filters inactive or empty collections and unpublished products", async () => {
  const actor = await seedUser();
  const active = await createProduct(actor, productInput, uploads);
  const hidden = await createProduct(
    actor,
    { ...productInput, active: false },
    uploads,
  );
  const collection = (name: string, active: boolean, productIds: string[]) =>
    saveCollection(actor, undefined, {
        name: `Coleção ${name}`,
      description: "",
      active,
      position: 0,
      productIds,
    });
  const a = await collection("A", true, [active.id, hidden.id]);
  const b = await collection("B", true, [active.id]);
  const c = await collection("C", false, [active.id]);
  const d = await collection("D", true, [hidden.id]);
  const result = await featuredCollections([b.id, c.id, d.id, a.id]);
  expect(result.map((c) => c.id)).toEqual([b.id, a.id]);
  expect(result[1].products.map((p) => p.id)).toEqual([active.id]);
  expect(result[1].products[0]).not.toHaveProperty("calculation");
});
it("saves storefront configuration atomically with appearance and denies stale/operator writes", async () => {
  const admin = await seedUser();
  const storefront = {
    ...defaultStorefront,
    aboutText: "Produção local",
    sectionOrder: ["about", "banners", "featured", "catalog"],
  };
  await saveAppearance(admin, {
    ...defaultAppearance,
    storefront,
    expectedVersion: 0,
  });
  expect((await getPublicAppearance()).storefront).toEqual(storefront);
  await expect(
    saveAppearance(admin, { ...defaultAppearance, expectedVersion: 0 }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const operator = await seedUser("OPERATOR", "operator@example.test");
  await expect(
    saveAppearance(operator, { ...defaultAppearance, expectedVersion: 1 }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  const { storefront: _unused, ...legacy } = defaultAppearance;
  void _unused;
  await saveAppearance(admin, { ...legacy, expectedVersion: 1 });
  expect((await getPublicAppearance()).storefront).toEqual(storefront);
});
