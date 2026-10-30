import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import type {
  SavedComparison,
  ComparisonPage,
  CalculatedAlternative,
} from "@/domain/pricing/comparisons/types";
import { comparisonQuerySchema } from "@/domain/pricing/comparisons/validation";
import type { PricingV2Input, PricingV2Result } from "@/domain/pricing/types";
export function assertComparisonActor(actor: Actor) {
  if (!actor?.id || !["ADMIN", "OPERATOR"].includes(actor.role))
    throw new AppError("UNAUTHENTICATED", "Entre para consultar cenários.");
}
const include = {
  items: { orderBy: { position: "asc" as const }, include: { snapshot: true } },
};
type Row = Prisma.PricingComparisonGetPayload<{ include: typeof include }>;
export function comparisonDTO(row: Row): SavedComparison {
  const context = row.context as unknown as Pick<
    SavedComparison,
    "reference" | "originalMode" | "settingsVersion"
  >;
  return {
    id: row.id,
    name: row.name,
    actorId: row.actorId,
    actorName: row.actorName,
    createdAt: row.createdAt.toISOString(),
    contractVersion: 1,
    calculationVersion: 1,
    ...context,
    alternatives: row.items.map((item) => ({
      ...(item.context as unknown as Pick<
        CalculatedAlternative,
        "channelRef" | "discountPercent" | "metrics"
      >),
      id: item.id,
      position: item.position,
      snapshotId: item.snapshotId,
      input: item.snapshot.input as unknown as PricingV2Input,
      result: item.snapshot.result as unknown as PricingV2Result,
    })),
  };
}
export async function readComparison(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.pricingComparison.findUnique({ where: { id }, include });
  if (!row) throw new AppError("NOT_FOUND", "Comparação não encontrada.");
  return comparisonDTO(row);
}
export async function getPricingComparison(
  actor: Actor,
  id: string,
): Promise<SavedComparison> {
  assertComparisonActor(actor);
  z.string().min(1).max(100).parse(id);
  return readComparison(db, id);
}
export async function listPricingComparisons(
  actor: Actor,
  raw: { search?: string; cursor?: string; limit?: number },
): Promise<ComparisonPage> {
  assertComparisonActor(actor);
  const query = comparisonQuerySchema.parse(raw);
  let after: { createdAt: Date; id: string } | null = null;
  if (query.cursor) {
    try {
      const parsed = z
        .object({ date: z.iso.datetime(), id: z.string().min(1).max(100) })
        .strict()
        .parse(JSON.parse(Buffer.from(query.cursor, "base64url").toString()));
      after = { createdAt: new Date(parsed.date), id: parsed.id };
    } catch {
      throw new AppError("VALIDATION", "Página inválida. Refaça a busca.");
    }
  }
  const rows = await db.pricingComparison.findMany({
    where: {
      name: query.search
        ? { contains: query.search, mode: "insensitive" }
        : undefined,
      ...(after
        ? {
            OR: [
              { createdAt: { lt: after.createdAt } },
              { createdAt: after.createdAt, id: { lt: after.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    select: {
      id: true,
      name: true,
      actorName: true,
      createdAt: true,
      context: true,
      _count: { select: { items: true } },
    },
  });
  const hasMore = rows.length > query.limit;
  const page = rows.slice(0, query.limit),
    last = page.at(-1);
  return {
    items: page.map((r) => ({
      id: r.id,
      name: r.name,
      actorName: r.actorName,
      createdAt: r.createdAt.toISOString(),
      quantity: (r.context as { quantity: number }).quantity,
      count: r._count.items,
    })),
    nextCursor:
      hasMore && last
        ? Buffer.from(
            JSON.stringify({ date: last.createdAt.toISOString(), id: last.id }),
          ).toString("base64url")
        : null,
  };
}
