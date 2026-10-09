import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { LineCostDTO } from "@/domain/production/costs";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { lineContext, lockOrder } from "./orders";
import { lockProduction } from "./locks";
import { requireProductionActor } from "./commands";
import { readProductionCost } from "./cost-sources";
export async function ensureProductionCostRevision(
  tx: Prisma.TransactionClient,
  lineId: string,
): Promise<LineCostDTO> {
  await lineContext(tx, lineId);
  const links = await tx.productionMaterialLink.findMany({
    where: { event: { lineId } },
    include: { movement: true },
  });
  await lockProduction(tx, { itemIds: links.map((l) => l.movement.itemId) });
  const { result, factsHash, facts } = await readProductionCost(tx, lineId);
  const revision = await tx.productionCostRevision.upsert({
    where: { lineId_factsHash: { lineId, factsHash } },
    create: {
      lineId,
      factsHash,
      result: {
        ...result,
        sources: facts.sources,
      } as unknown as Prisma.InputJsonValue,
    },
    update: {},
  });
  return { ...result, revisionId: revision.id };
}
export async function refreshProductionCosts(
  actor: Actor,
  orderId: string,
): Promise<LineCostDTO[]> {
  assertAdmin(actor);
  await requireProductionActor(actor);
  return db.$transaction(
    async (tx) => {
      const o = await lockOrder(tx, orderId);
      const origins = await tx.finishedOrigin.findMany({
        where: { line: { orderId } },
        select: { stockId: true },
      });
      await lockProduction(tx, { finishedIds: origins.map((x) => x.stockId) });
      const links = await tx.productionMaterialLink.findMany({
        where: { event: { line: { orderId } } },
        include: { movement: true },
      });
      await lockProduction(tx, {
        itemIds: links.map((l) => l.movement.itemId),
      });
      const result = [];
      for (const l of o.lines)
        result.push(await ensureProductionCostRevision(tx, l.id));
      return result;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
