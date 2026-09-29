import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
export async function lockCatalog(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('b2t:catalog-memberships'))`;
}
export async function setProductCollections(
  tx: Prisma.TransactionClient,
  productId: string,
  ids: string[],
) {
  const current = (
    await tx.collectionProduct.findMany({ where: { productId } })
  ).map((c) => c.collectionId);
  if (
    (await tx.collection.count({ where: { id: { in: ids } } })) !== ids.length
  )
    throw new AppError("VALIDATION", "Coleção indisponível. Atualize a lista.");
  const added = ids.filter((id) => !current.includes(id)),
    removed = current.filter((id) => !ids.includes(id));
  await tx.collectionProduct.deleteMany({
    where: { productId, collectionId: { in: removed } },
  });
  if (added.length)
    await tx.collectionProduct.createMany({
      data: added.map((collectionId) => ({ collectionId, productId })),
    });
  await tx.collection.updateMany({
    where: { id: { in: [...added, ...removed] } },
    data: { version: { increment: 1 } },
  });
}
export async function setCollectionProducts(
  tx: Prisma.TransactionClient,
  collectionId: string,
  ids: string[],
) {
  const current = (
    await tx.collectionProduct.findMany({ where: { collectionId } })
  ).map((c) => c.productId);
  if ((await tx.product.count({ where: { id: { in: ids } } })) !== ids.length)
    throw new AppError("VALIDATION", "Produto indisponível. Atualize a lista.");
  const added = ids.filter((id) => !current.includes(id)),
    removed = current.filter((id) => !ids.includes(id));
  await tx.collectionProduct.deleteMany({
    where: { collectionId, productId: { in: removed } },
  });
  if (added.length)
    await tx.collectionProduct.createMany({
      data: added.map((productId) => ({ collectionId, productId })),
    });
  await tx.product.updateMany({
    where: { id: { in: [...added, ...removed] } },
    data: { version: { increment: 1 } },
  });
}
