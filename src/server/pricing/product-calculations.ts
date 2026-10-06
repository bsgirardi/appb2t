import type { Prisma, Product } from "@prisma/client";
import type { Actor } from "../auth/session";
import { getPricingSnapshot } from "./estimates";
import {
  storedCalculationSchema,
  isBatchCalculation,
} from "@/domain/pricing/product-calculations";
import type { StoredProductCalculation } from "@/domain/pricing/types";
export async function resolveProductCalculation(
  tx: Prisma.TransactionClient,
  _actor: Actor,
  raw: StoredProductCalculation,
) {
  const stored = storedCalculationSchema.parse(raw);
  return {
    stored,
    snapshot: isBatchCalculation(stored)
      ? await getPricingSnapshot(tx, stored.snapshotId)
      : null,
  };
}
export async function recordProductCalculationRevision(
  tx: Prisma.TransactionClient,
  actor: Actor,
  old: Product,
) {
  await tx.productCalculationRevision.create({
    data: {
      productId: old.id,
      productVersion: old.version,
      calculation: old.calculation as Prisma.InputJsonValue,
      actorId: actor.id,
      actorName: actor.name,
    },
  });
}
