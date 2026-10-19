import {
  publicProductSelect as publicSelect,
  toPublicProduct as publicDTO,
} from "./product-public";
import {
  nextCommercialRevision,
  productConfigurationForSave,
} from "./product-commercial";
import { Prisma, type Product } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import {
  validateProduct,
  updateProductSchema,
  productStateSchema,
} from "@/domain/products/validation";
import { validateCalculation } from "@/domain/calculation/validation";
import {
  storedCalculationSchema,
  isBatchCalculation,
} from "@/domain/pricing/product-calculations";
import { getPricingSnapshot } from "./pricing/estimates";
import { recordProductCalculationRevision } from "./pricing/product-calculations";
import type {
  ProductInput,
  ProductDTO,
  PublicProductDTO,
  ImageSelection,
} from "@/domain/products/types";
import type { Actor } from "./auth/session";
import type { NormalizedImage } from "./product-images";
import { lockCatalog, setProductCollections } from "./catalog-memberships";
const notFound = () => new AppError("NOT_FOUND", "Produto não encontrado.");
async function dto(
  row: Product & {
    images: { id: string; position: number }[];
    collections: { collectionId: string }[];
  },
  tx: Prisma.TransactionClient = db,
): Promise<ProductDTO> {
  const calculation = storedCalculationSchema.parse(row.calculation);
  return {
    ...publicDTO(row),
    price: row.price.toFixed(2),
    active: row.active,
    collectionIds: row.collections.map((c) => c.collectionId),
    version: row.version,
    materialId: row.materialId,
    printerId: row.printerId,
    calculation,
    ...(isBatchCalculation(calculation)
      ? {
          pricingSnapshot: await getPricingSnapshot(tx, calculation.snapshotId),
        }
      : {}),
  };
}
async function references(
  tx: Prisma.TransactionClient,
  input: ProductInput,
  old?: Product,
) {
  if (
    input.sku &&
    (await tx.product.findFirst({
      where: { sku: input.sku, ...(old ? { id: { not: old.id } } : {}) },
      select: { id: true },
    }))
  )
    throw new AppError(
      "VALIDATION",
      "Este código de produto já está em uso. Informe outro código.",
    );
  if (isBatchCalculation(input.calculation)) {
    const snapshot = await getPricingSnapshot(tx, input.calculation.snapshotId);
    input.materialId = null;
    input.printerId = snapshot.input.printer.ref.id;
    return;
  }
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
      !isBatchCalculation(storedCalculationSchema.parse(old.calculation)) &&
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
  const { images: _images, collectionIds: _collectionIds, ...fields } = input;
  void _collectionIds;
  void _images;
  return {
    ...fields,
    ...(input.sku !== undefined ? { sku: input.sku || null } : {}),
    materialId: input.materialId ?? null,
    printerId: input.printerId ?? null,
    configuration: input.configuration as unknown as Prisma.InputJsonValue,
    calculation: input.calculation as unknown as Prisma.InputJsonValue,
    price: input.price,
  };
}
const imageInclude = {
  collections: { select: { collectionId: true } },
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
  const input = validateProduct(raw);
  validateImages(input.images, uploads, []);
  return db.$transaction(async (tx) => {
    await lockCatalog(tx);
    await references(tx, input);
    input.configuration = productConfigurationForSave(input, []);
    const data = dataFor(input);
    const row = await tx.product.create({
      data: {
        ...data,
      },
    });
    await saveImages(tx, row.id, input.images, uploads);
    await setProductCollections(tx, row.id, input.collectionIds);
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
  const { expectedVersion, ...input } = updateProductSchema.parse(raw);
  return db.$transaction(async (tx) => {
    await lockCatalog(tx);
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
    input.configuration = productConfigurationForSave(
      input,
      old.images.map((i) => i.id),
      old,
    );
    input.publicPriceMode ??= old.publicPriceMode as "REFERENCE" | "CONSULT";
    const data = dataFor(input);
    if (
      JSON.stringify(storedCalculationSchema.parse(old.calculation)) !==
      JSON.stringify(input.calculation)
    )
      await recordProductCalculationRevision(tx, _actor, old);
    const updated = await tx.product.updateMany({
      where: { id, version: expectedVersion },
      data: {
        ...data,
        commercialRevision: nextCommercialRevision(old, input),
        version: { increment: 1 },
      },
    });
    if (!updated.count) throw conflict();
    await saveImages(tx, id, input.images, uploads);
    await setProductCollections(tx, id, input.collectionIds);
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
  return Promise.all(
    (
      await db.product.findMany({
        include: imageInclude,
        orderBy: [{ active: "desc" }, { name: "asc" }],
      })
    ).map((row) => dto(row)),
  );
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
export async function listPublicProducts(
  collectionId?: string,
): Promise<PublicProductDTO[]> {
  return (
    await db.product.findMany({
      where: {
        active: true,
        ...(collectionId
          ? {
              collections: {
                some: { collectionId, collection: { active: true } },
              },
            }
          : {}),
      },
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
