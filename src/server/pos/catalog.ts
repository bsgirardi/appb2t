import type { Prisma, Product } from "@prisma/client";
import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import { requireProductionActor } from "@/server/production/commands";
import {
  originBalance,
  restrictedOriginSale,
} from "@/server/production/finished-stock";
import { readProductConfiguration } from "@/domain/products/configuration";
import { quantityTiersSchema } from "@/domain/products/quantity-pricing";
import { z } from "zod";
import type { PosProduct } from "@/domain/pos/types";
export function posProductReason(p: Product): string | null {
  if (!p.active || p.availability !== "AVAILABLE")
    return "Disponibilidade exige atendimento comercial.";
  if (p.publicPriceMode !== "REFERENCE" || !p.price.gt(0))
    return "Preço precisa de conferência comercial.";
  if (
    readProductConfiguration(p.configuration).fields.length ||
    p.colors.length ||
    p.sizes.length
  )
    return "Configure este produto no fluxo comercial.";
  return null;
}
export async function availablePosOrigins(
  tx: Prisma.TransactionClient,
  productId: string,
) {
  const origins = await tx.finishedOrigin.findMany({
    where: { stock: { productId, active: true, inventoriedAt: { not: null } } },
    include: { stock: true },
    orderBy: { sequence: "asc" },
  });
  const result = [];
  for (const origin of origins) {
    if (await restrictedOriginSale(tx, origin.id)) continue;
    const available = Number((await originBalance(tx, origin.id)).available);
    if (available > 0) result.push({ ...origin, available });
  }
  return result;
}
export async function posCatalog(
  actor: Actor,
  query = "",
  productIds: string[] = [],
): Promise<PosProduct[]> {
  await requireProductionActor(actor);
  z.array(z.string().min(1).max(100)).max(100).parse(productIds);
  return db.$transaction(
    async (tx) => {
      const products = await tx.product.findMany({
        where: productIds.length
          ? { id: { in: productIds } }
          : {
              active: true,
              ...(query
                ? {
                    OR: [
                      {
                        name: {
                          contains: query.slice(0, 160),
                          mode: "insensitive" as const,
                        },
                      },
                      {
                        sku: {
                          contains: query.slice(0, 160),
                          mode: "insensitive" as const,
                        },
                      },
                    ],
                  }
                : {}),
            },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: productIds.length ? 100 : 80,
      });
      return Promise.all(
        products.map(async (p) => {
          const available = (await availablePosOrigins(tx, p.id)).reduce(
            (s, o) => s + o.available,
            0,
          );
          return {
            id: p.id,
            name: p.name,
            sku: p.sku ?? "",
            price: p.price.toFixed(2),
            commercialRevision: p.commercialRevision,
            minimumQuantity: p.minimumQuantity,
            quantityTiers: quantityTiersSchema.parse(p.quantityTiers),
            available,
            reason:
              posProductReason(p) ??
              (available < p.minimumQuantity
                ? "Sem peças prontas livres suficientes."
                : null),
          };
        }),
      );
    },
    { isolationLevel: "RepeatableRead" },
  );
}
