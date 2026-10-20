/** Disposable C1 browser fixture. Run with DATABASE_URL on localhost:55431/b2t_test. */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";
import { db } from "@/lib/db";
import { createProduct, updateProduct } from "@/server/products";
import { productInput } from "./product";
import {
  emptyProductConfiguration,
  type ProductConfiguration,
} from "@/domain/products/configuration";
import { saveAppearance } from "@/server/appearance";
import { defaultAppearance } from "@/domain/appearance/validation";
import { hashPassword } from "@/server/auth/password";
import { productPath } from "@/domain/products/storefront";
const url = new URL(process.env.DATABASE_URL ?? "http://missing");
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "55431" ||
  url.pathname !== "/b2t_test"
)
  throw new Error("Only the disposable C1 database is allowed");
async function main() {
  const actor = await db.user.upsert({
    where: { email: "catalog-c1@example.test" },
    update: {},
    create: {
      email: "catalog-c1@example.test",
      name: "Demonstração C1",
      role: "ADMIN",
      passwordHash: await hashPassword("CatalogC1Fixture2026!"),
    },
  });
  const existing = await db.product.findMany({
    where: { name: { startsWith: "Demonstração C1" } },
    select: { id: true },
  });
  await db.product.deleteMany({
    where: { id: { in: existing.map((p) => p.id) } },
  });
  const appearance = await db.companyAppearance.findUnique({
    where: { id: 1 },
  });
  await saveAppearance(actor, {
    ...defaultAppearance,
    name: "B2T · Ambiente de demonstração",
    phone: "11999999999",
    email: "catalog-c1@example.test",
    slogan: "Produtos e imagens fictícios para conferência do C1.",
    storefront: {
      ...defaultAppearance.storefront,
      banners: [
        {
          title: "Detalhes que tornam cada peça sua",
          text: "Demonstração do catálogo personalizado B2T. Estas imagens e ofertas são fictícias.",
          buttonText: "Explorar a demonstração",
          collectionId: "",
        },
      ],
    },
    expectedVersion: appearance?.version ?? 0,
  });
  const logo = await sharp(await readFile("public/brand/b2t-logo.png"))
    .resize(720, 720, { fit: "contain", background: "white" })
    .webp()
    .toBuffer();
  const mascot = await sharp(await readFile("public/brand/b2t-mascote.png"))
    .resize(720, 720, { fit: "contain", background: "white" })
    .webp()
    .toBuffer();
  const uploads = {
    a: { bytes: logo, mimeType: "image/webp" as const },
    b: { bytes: mascot, mimeType: "image/webp" as const },
  };
  const products = [];
  for (let i = 0; i < 18; i++) {
    const configuration: ProductConfiguration =
      i === 0
        ? {
            formatVersion: 1,
            included:
              "Uma peça e embalagem simples. Imagens de demonstração, não representam o produto.",
            leadTimeCondition:
              "Prazo contado após confirmação da personalização.",
            fields: [
              {
                id: "name",
                label: "Nome na peça",
                help: "Escreva como deseja receber.",
                required: true,
                type: "SHORT_TEXT",
                maxLength: 120,
                effect: { kind: "ADD", amount: "5.00" },
              },
              {
                id: "finish",
                label: "Acabamento",
                help: "Escolha o acabamento para esta peça.",
                required: true,
                type: "SINGLE_CHOICE",
                options: [
                  {
                    id: "matte",
                    label: "Fosco",
                    effect: { kind: "NONE" },
                    imageId: null,
                  },
                  {
                    id: "special",
                    label: "Especial",
                    effect: { kind: "CONSULT" },
                    imageId: null,
                  },
                ],
              },
              {
                id: "notes",
                label: "Orientação de arte",
                help: "Descreva sua ideia, sem enviar arquivos nesta etapa.",
                required: false,
                type: "LONG_TEXT",
                maxLength: 500,
                effect: { kind: "NONE" },
              },
            ],
          }
        : emptyProductConfiguration;
    let p = await createProduct(
      actor,
      {
        ...productInput,
        name: `Demonstração C1 ${String(i).padStart(2, "0")} · ${i === 0 ? "Peça com seu nome" : i === 1 ? "Criação sob consulta" : i === 2 ? "Peça indisponível" : "Peça do catálogo"}`,
        shortDescription:
          "Demonstração identificada: oferta e imagens fictícias.",
        description:
          "Este produto existe somente no ambiente de teste. As imagens de marca servem como demonstração da galeria; não representam uma peça real.",
        price: i === 1 ? "987654.32" : String(25 + i),
        configuration,
        publicPriceMode: i === 1 ? "CONSULT" : "REFERENCE",
        availability: i === 2 ? "UNAVAILABLE" : "MADE_TO_ORDER",
        leadTimeDays: 7,
        colors: i === 0 ? ["Azul", "Branco"] : [],
        sizes: i === 0 ? ["P", "M"] : [],
        images: [{ uploadKey: "a" }, { uploadKey: "b" }],
      },
      uploads,
    );
    if (i === 0) {
      const c = p.configuration!;
      for (const f of c.fields)
        if (f.type === "SINGLE_CHOICE")
          for (const [j, o] of f.options.entries()) o.imageId = p.images[j].id;
      p = await updateProduct(actor, p.id, {
        ...productInput,
        name: p.name,
        shortDescription: p.shortDescription,
        description: p.description,
        price: p.price,
        configuration: c,
        availability: p.availability,
        leadTimeDays: p.leadTimeDays,
        colors: p.colors,
        sizes: p.sizes,
        images: p.images.map((image) => ({ id: image.id })),
        expectedVersion: p.version,
      });
    }
    products.push({
      id: p.id,
      path: productPath(p),
      price: p.price,
      revision: p.commercialRevision,
      name: p.name,
    });
  }
  await mkdir("test-results/catalog-c1", { recursive: true });
  await writeFile(
    "test-results/catalog-c1/fixture.json",
    JSON.stringify({ products, email: actor.email }, null, 2),
  );
  console.log(`C1 fixture: ${products.length} disposable products`);
}
main().finally(() => db.$disconnect());
