import { StockDecimal as D, quantity } from "@/domain/stock/quantities";
import { allocate } from "@/domain/profitability/allocation";
export type CostStage = {
  machineMinutes: string | null;
  setupMinutes: string | null;
  finishingMinutes: string | null;
  watts: string | null;
  energyRate: string | null;
  maintenancePerHour: string | null;
  laborPerHour: string | null;
  acquisitionCost: string | null;
  amortizationMonths: string | null;
  daysPerMonth: string | null;
  hoursPerDay: string | null;
};
export type ProductionCostInput = {
  goodUnits: number;
  closed: boolean;
  materialComplete: boolean;
  timeComplete: boolean;
  materials: { value: string | null; provisional: boolean }[];
  stages: CostStage[];
};
export function calculateProductionCost(v: ProductionCostInput) {
  const missing = new Set<string>();
  const parts = {
    material: new D(0),
    energy: new D(0),
    maintenance: new D(0),
    labor: new D(0),
    depreciation: new D(0),
  };
  for (const m of v.materials) {
    if (m.value === null) missing.add("material");
    else parts.material = parts.material.plus(m.value);
  }
  for (const s of v.stages) {
    const h =
      s.machineMinutes === null ? null : new D(s.machineMinutes).div(60);
    if (h === null) missing.add("machineMinutes");
    else if (!h.isZero()) {
      if (s.watts === null || s.energyRate === null) missing.add("energy");
      else
        parts.energy = parts.energy.plus(
          h.times(s.watts).div(1000).times(s.energyRate),
        );
      if (s.maintenancePerHour === null) missing.add("maintenance");
      else
        parts.maintenance = parts.maintenance.plus(
          h.times(s.maintenancePerHour),
        );
      if (
        [
          s.acquisitionCost,
          s.amortizationMonths,
          s.daysPerMonth,
          s.hoursPerDay,
        ].some((x) => x === null) ||
        [s.amortizationMonths, s.daysPerMonth, s.hoursPerDay].some((x) =>
          new D(x ?? 0).lte(0),
        )
      )
        missing.add("depreciation");
      else
        parts.depreciation = parts.depreciation.plus(
          h
            .times(s.acquisitionCost!)
            .div(
              new D(s.amortizationMonths!)
                .times(s.daysPerMonth!)
                .times(s.hoursPerDay!),
            ),
        );
    }
    if (s.setupMinutes === null || s.finishingMinutes === null)
      missing.add("laborTime");
    else {
      const t = new D(s.setupMinutes).plus(s.finishingMinutes).div(60);
      if (!t.isZero()) {
        if (s.laborPerHour === null) missing.add("labor");
        else parts.labor = parts.labor.plus(t.times(s.laborPerHour));
      }
    }
  }
  if (!v.materialComplete) missing.add("materialMeasurement");
  if (!v.timeComplete) missing.add("timeMeasurement");
  const total = Object.values(parts).reduce((s, n) => s.plus(n), new D(0));
  const fmt = (n: InstanceType<typeof D>) =>
    quantity(n.toDecimalPlaces(6).toFixed(), true);
  const knownTotal = fmt(total),
    complete = missing.size === 0;
  return {
    knownTotal,
    total: complete ? knownTotal : null,
    unitCost: complete && v.goodUnits > 0 ? fmt(total.div(v.goodUnits)) : null,
    lossCost: complete && v.closed && v.goodUnits === 0 ? knownTotal : null,
    provisional:
      !complete || !v.closed || v.materials.some((m) => m.provisional),
    missing: [...missing],
    components: Object.fromEntries(
      Object.entries(parts).map(([k, n]) => [k, fmt(n)]),
    ),
  };
}
export type LineCostDTO = ReturnType<typeof calculateProductionCost> & {
  revisionId?: string;
  lineId?: string;
  origins?: {
    originId: string;
    units: number;
    value: string | null;
    allocations: {
      kind: string;
      id: string;
      units: number;
      value: string | null;
    }[];
  }[];
};
export function apportionProductionCost(
  total: string | null,
  units: number[],
): (string | null)[] {
  const count = units.reduce((n, x) => n + x, 0);
  let allocated = new D(0);
  const last = units.findLastIndex((n) => n > 0);
  const values = units.map((n, i) => {
    if (total === null) return null;
    if (!count) return "0";
    const value =
      i === last
        ? new D(total).minus(allocated)
        : new D(total).times(n).div(count).toDecimalPlaces(6);
    allocated = allocated.plus(value);
    return value.toFixed();
  });
  // Preserve historic rounding unless its residual would create negative cost.
  if (total !== null && values.some((v) => v !== null && new D(v).lt(0)))
    return allocate(
      total,
      units.map((n, position) => ({
        key: String(position),
        position,
        weight: String(n),
      })),
      6,
    ).map((v) => new D(v.value).toFixed());
  return values;
}
