import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { createProduct } from "@/server/products";
import { saveCollection } from "@/server/collections";
import { catalogPage } from "@/server/storefront";
import { productInput } from "../fixtures/product";
setupDatabase();
it("combines price, availability, collection and search before pagination and counting", async () => {
  const actor = await seedUser();
  const image = { bytes: new Uint8Array([1]), mimeType: "image/webp" as const };
  const ids: string[] = [];
  for (let n = 0; n < 14; n++) {
    const p = await createProduct(
      actor,
      {
        ...productInput,
        name: `Vaso ${n}`,
        price: n === 13 ? "20.51" : "20.50",
        availability: "MADE_TO_ORDER",
      },
      { a: image },
    );
    ids.push(p.id);
  }
  const consult = await createProduct(
    actor,
    {
      ...productInput,
      name: "Vaso consulta",
      publicPriceMode: "CONSULT",
      availability: "MADE_TO_ORDER",
    },
    { a: image },
  );
  await createProduct(
    actor,
    {
      ...productInput,
      name: "Vaso oculto",
      price: "20.50",
      active: false,
      availability: "MADE_TO_ORDER",
    },
    { a: image },
  );
  await createProduct(
    actor,
    {
      ...productInput,
      name: "Vaso fora",
      price: "20.50",
      availability: "AVAILABLE",
    },
    { a: image },
  );
  const c = await saveCollection(actor, undefined, {
    name: "Coleção",
    description: "",
    active: true,
    position: 0,
    productIds: [...ids, consult.id],
  });
  const filters = {
    priceMin: "20,50",
    priceMax: "20.50",
    availability: "MADE_TO_ORDER",
  };
  const first = await catalogPage(c.id, "vaso", "menor-preco", 1, filters);
  expect(first.total).toBe(13);
  expect(first.pages).toBe(2);
  expect(first.products).toHaveLength(12);
  expect(
    (await catalogPage(c.id, "vaso", "menor-preco", 2, filters)).products,
  ).toHaveLength(1);
  expect(
    (
      await catalogPage(c.id, "vaso", "nome", 1, {
        availability: "MADE_TO_ORDER",
      })
    ).total,
  ).toBe(15);
  expect(
    (
      await catalogPage(c.id, "vaso", "nome", 1, {
        priceMin: "0",
        availability: "AVAILABLE",
      })
    ).total,
  ).toBe(0);
  await expect(
    catalogPage(undefined, "", "nome", 1, { priceMin: "21", priceMax: "20" }),
  ).rejects.toThrow();
});
