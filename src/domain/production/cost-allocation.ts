import { StockDecimal as D } from "@/domain/stock/quantities";
import { allocate } from "@/domain/profitability/allocation";
import type { Money, AllocationWeight } from "@/domain/profitability/types";
import { apportionProductionCost } from "./costs";
export function allocateCostComponents(
  total: Money,
  components: Record<string, Money>,
  weights: AllocationWeight[],
) {
  // U3 rounds the total and each component separately. Keep the authoritative
  // total and depreciation; reconcile only the variable-cost rounding residue.
  const normalized = { ...components };
  if ("depreciation" in normalized)
    normalized.depreciation = D.min(total, normalized.depreciation).toFixed();
  const variableKeys = Object.keys(normalized)
    .filter((k) => k !== "depreciation")
    .sort();
  const variableTotal = new D(total).minus(normalized.depreciation ?? "0");
  const componentTotal = variableKeys.reduce(
    (s, k) => s.plus(normalized[k]),
    new D(0),
  );
  if (!componentTotal.eq(variableTotal) && variableKeys.length) {
    const reconciled = allocate(
      variableTotal.toFixed(),
      variableKeys.map((key, position) => ({
        key,
        position,
        weight: componentTotal.isZero()
          ? position === 0
            ? "1"
            : "0"
          : normalized[key],
      })),
      6,
    );
    for (const part of reconciled) normalized[part.key] = part.value;
  }
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
  const keys = Object.keys(normalized).sort((a, b) =>
    a === "depreciation" ? -1 : b === "depreciation" ? 1 : a.localeCompare(b),
  );
  for (const key of keys) {
    const component = new D(normalized[key]).toDecimalPlaces(6);
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
