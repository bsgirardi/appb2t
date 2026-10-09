import { StockDecimal as D } from "@/domain/stock/quantities";
import { allocate } from "@/domain/profitability/allocation";
import type { Money, AllocationWeight } from "@/domain/profitability/types";
import { apportionProductionCost } from "./costs";
export function allocateCostComponents(
  total: Money,
  components: Record<string, Money>,
  weights: AllocationWeight[],
) {
  const values = apportionProductionCost(
    total,
    weights.map((w) => Number(w.weight)),
  ).map((v) => v!);
  const remaining = values.map((v) => new D(v));
  const rows = weights.map((w, i) => ({
    key: w.key,
    total: values[i],
    components: {} as Record<string, Money>,
  }));
  const keys = Object.keys(components).sort((a, b) =>
    a === "depreciation" ? -1 : b === "depreciation" ? 1 : a.localeCompare(b),
  );
  for (const key of keys) {
    const component = new D(components[key]).toDecimalPlaces(6);
    const suggested = allocate(component.toFixed(), weights, 6);
    const assigned = suggested.map((v, i) => D.min(v.value, remaining[i]));
    const overflow = component.minus(
      assigned.reduce((s, v) => s.plus(v), new D(0)),
    );
    if (overflow.gt(0)) {
      const extra = allocate(
        overflow.toFixed(),
        weights.map((w, i) => ({
          ...w,
          weight: remaining[i].minus(assigned[i]).toFixed(),
        })),
        6,
      );
      extra.forEach((v, i) => {
        assigned[i] = assigned[i].plus(v.value);
      });
    }
    assigned.forEach((v, i) => {
      rows[i].components[key] = v.toFixed();
      remaining[i] = remaining[i].minus(v);
    });
  }
  return rows;
}
