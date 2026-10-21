import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { KitDTO } from "@/domain/kits/types";
import { kitDiscountTiersSchema } from "@/domain/kits/validation";
export const kitInclude = {
  products: {
    select: { productId: true },
    orderBy: { productId: "asc" as const },
  },
} satisfies Prisma.CatalogKitInclude;
export function kitDTO(
  row: Prisma.CatalogKitGetPayload<{ include: typeof kitInclude }>,
): KitDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    position: row.position,
    version: row.version,
    commercialRevision: row.commercialRevision,
    productIds: row.products.map((p) => p.productId),
    tiers: kitDiscountTiersSchema.parse(row.tiers),
  };
}
const eligible = { active: true, availability: { not: "UNAVAILABLE" } };
export async function listPublicKits(): Promise<KitDTO[]> {
  return (
    await db.catalogKit.findMany({
      where: { active: true, products: { some: { product: eligible } } },
      include: {
        products: {
          where: { product: eligible },
          select: { productId: true },
          orderBy: { productId: "asc" },
        },
      },
      orderBy: [{ position: "asc" }, { name: "asc" }, { id: "asc" }],
    })
  ).map(kitDTO);
}
export async function getPublicKit(id: string): Promise<KitDTO | null> {
  const row = await db.catalogKit.findFirst({
    where: { id, active: true, products: { some: { product: eligible } } },
    include: {
      products: {
        where: { product: eligible },
        select: { productId: true },
        orderBy: { productId: "asc" },
      },
    },
  });
  return row ? kitDTO(row) : null;
}
