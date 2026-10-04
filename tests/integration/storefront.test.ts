import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import {
  createProduct,
  updateProduct,
  setProductActive,
  getProduct,
} from "@/server/products";
import {
  catalogPage,
  publicProduct,
  productMetadata,
  relatedProducts,
} from "@/server/storefront";
import { saveCollection } from "@/server/collections";
import sitemap from "@/app/sitemap";
import { productInput } from "../fixtures/product";
setupDatabase();
const image = {
  bytes: new Uint8Array([1, 2, 3]),
  mimeType: "image/webp" as const,
};
it("relates only distinct visible products through active shared collections, with a four-item limit", async () => {
  const actor = await seedUser();
  const create = (name: string, extra = {}) => createProduct(actor, { ...productInput, name, ...extra }, { a: image });
  const current = await create("Produto principal");
  const related = [];
  for (let i = 0; i < 5; i++) related.push(await create(`Relacionado ${i}`));
  const hidden = await create("A oculto", { active: false });
  const unavailable = await create("B indisponível", { availability: "UNAVAILABLE" });
  const other = await create("C outra coleção");
  const save = (name: string, active: boolean, productIds: string[]) => saveCollection(actor, undefined, {
    name, active, productIds, description: "", position: 0,
  });
  await save("Coleção compartilhada", true, [current.id, ...related.map(p => p.id), hidden.id, unavailable.id]);
  await save("Coleção repetida", true, [current.id, related[0].id]);
  await save("Coleção oculta", false, [current.id, other.id]);
  const result = await relatedProducts(current.id);
  expect(result.map(p => p.id)).toEqual(related.slice(0, 4).map(p => p.id));
  expect(result[0]).not.toHaveProperty("calculation");
  expect(await relatedProducts(other.id)).toEqual([]);
  expect(await relatedProducts("inexistente")).toEqual([]);
  await setProductActive(actor, current.id, false, (await getProduct(actor, current.id)).version);
  expect(await relatedProducts(current.id)).toEqual([]);
});
it("persists editable SEO, uses public metadata and removes unpublished products everywhere", async () => {
  const actor = await seedUser();
  const product = await createProduct(
    actor,
    {
      ...productInput,
      seoTitle: "Vaso artesanal",
      seoDescription: "Descrição personalizada",
    },
    { a: image },
  );
  const published = await publicProduct(product.id);
  expect(published?.seoTitle).toBe("Vaso artesanal");
  expect(published).not.toHaveProperty("calculation");
  expect(productMetadata(published!, "B2T")).toMatchObject({
    title: "Vaso artesanal",
    description: "Descrição personalizada",
    robots: { index: true, follow: true },
  });
  expect((await sitemap()).some((p) => p.url.includes(product.id))).toBe(true);
  const edited = await updateProduct(actor, product.id, {
    ...productInput,
    images: product.images.map((i) => ({ id: i.id })),
    seoTitle: "",
    seoDescription: "",
    expectedVersion: product.version,
  });
  expect(
    productMetadata((await publicProduct(product.id))!, "B2T").title,
  ).toContain(product.name);
  await setProductActive(actor, product.id, false, edited.version);
  expect(await publicProduct(product.id)).toBeNull();
  expect((await catalogPage(undefined, "", "nome", 1)).total).toBe(0);
  expect((await sitemap()).some((p) => p.url.includes(product.id))).toBe(false);
});
it("searches and paginates only active products with numeric price sorting", async () => {
  const actor = await seedUser();
  for (let i = 1; i <= 13; i++)
    await createProduct(
      actor,
      { ...productInput, name: `Vaso ${i}`, price: `${i}.00` },
      { a: image },
    );
  await createProduct(
    actor,
    { ...productInput, name: "Vaso oculto", active: false },
    { a: image },
  );
  const first = await catalogPage(undefined, "vaso", "maior-preco", 1);
  expect(first.total).toBe(13);
  expect(first.products).toHaveLength(12);
  expect(first.products[0].price).toBe("13.00");
  expect(
    (await catalogPage(undefined, "vaso", "maior-preco", 2)).products[0].price,
  ).toBe("1.00");
  expect((await catalogPage(undefined, "inexistente", "nome", 1)).total).toBe(
    0,
  );
});
