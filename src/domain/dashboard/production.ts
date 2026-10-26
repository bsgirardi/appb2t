import { D, ratio, sum } from "@/server/dashboard/shared";
export function summarizeProduction(
  events: {
    id: string;
    kind: string;
    sourceId: string | null;
    goodUnits: number;
    failedUnits: number;
    reprintOf: string | null;
  }[],
) {
  const good = events.reduce((n, e) => n + e.goodUnits, 0),
    failed = events.reduce((n, e) => n + e.failedUnits, 0);
  return {
    good,
    failed,
    reprints: events.filter((e) => e.kind === "REPORT" && e.reprintOf).length,
    yield: ratio(good, good + failed),
  };
}
export function deliveryPerformance(
  sales: {
    due: string | null;
    items: { key: string; units: number }[];
    deliveries: { date: string; key: string; units: number }[];
  }[],
  from: string,
  to: string,
) {
  let count = 0,
    onTime = 0,
    withoutDate = 0;
  for (const sale of sales) {
    if (!sale.items.length) continue;
    const quantities = new Map<string, number>();
    let completed: string | null = null;
    for (const d of [...sale.deliveries].sort((a, b) =>
      a.date.localeCompare(b.date),
    )) {
      quantities.set(d.key, (quantities.get(d.key) ?? 0) + d.units);
      const full = sale.items.every(
        (i) => (quantities.get(i.key) ?? 0) >= i.units,
      );
      if (full && completed === null) completed = d.date;
      if (!full) completed = null;
    }
    if (!completed || completed < from || completed > to) continue;
    if (!sale.due) {
      withoutDate++;
      continue;
    }
    count++;
    if (completed <= sale.due) onTime++;
  }
  return { count, onTime, rate: ratio(onTime, count), withoutDate };
}
export function machineCapacity(
  batches: { id: string; minutes: string | null }[],
  availableMinutes: string | null,
) {
  const unique = [...new Map(batches.map((b) => [b.id, b])).values()];
  const committed = unique.some((b) => b.minutes === null)
    ? null
    : sum(unique.map((b) => b.minutes!));
  return {
    committed: committed?.div(60).toFixed(2) ?? null,
    free:
      committed === null || availableMinutes === null
        ? null
        : D.max(0, new D(availableMinutes).minus(committed)).div(60).toFixed(2),
  };
}
export function unprogrammedUnits(line: {
  targetUnits: number;
  events: { goodUnits: number; canceledUnits: number }[];
  planningParticipations: {
    units: number;
    settledUnits: number;
    releasedUnits: number;
    batch: { state: string };
  }[];
}) {
  const remaining =
    line.targetUnits -
    line.events.reduce((n, e) => n + e.goodUnits + e.canceledUnits, 0);
  const claimed = line.planningParticipations
    .filter((p) => !["DRAFT", "CANCELED", "CLOSED"].includes(p.batch.state))
    .reduce((n, p) => n + p.units - p.settledUnits - p.releasedUnits, 0);
  return Math.max(0, remaining - claimed);
}
