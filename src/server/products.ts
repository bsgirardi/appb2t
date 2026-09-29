import { Prisma, type Product } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import {
  validateProduct,
  updateProductSchema,
  productStateSchema,
} from "@/domain/products/validation";
import { validateCalculation } from "@/domain/calculation/validation";
import type {
  ProductInput,
  ProductDTO,
  PublicProductDTO,
} from "@/domain/products/types";
import type { Actor } from "./auth/session";
import type { NormalizedImage } from "./product-images";
const notFound = () => new AppError("NOT_FOUND", "Produto não encontrado.");
const publicSelect = {
  id: true,
  name: true,
  description: true,
  paymentTerms: true,
  price: true,
} as const;
function publicDTO(
  row: Pick<Product, "id" | "name" | "description" | "paymentTerms" | "price">,
): PublicProductDTO {
  return {
    ...row,
    price: row.price.toFixed(2),
    imageUrl: `/api/products/${row.id}/image`,
  };
}
function dto(row: Product): ProductDTO {
  return {
    ...publicDTO(row),
    active: row.active,
    version: row.version,
    materialId: row.materialId,
    printerId: row.printerId,
    calculation: validateCalculation(row.calculation),
  };
}
async function references(
  tx: Prisma.TransactionClient,
  input: ProductInput,
  old?: Product,
) {
  for (const key of ["materialId", "printerId"] as const) {
    const id = input[key];
    if (!id) continue;
    const record =
      key === "materialId"
        ? await tx.material.findUnique({ where: { id } })
        : await tx.printer.findUnique({ where: { id } });
    // An unchanged reference is provenance. Its saved snapshot remains editable.
    if (
      old?.[key] === id &&
      old &&
      validateCalculation(old.calculation).technology ===
        input.calculation.technology
    )
      continue;
    if (
      !record ||
      !record.active ||
      record.technology !== input.calculation.technology
    )
      throw new AppError(
        "VALIDATION",
        "Selecione material e impressora ativos, compatíveis com a tecnologia.",
      );
  }
}
function dataFor(input: ProductInput) {
  return {
    ...input,
    materialId: input.materialId ?? null,
    printerId: input.printerId ?? null,
    calculation: input.calculation as unknown as Prisma.InputJsonValue,
    price: input.price,
  };
}
export async function createProduct(
  _actor: Actor,
  raw: unknown,
  image: NormalizedImage,
): Promise<ProductDTO> {
  if (!image?.bytes.byteLength)
    throw new AppError("VALIDATION", "Envie uma foto do produto.");
  const input = validateProduct(raw),
    data = dataFor(input);
  return db.$transaction(async (tx) => {
    await references(tx, input);
    const row = await tx.product.create({
      data: {
        ...data,
        image: {
          create: { bytes: Buffer.from(image.bytes), mimeType: image.mimeType },
        },
      },
    });
    return dto(row);
  });
}
export async function updateProduct(
  _actor: Actor,
  id: string,
  raw: unknown,
  image?: NormalizedImage,
): Promise<ProductDTO> {
  const { expectedVersion, ...input } = updateProductSchema.parse(raw),
    data = dataFor(input);
  return db.$transaction(async (tx) => {
    const old = await tx.product.findUnique({ where: { id } });
    if (!old) throw notFound();
    await references(tx, input, old);
    const updated = await tx.product.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (!updated.count) throw conflict();
    if (image) {
      const imageData = {
        bytes: Buffer.from(image.bytes),
        mimeType: image.mimeType,
      };
      await tx.productImage.upsert({
        where: { productId: id },
        create: { productId: id, ...imageData },
        update: imageData,
      });
    }
    return dto(await tx.product.findUniqueOrThrow({ where: { id } }));
  });
}
export async function setProductActive(
  _actor: Actor,
  id: string,
  active: boolean,
  expectedVersion: number,
): Promise<ProductDTO> {
  productStateSchema.parse({ active, expectedVersion });
  return db.$transaction(async (tx) => {
    const result = await tx.product.updateMany({
      where: { id, version: expectedVersion },
      data: { active, version: { increment: 1 } },
    });
    if (!result.count) throw conflict();
    return dto(await tx.product.findUniqueOrThrow({ where: { id } }));
  });
}
export async function listProducts(_actor: Actor): Promise<ProductDTO[]> {
  void _actor;
  return (
    await db.product.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    })
  ).map(dto);
}
export async function getProduct(
  _actor: Actor,
  id: string,
): Promise<ProductDTO> {
  const row = await db.product.findUnique({ where: { id } });
  if (!row) throw notFound();
  return dto(row);
}
export async function listPublicProducts(): Promise<PublicProductDTO[]> {
  return (
    await db.product.findMany({
      where: { active: true },
      select: publicSelect,
      orderBy: { name: "asc" },
    })
  ).map(publicDTO);
}
export async function getProductImage(
  id: string,
  actor: Actor | null,
): Promise<NormalizedImage> {
  const row = await db.productImage.findFirst({
    where: { productId: id, product: actor ? {} : { active: true } },
    select: { bytes: true, mimeType: true },
  });
  if (!row) throw notFound();
  return { bytes: row.bytes, mimeType: "image/webp" };
}
