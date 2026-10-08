import type { Prisma } from "@prisma/client";
export async function lockProduction(
  tx: Prisma.TransactionClient,
  ids: {
    saleIds?: string[];
    orderIds?: string[];
    finishedIds?: string[];
    itemIds?: string[];
  },
) {
  for (const id of [...new Set(ids.saleIds ?? [])].sort())
    await tx.$queryRaw`SELECT id FROM "Sale" WHERE id=${id} FOR UPDATE`;
  for (const id of [...new Set(ids.orderIds ?? [])].sort())
    await tx.$queryRaw`SELECT id FROM "ProductionOrder" WHERE id=${id} FOR UPDATE`;
  for (const id of [...new Set(ids.finishedIds ?? [])].sort())
    await tx.$queryRaw`SELECT id FROM "FinishedStock" WHERE id=${id} FOR UPDATE`;
  for (const id of [...new Set(ids.itemIds ?? [])].sort())
    await tx.$queryRaw`SELECT id FROM "StockItem" WHERE id=${id} FOR UPDATE`;
}
