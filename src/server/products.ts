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
  ImageSelection,
} from "@/domain/products/types";
import type { Actor } from "./auth/session";
import type { NormalizedImage } from "./product-images";
const notFound = () => new AppError("NOT_FOUND", "Produto não encontrado.");
const publicSelect = {
  images: {
    select: { id: true, position: true },
    orderBy: { position: "asc" as const },
  },
  id: true,
  name: true,
  description: true,
  paymentTerms: true,
  price: true,
} as const;
function publicDTO(
  row: Pick<
    Product,
    "id" | "name" | "description" | "paymentTerms" | "price"
  > & { images: { id: string; position: number }[] },
): PublicProductDTO {
  return {
    ...row,
    price: row.price.toFixed(2),
    images: row.images.map((i) => ({
      ...i,
      url: `/api/products/${row.id}/images/${i.id}`,
    })),
    imageUrl: `/api/products/${row.id}/image`,
  };
}
function dto(
  row: Product & { images: { id: string; position: number }[] },
): ProductDTO {
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
  const { images: _images, ...fields } = input;
  void _images;
  return {
    ...fields,
    materialId: input.materialId ?? null,
    printerId: input.printerId ?? null,
    calculation: input.calculation as unknown as Prisma.InputJsonValue,
    price: input.price,
  };
}
const imageInclude = {
  images: {
    select: { id: true, position: true },
    orderBy: { position: "asc" as const },
  },
};
function validateImages(
  images: ImageSelection[],
  uploads: Record<string, NormalizedImage>,
  existing: string[],
) {
  const keys = images.flatMap((i) => ("uploadKey" in i ? [i.uploadKey] : []));
  if (
    Object.keys(uploads).length !== keys.length ||
    keys.some((k) => !uploads[k]?.bytes.byteLength) ||
    images.some((i) => "id" in i && !existing.includes(i.id))
  )
    throw new AppError(
      "VALIDATION",
      "A galeria contém fotos inválidas. Atualize e tente novamente.",
    );
}
async function saveImages(
  tx: Prisma.TransactionClient,
  productId: string,
  images: ImageSelection[],
  uploads: Record<string, NormalizedImage>,
) {
  const ids = images.flatMap((i) => ("id" in i ? [i.id] : []));
  await tx.productImage.deleteMany({
    where: { productId, id: { notIn: ids } },
  });
  await tx.productImage.updateMany({
    where: { productId },
    data: { position: { increment: 100 } },
  });
  for (const [position, selection] of images.entries()) {
    if ("id" in selection)
      await tx.productImage.update({
        where: { id: selection.id },
        data: { position },
      });
    else {
      const image = uploads[selection.uploadKey];
      await tx.productImage.create({
        data: {
          productId,
          position,
          bytes: Buffer.from(image.bytes),
          mimeType: image.mimeType,
        },
      });
    }
  }
}
export async function createProduct(
  _actor: Actor,
  raw: unknown,
  uploads: Record<string, NormalizedImage> = {},
): Promise<ProductDTO> {
  const input = validateProduct(raw),
    data = dataFor(input);
  validateImages(input.images, uploads, []);
  return db.$transaction(async (tx) => {
    await references(tx, input);
    const row = await tx.product.create({
      data: {
        ...data,
      },
    });
    await saveImages(tx, row.id, input.images, uploads);
    return dto(
      await tx.product.findUniqueOrThrow({
        where: { id: row.id },
        include: imageInclude,
      }),
    );
  });
}
export async function updateProduct(
  _actor: Actor,
  id: string,
  raw: unknown,
  uploads: Record<string, NormalizedImage> = {},
): Promise<ProductDTO> {
  const { expectedVersion, ...input } = updateProductSchema.parse(raw),
    data = dataFor(input);
  return db.$transaction(async (tx) => {
    const old = await tx.product.findUnique({
      where: { id },
      include: imageInclude,
    });
    if (!old) throw notFound();
    validateImages(
      input.images,
      uploads,
      old.images.map((i) => i.id),
    );
    await references(tx, input, old);
    const updated = await tx.product.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (!updated.count) throw conflict();
    await saveImages(tx, id, input.images, uploads);
    return dto(
      await tx.product.findUniqueOrThrow({
        where: { id },
        include: imageInclude,
      }),
    );
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
    return dto(
      await tx.product.findUniqueOrThrow({
        where: { id },
        include: imageInclude,
      }),
    );
  });
}
export async function listProducts(_actor: Actor): Promise<ProductDTO[]> {
  void _actor;
  return (
    await db.product.findMany({
      include: imageInclude,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    })
  ).map(dto);
}
export async function getProduct(
  _actor: Actor,
  id: string,
): Promise<ProductDTO> {
  const row = await db.product.findUnique({
    where: { id },
    include: imageInclude,
  });
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
  imageId?: string,
): Promise<NormalizedImage> {
  const row = await db.productImage.findFirst({
    where: {
      productId: id,
      id: imageId,
      product: actor ? {} : { active: true },
    },
    orderBy: { position: "asc" },
    select: { bytes: true, mimeType: true },
  });
  if (!row) throw notFound();
  return { bytes: row.bytes, mimeType: "image/webp" };
}
