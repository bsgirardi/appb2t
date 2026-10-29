import { collectionLinks } from "@/domain/collections/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "./auth/session";
import type { NormalizedImage } from "./product-images";
import type {
  CollectionDTO,
  PublicCollectionDTO,
} from "@/domain/collections/types";
import { collectionSchema } from "@/domain/collections/validation";
import { lockCatalog, setCollectionProducts } from "./catalog-memberships";
const include = {
  products: { select: { productId: true } },
  image: { select: { collectionId: true } },
};
type Row = Prisma.CollectionGetPayload<{ include: typeof include }>;
function dto(c: Row): CollectionDTO {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    active: c.active,
    position: c.position,
    version: c.version,
    productIds: c.products.map((p) => p.productId),
    imageUrl: c.image ? `/api/collections/${c.id}/image` : null,
  };
}
export async function listCollections(_actor: Actor): Promise<CollectionDTO[]> {
  void _actor;
  return (
    await db.collection.findMany({
      include,
      orderBy: [{ position: "asc" }, { name: "asc" }],
    })
  ).map(dto);
}
export async function saveCollection(
  _actor: Actor,
  id: string | undefined,
  raw: unknown,
  image?: NormalizedImage,
): Promise<CollectionDTO> {
  const { productIds, expectedVersion, removeImage, ...data } =
    collectionSchema.parse(raw);
  if (id && !expectedVersion)
    throw new AppError("VALIDATION", "Versão obrigatória.");
  return db.$transaction(async (tx) => {
    await lockCatalog(tx);
    if (id) {
      const update = await tx.collection.updateMany({
        where: { id, version: expectedVersion },
        data: { ...data, version: { increment: 1 } },
      });
      if (!update.count) throw conflict();
    } else id = (await tx.collection.create({ data })).id;
    await setCollectionProducts(tx, id, productIds);
    if (removeImage)
      await tx.collectionImage.deleteMany({ where: { collectionId: id } });
    if (image) {
      const data = {
        bytes: Buffer.from(image.bytes),
        mimeType: image.mimeType,
      };
      await tx.collectionImage.upsert({
        where: { collectionId: id },
        create: { collectionId: id, ...data },
        update: data,
      });
    }
    return dto(
      await tx.collection.findUniqueOrThrow({ where: { id }, include }),
    );
  });
}
export async function listPublicCollections(): Promise<PublicCollectionDTO[]> {
  const rows = await db.collection.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      active: true,
      id: true,
      name: true,
      description: true,
      image: { select: { collectionId: true } },
      products: {
        where: { product: { active: true } },
        orderBy: { product: { name: "asc" } },
        take: 1,
        select: { productId: true },
      },
    },
  });
  return collectionLinks(rows)
    .filter((c) => c.active)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      imageUrl: c.image
        ? `/api/collections/${c.id}/image`
        : c.products[0]
          ? `/api/products/${c.products[0].productId}/image`
          : null,
    }));
}
export async function getCollectionImage(
  id: string,
  actor: Actor | null,
): Promise<NormalizedImage> {
  const row = await db.collectionImage.findFirst({
    where: { collectionId: id, collection: actor ? {} : { active: true } },
    select: { bytes: true },
  });
  if (!row) throw new AppError("NOT_FOUND", "Imagem não encontrada.");
  return { bytes: row.bytes, mimeType: "image/webp" };
}
