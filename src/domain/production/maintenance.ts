import { StockDecimal as D } from "@/domain/stock/quantities";

type ReportActivity = {
  id: string;
  kind: string;
  sourceId: string | null;
  // Good/failed units, machine/setup/finishing minutes and material quantity.
  activity: (string | null)[];
};

export function activeMaintenanceReports(
  events: ReportActivity[],
): Set<string> {
  const corrections = new Map<string, ReportActivity[]>();
  for (const e of events) {
    if (e.kind !== "CORRECTION" || !e.sourceId) continue;
    const rows = corrections.get(e.sourceId) ?? [];
    rows.push(e);
    corrections.set(e.sourceId, rows);
  }
  return new Set(
    events
      .filter((e) => {
        if (e.kind !== "REPORT") return false;
        const reversed = corrections.get(e.id);
        if (!reversed) return true;
        // Only a complete, measured reversal removes the original fixed premise.
        return e.activity.some(
          (value, i) =>
            value === null ||
            reversed.some((r) => r.activity[i] == null) ||
            !reversed
              .reduce((sum, r) => sum.plus(r.activity[i]!), new D(value))
              .isZero(),
        );
      })
      .map((e) => e.id),
  );
}
