import { Prisma } from "@prisma/client";
import { lockCatalog } from "@/server/catalog-memberships";
export async function lockKitCatalog(
  tx: Prisma.TransactionClient,
  productIds: string[],
  kitIds: string[],
) {
  await lockCatalog(tx);
  const products = [...new Set(productIds)].sort(),
    kits = [...new Set(kitIds)].sort();
  if (products.length)
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "Product" WHERE id IN (${Prisma.join(products)}) ORDER BY id FOR SHARE`,
    );
  if (kits.length)
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "CatalogKit" WHERE id IN (${Prisma.join(kits)}) ORDER BY id FOR SHARE`,
    );
}
