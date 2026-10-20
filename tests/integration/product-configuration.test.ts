import { it, expect } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import {
  createProduct,
  updateProduct,
  listPublicProducts,
  getProduct,
} from "@/server/products";
import { catalogPage } from "@/server/storefront";
import { productInput } from "../fixtures/product";
setupDatabase();
const uploads = {
  a: { bytes: new Uint8Array([1, 2]), mimeType: "image/webp" as const },
};
it("keeps consultation prices private and defaults old products", async () => {
  const actor = await seedUser();
  const p = await createProduct(actor, productInput, uploads);
  expect(p).toMatchObject({
    publicPriceMode: "REFERENCE",
    commercialRevision: 1,
    configuration: { fields: [] },
  });
  const updated = await updateProduct(actor, p.id, {
    ...productInput,
    images: p.images.map((i) => ({ id: i.id })),
    publicPriceMode: "CONSULT",
    expectedVersion: p.version,
  });
  expect(updated.price).toBe("75.00");
  expect(updated.commercialRevision).toBe(2);
  expect((await listPublicProducts())[0]).toMatchObject({
    price: null,
    publicPriceMode: "CONSULT",
  });
  expect((await listPublicProducts())[0]).not.toHaveProperty("calculation");
  expect((await getProduct(actor, p.id)).price).toBe("75.00");
});
it("preserves revision on SEO and rejects foreign image references atomically", async () => {
  const actor = await seedUser();
  const p = await createProduct(actor, productInput, uploads);
  const other = await createProduct(
    actor,
    { ...productInput, name: "Outro produto" },
    uploads,
  );
  const updated = await updateProduct(actor, p.id, {
    ...productInput,
    images: p.images.map((i) => ({ id: i.id })),
    seoTitle: "Novo título",
    expectedVersion: p.version,
  });
  expect(updated.commercialRevision).toBe(1);
  const configuration = {
    formatVersion: 1,
    included: "",
    leadTimeCondition: "",
    fields: [
      {
        id: "finish",
        label: "Acabamento",
        help: "",
        required: false,
        type: "SINGLE_CHOICE",
        options: [
          {
            id: "matte",
            label: "Fosco",
            effect: { kind: "NONE" },
            imageId: other.images[0].id,
          },
        ],
      },
    ],
  };
  await expect(
    updateProduct(actor, p.id, {
      ...productInput,
      configuration,
      images: p.images.map((i) => ({ id: i.id })),
      expectedVersion: updated.version,
    }),
  ).rejects.toThrow();
  expect((await getProduct(actor, p.id)).version).toBe(updated.version);
});
it("orders consultation last across page boundaries in both price directions", async () => {
  const actor = await seedUser();
  for (let i = 0; i < 18; i++)
    await createProduct(
      actor,
      {
        ...productInput,
        name: `Produto ${String(i).padStart(2, "0")}`,
        price: String(i + 1),
        publicPriceMode: i < 3 ? "CONSULT" : "REFERENCE",
      },
      uploads,
    );
  for (const order of ["menor-preco", "maior-preco"]) {
    const first = await catalogPage(undefined, "", order, 1);
    const second = await catalogPage(undefined, "", order, 2);
    const rows = [...first.products, ...second.products];
    expect(rows).toHaveLength(18);
    expect(new Set(rows.map((p) => p.id)).size).toBe(18);
    expect(rows.slice(0, 15).every((p) => p.price !== null)).toBe(true);
    expect(rows.slice(15).every((p) => p.price === null)).toBe(true);
  }
});
it("clears a photo removed in the same save without changing the commercial revision", async () => {
  const actor = await seedUser();
  let p = await createProduct(
    actor,
    { ...productInput, images: [{ uploadKey: "a" }, { uploadKey: "b" }] },
    { ...uploads, b: uploads.a },
  );
  const config = {
    formatVersion: 1,
    included: "",
    leadTimeCondition: "",
    fields: [
      {
        id: "finish",
        label: "Acabamento",
        help: "",
        required: false,
        type: "SINGLE_CHOICE",
        options: [
          {
            id: "matte",
            label: "Fosco",
            effect: { kind: "NONE" },
            imageId: p.images[1].id,
          },
        ],
      },
    ],
  };
  p = await updateProduct(actor, p.id, {
    ...productInput,
    configuration: config,
    images: p.images.map((i) => ({ id: i.id })),
    expectedVersion: p.version,
  });
  const revision = p.commercialRevision;
  const saved = await updateProduct(actor, p.id, {
    ...productInput,
    configuration: p.configuration,
    images: [{ id: p.images[0].id }],
    expectedVersion: p.version,
  });
  expect(saved.configuration!.fields[0]).toHaveProperty(
    "options.0.imageId",
    null,
  );
  expect(saved.commercialRevision).toBe(revision);
  await expect(
    updateProduct(actor, p.id, {
      ...productInput,
      images: [{ id: p.images[0].id }],
      expectedVersion: p.version,
    }),
  ).rejects.toThrow();
  expect((await getProduct(actor, p.id)).version).toBe(saved.version);
});
