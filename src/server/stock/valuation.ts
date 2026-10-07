import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { valueLedger, type ValuationEvent } from "@/domain/stock/valuation";
import type { CostMethod } from "@/domain/stock/types";
export async function revalueItem(
  tx: Prisma.TransactionClient,
  itemId: string,
): Promise<void> {
  const rows = await tx.stockMovement.findMany({
    where: { itemId },
    include: { receiptLine: true },
    orderBy: { sequence: "asc" },
  });
  const events: ValuationEvent[] = rows.map((r) => ({
    id: r.id,
    sequence: r.sequence,
    kind: r.kind,
    quantity: r.quantity.abs().toFixed(),
    confirmedValue:
      (r.receiptLine
        ? r.receiptLine.confirmedValue
        : r.confirmedValue
      )?.toFixed() ?? null,
    sourceId: r.sourceId,
    method: r.method as CostMethod,
    manualUnitCost: r.manualUnitCost?.toFixed() ?? null,
  }));
  const factsHash = createHash("sha256")
    .update(JSON.stringify(events))
    .digest("hex");
  if (
    await tx.stockValuationRevision.findUnique({
      where: { itemId_factsHash: { itemId, factsHash } },
    })
  )
    return;
  const result = valueLedger(events);
  await tx.stockValuationRevision.create({
    data: {
      itemId,
      factsHash,
      result: result as unknown as Prisma.InputJsonValue,
      allocations: { create: result.allocations },
    },
  });
}
