import type { Prisma } from "@prisma/client";
export async function lockOperation(tx: Prisma.TransactionClient, key: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`;
}
export async function lockCommerce(
  tx: Prisma.TransactionClient,
  ids: { quoteId?: string; saleId?: string; entryIds?: string[] },
) {
  if (ids.quoteId)
    await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${ids.quoteId} FOR UPDATE`;
  if (ids.saleId)
    await tx.$queryRaw`SELECT id FROM "Sale" WHERE id=${ids.saleId} FOR UPDATE`;
  for (const id of [...new Set(ids.entryIds ?? [])].sort())
    await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id=${id} FOR UPDATE`;
}
