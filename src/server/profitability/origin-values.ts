import type { Prisma } from "@prisma/client";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { allocate } from "@/domain/profitability/allocation";
export async function readOpeningCost(
  tx: Prisma.TransactionClient,
  originId: string,
) {
  const origin = await tx.finishedOrigin.findUniqueOrThrow({
    where: { id: originId },
    include: {
      movements: true,
      commitments: { include: { events: true, deliveryLines: true } },
    },
  });
  const buckets: {
    id: string;
    kind: string;
    units: number;
    value: string | null;
  }[] = [];
  for (const c of origin.commitments) {
    for (const d of c.deliveryLines.filter((d) => !d.sourceLineId)) {
      const units =
        d.units +
        c.deliveryLines
          .filter((x) => x.sourceLineId === d.id)
          .reduce((s, x) => s + x.units, 0);
      if (units)
        buckets.push({ id: d.id, kind: "DELIVERED", units, value: null });
    }
    const reserved = c.events.reduce((s, e) => s + e.units, 0);
    if (reserved)
      buckets.push({
        id: c.id,
        kind: "RESERVED",
        units: reserved,
        value: null,
      });
  }
  for (const m of origin.movements.filter((m) =>
    ["LOSS", "ADJUSTMENT_OUT"].includes(m.kind),
  ))
    buckets.push({ id: m.id, kind: m.kind, units: -m.units, value: null });
  const initial = origin.movements
    .filter((m) => ["OPENING", "ADJUSTMENT_IN"].includes(m.kind))
    .reduce((s, m) => s + m.units, 0);
  const available = initial - buckets.reduce((s, b) => s + b.units, 0);
  if (available > 0)
    buckets.push({
      id: origin.id,
      kind: "AVAILABLE",
      units: available,
      value: null,
    });
  buckets.sort((a, b) => a.id.localeCompare(b.id));
  if (origin.initialValue !== null && initial > 0) {
    const allocated = allocate(
      origin.initialValue.toFixed(),
      buckets.map((b, i) => ({
        key: b.id,
        position: i,
        weight: String(b.units),
      })),
      6,
    );
    buckets.forEach((b, i) => (b.value = new D(allocated[i].value).toFixed()));
  }
  return { origin, buckets };
}
