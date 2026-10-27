import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { catalogPage } from "@/server/storefront";
import { setupDatabase } from "./setup";
setupDatabase();
const make = (name: string, extra = {}) =>
  db.product.create({
    data: {
      name,
      description: "",
      price: "30",
      paymentTerms: "",
      calculation: {},
      availability: "AVAILABLE",
      ...extra,
    },
  });
it("bounds insertions, deletions, substitutions and transpositions without approximating descriptions or SKUs", async () => {
  const wanted = await make("Chaveiro azul personalizado");
  await make("Objeto distante", {
    sku: "CHAVEIRO",
    description: "chaveiro azul personalizado",
  });
  for (const search of [
    "chavero",
    "chaveirro",
    "chaveiroo",
    "chaveixo",
    "chaviero",
    "azlu",
    "personalixado",
    "personalixaxo",
  ])
    expect(await catalogPage(undefined, search, "nome", 1)).toMatchObject({
      approximate: true,
      total: 1,
      products: [{ id: wanted.id }],
    });
  for (const search of [
    "chavexxo",
    "personalixaxoo",
    "azl",
    "chave-iro",
    "CHAVEIR0",
  ])
    expect((await catalogPage(undefined, search, "nome", 1)).total).toBe(0);
});
it("finds all literal terms in any order across fields, without accents or case", async () => {
  const wanted = await make("Vaso de decoração azul", {
    sku: "BR-001",
    description: "Cerâmica artesanal",
  });
  await make("Vaso de decoração vermelho");
  expect(
    (
      await catalogPage(undefined, "AZUL decoracao ceramica BR-001", "nome", 1)
    ).products.map((p) => p.id),
  ).toEqual([wanted.id]);
  expect(
    (await catalogPage(undefined, "decorac\u0327a\u0303o AZUL", "nome", 1))
      .total,
  ).toBe(1);
  expect((await catalogPage(undefined, "   ", "nome", 1)).total).toBe(2);
  for (const term of ["%", "_", "' OR 1=1 --", "BR-002"])
    expect((await catalogPage(undefined, term, "nome", 1)).total).toBe(0);
  const literal = await make("Peça %_ especial");
  expect(
    (await catalogPage(undefined, "%_", "nome", 1)).products.map((p) => p.id),
  ).toEqual([literal.id]);
});
it("falls back only to name words, requires every term and never corrects codes or short terms", async () => {
  const wanted = await make("Chaveiro azul decoração", {
    sku: "BR-001",
    description: "cerâmica",
  });
  await make("Chaveiro vermelho");
  await make("Peça", {
    description: "chaveiro azul decoração",
    sku: "chavero",
  });
  for (const term of [
    "chavero azlu BR-001",
    "decoracaoo azul",
    "chaviero ceramica azul",
  ])
    expect(await catalogPage(undefined, term, "nome", 1)).toMatchObject({
      total: 1,
      approximate: true,
      products: [{ id: wanted.id }],
    });
  for (const term of [
    "BR-002",
    "azl",
    "chavero verde",
    "decoraxxxx",
    "chavero2",
    "chaveiro BR-002",
  ])
    expect((await catalogPage(undefined, term, "nome", 1)).total).toBe(0);
});
it("prioritizes global exact matches even on an empty page and keeps filters during fallback", async () => {
  const exact = await make("Chavero azul");
  const near = await make("Chaveiro azul", { price: "40" });
  await make("Chaveiro azul oculto", { active: false });
  await make("Chaveiro azul indisponível", { availability: "UNAVAILABLE" });
  const collection = await db.collection.create({
    data: {
      name: "Teste",
      description: "",
      products: { create: { productId: near.id } },
    },
  });
  expect(await catalogPage(undefined, "chavero azul", "nome", 1)).toMatchObject(
    { total: 1, approximate: false, products: [{ id: exact.id }] },
  );
  expect(await catalogPage(undefined, "chavero azul", "nome", 2)).toMatchObject(
    { total: 1, approximate: false, products: [] },
  );
  expect(
    await catalogPage(collection.id, "chavero azul", "menor-preco", 1, {
      availability: "AVAILABLE",
      priceMin: "35",
      priceMax: "45",
    }),
  ).toMatchObject({ total: 1, approximate: true, products: [{ id: near.id }] });
  expect(
    (
      await catalogPage(collection.id, "chavero azul", "nome", 1, {
        priceMax: "35",
      })
    ).total,
  ).toBe(0);
  await db.collection.update({
    where: { id: collection.id },
    data: { active: false },
  });
  expect(
    (await catalogPage(collection.id, "chavero azul", "nome", 1)).total,
  ).toBe(0);
});
it("paginates approximate matches and keeps consultation prices last in either direction", async () => {
  const products = [];
  for (let i = 1; i <= 13; i++)
    products.push(await make(`Chaveiro azul ${i}`, { price: String(i) }));
  const consult = await make("Chaveiro azul consulta", {
    publicPriceMode: "CONSULT",
    price: "0",
  });
  expect(
    await catalogPage(undefined, "chavero", "menor-preco", 2),
  ).toMatchObject({
    total: 14,
    pages: 2,
    approximate: true,
    products: [{ id: products[12].id }, { id: consult.id }],
  });
  expect(
    (await catalogPage(undefined, "chavero", "maior-preco", 1)).products[0].id,
  ).toBe(products[12].id);
  expect(
    (await catalogPage(undefined, "chavero", "nome", 1, { priceMin: "1" }))
      .total,
  ).toBe(13);
});
it("handles Unicode, ignorable characters and overlong stored words without broadening or crashing", async () => {
  await make("Chaveiro azul", { description: "x".repeat(5000) });
  await make("a".repeat(300));
  for (const term of [
    "\u00ad",
    "\u0301",
    "\0",
    "'",
    "\\",
    "🧡",
    "z".repeat(100),
  ])
    expect((await catalogPage(undefined, term, "nome", 1)).total).toBe(0);
});
it("keeps warm exact and approximate searches below one second on 5000 fictitious products", async () => {
  await db.product.createMany({
    data: Array.from({ length: 5000 }, (_, i) => ({
      name: `Chaveiro decoração azul ${i}`,
      description: "Peça artesanal para lembrança. ".repeat(10),
      paymentTerms: "",
      price: String(i + 1),
      calculation: {},
    })),
  });
  for (const search of ["AZUL decoracao", "chavero azlu", "inexistente"])
    await catalogPage(undefined, search, "nome", 1);
  for (const search of ["AZUL decoracao", "chavero azlu", "inexistente"]) {
    const start = performance.now();
    const result = await catalogPage(undefined, search, "menor-preco", 1);
    const elapsed = performance.now() - start;
    console.info(
      JSON.stringify({
        search,
        products: 5000,
        total: result.total,
        elapsedMs: Math.round(elapsed),
      }),
    );
    expect(elapsed).toBeLessThan(1000);
    expect(result.total).toBe(search === "inexistente" ? 0 : 5000);
    expect(result.products).toHaveLength(search === "inexistente" ? 0 : 12);
  }
});
