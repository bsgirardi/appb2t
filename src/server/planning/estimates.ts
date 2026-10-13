import type { Prisma } from "@prisma/client";
import { z } from "zod";
import Decimal from "decimal.js";
import { stockQuantity } from "@/domain/stock/validation";
const input = z.object({
  version: z.literal(2),
  quantity: z.number().int().positive(),
  machineFixedMinutes: stockQuantity,
  machineMinutesPerUnit: stockQuantity,
});
const bindings = z.array(
  z.object({ lineId: z.string(), snapshotId: z.string(), state: z.string() }),
);
export async function operationalEstimates(
  tx: Prisma.TransactionClient,
  participants: { lineId: string; units: number }[],
) {
  const results: {
    lineId: string;
    snapshotId: string;
    sourceQuantity: number;
    units: number;
    minutes: string;
  }[] = [];
  for (const p of participants) {
    const l = await tx.productionLine.findUniqueOrThrow({
      where: { id: p.lineId },
      include: { order: { include: { sale: true } }, product: true },
    });
    let snapshotId: string | null = null;
    if (l.order.sale?.costRevisionId) {
      const revision = await tx.documentCostRevision.findUnique({
        where: { id: l.order.sale.costRevisionId },
      });
      const parsed = bindings.safeParse(revision?.bindings);
      if (revision?.saleId === l.order.saleId && parsed.success)
        snapshotId =
          parsed.data.find(
            (b) => b.lineId === l.saleLineKey && b.state === "VALID",
          )?.snapshotId ?? null;
    } else if (!l.order.saleId && l.product) {
      const ref = z
        .object({ version: z.literal(2), snapshotId: z.string() })
        .safeParse(l.product.calculation);
      if (ref.success) snapshotId = ref.data.snapshotId;
    }
    if (!snapshotId) continue;
    const s = await tx.pricingSnapshot.findUnique({
        where: { id: snapshotId },
      }),
      parsed = input.safeParse(s?.input);
    if (!parsed.success) continue;
    results.push({
      lineId: p.lineId,
      snapshotId,
      sourceQuantity: parsed.data.quantity,
      units: p.units,
      minutes: new Decimal(parsed.data.machineFixedMinutes)
        .plus(new Decimal(parsed.data.machineMinutesPerUnit).times(p.units))
        .toFixed(),
    });
  }
  return results;
}
