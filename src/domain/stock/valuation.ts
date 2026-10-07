import { StockDecimal as D, quantity } from "./quantities";
import type { CostMethod, Quantity } from "./types";
import { AppError } from "@/lib/errors";
export type ValuationEvent = {
  id: string;
  sequence: number;
  kind: string;
  quantity: Quantity;
  confirmedValue: string | null;
  sourceId: string | null;
  method: CostMethod;
  manualUnitCost: string | null;
};
export type ValuationAllocation = {
  sourceId: string;
  targetId: string;
  quantity: Quantity;
  value: string | null;
  provisional: boolean;
};
export type ValuationResult = {
  physical: Quantity;
  knownValue: string | null;
  unitCost: string | null;
  provisional: boolean;
  allocations: ValuationAllocation[];
};
type Cost = { value: InstanceType<typeof D> | null; provisional: boolean };
type Expr = () => Cost;
const zero: Expr = () => ({ value: new D(0), provisional: false });
const fixed =
  (value: string | null, provisional = false): Expr =>
  () => ({
    value: value === null ? null : new D(value),
    provisional: provisional || value === null,
  });
const add =
  (a: Expr, b: Expr): Expr =>
  () => {
    const x = a(),
      y = b();
    return {
      value:
        x.value === null || y.value === null ? null : x.value.plus(y.value),
      provisional: x.provisional || y.provisional,
    };
  };
const scale =
  (a: Expr, n: InstanceType<typeof D>): Expr =>
  () => {
    const x = a();
    return { ...x, value: x.value?.times(n) ?? null };
  };
const bad = (message: string): never => {
  throw new AppError("VALIDATION", message);
};
const incoming = new Set([
  "OPENING",
  "RECEIPT",
  "ADJUSTMENT_IN",
  "COMPENSATION_IN",
]);
const outgoing = new Set([
  "CONSUMPTION",
  "LOSS",
  "ADJUSTMENT_OUT",
  "COMPENSATION_OUT",
  "RETURN_SUPPLIER",
]);
export function valueLedger(events: ValuationEvent[]): ValuationResult {
  let physical = new D(0),
    pool: Expr = zero,
    lastUnit: Expr = fixed(null),
    method: CostMethod | null = null;
  const ids = new Set<string>(),
    seqs = new Set<number>();
  const allocations: {
    sourceId: string;
    targetId: string;
    q: InstanceType<typeof D>;
    cost: Expr;
  }[] = [];
  const sources = new Map<
    string,
    {
      q: InstanceType<typeof D>;
      returned: InstanceType<typeof D>;
      canceled: InstanceType<typeof D>;
      cost: Expr;
      kind: string;
    }
  >();
  const deficits: {
    target: string;
    remaining: InstanceType<typeof D>;
    estimate: Expr;
    manual: boolean;
  }[] = [];
  const addIncoming = (id: string, q: InstanceType<typeof D>, unit: Expr) => {
    let left = q;
    for (const deficit of deficits) {
      if (left.isZero()) break;
      const covered = D.min(left, deficit.remaining);
      if (covered.isZero()) continue;
      if (!deficit.manual)
        allocations.push({
          sourceId: id,
          targetId: deficit.target,
          q: covered,
          cost: scale(unit, covered),
        });
      deficit.remaining = deficit.remaining.minus(covered);
      left = left.minus(covered);
    }
    if (left.gt(0)) pool = add(pool, scale(unit, left));
    physical = physical.plus(q);
    if (physical.gt(0)) lastUnit = scale(pool, new D(1).div(physical));
  };
  for (const e of [...events].sort((a, b) => a.sequence - b.sequence)) {
    if (
      ids.has(e.id) ||
      seqs.has(e.sequence) ||
      !Number.isSafeInteger(e.sequence)
    )
      bad("Sequência de estoque inválida.");
    ids.add(e.id);
    seqs.add(e.sequence);
    const q = new D(quantity(e.quantity));
    if (q.isZero() && !["OPENING", "REVALUE"].includes(e.kind))
      bad("Informe uma quantidade positiva.");
    if (e.confirmedValue !== null) quantity(e.confirmedValue);
    if (e.manualUnitCost !== null) quantity(e.manualUnitCost);
    if (e.method === "MANUAL" && e.manualUnitCost === null)
      bad("Informe o custo manual.");
    if (method !== null && method !== e.method) {
      if (physical.lt(0) || pool().provisional)
        bad("Regularize as pendências antes de trocar o método.");
      if (e.manualUnitCost === null)
        bad("Informe o custo de abertura do método.");
      pool = scale(fixed(e.manualUnitCost), physical);
      lastUnit = fixed(e.manualUnitCost);
    }
    method = e.method;
    if (e.kind === "REVALUE") {
      if (
        !q.isZero() ||
        physical.lt(0) ||
        pool().provisional ||
        !e.manualUnitCost
      )
        bad("Referência ou saldo inválido para revalorização.");
      pool = scale(fixed(e.manualUnitCost), physical);
      lastUnit = fixed(e.manualUnitCost);
    } else if (incoming.has(e.kind)) {
      const unit =
        e.method === "MANUAL"
          ? fixed(e.manualUnitCost)
          : q.isZero()
            ? zero
            : scale(fixed(e.confirmedValue), new D(1).div(q));
      addIncoming(e.id, q, unit);
      sources.set(e.id, {
        q,
        returned: new D(0),
        canceled: new D(0),
        cost: scale(unit, q),
        kind: e.kind,
      });
    } else if (e.kind === "RETURN_CONSUMPTION") {
      const source = sources.get(e.sourceId ?? "");
      if (
        !source ||
        source.kind !== "CONSUMPTION" ||
        source.returned.plus(q).gt(source.q)
      )
        bad("Devolução excede o consumo de origem.");
      // Cancel uncovered deficit first: returned unavailable material has no new stock value.
      let rest = q;
      for (const deficit of deficits.filter((d) => d.target === e.sourceId)) {
        const canceled = D.min(rest, deficit.remaining);
        deficit.remaining = deficit.remaining.minus(canceled);
        rest = rest.minus(canceled);
        physical = physical.plus(canceled);
        source!.canceled = source!.canceled.plus(canceled);
      }
      if (rest.gt(0))
        addIncoming(
          e.id,
          rest,
          scale(source!.cost, new D(1).div(source!.q.minus(source!.canceled))),
        );
      source!.returned = source!.returned.plus(q);
    } else if (outgoing.has(e.kind)) {
      if (e.kind === "RETURN_SUPPLIER") {
        const source = sources.get(e.sourceId ?? "");
        if (
          !source ||
          source.kind !== "RECEIPT" ||
          source.returned.plus(q).gt(source.q)
        )
          bad("Devolução excede a entrada de origem.");
        source!.returned = source!.returned.plus(q);
      }
      const available = D.max(physical, 0),
        covered = D.min(q, available),
        missing = q.minus(covered);
      const unit =
        e.method === "MANUAL"
          ? fixed(e.manualUnitCost)
          : available.gt(0)
            ? scale(pool, new D(1).div(available))
            : lastUnit;
      const coveredCost = scale(unit, covered);
      if (covered.gt(0)) {
        allocations.push({
          sourceId: e.id,
          targetId: e.id,
          q: covered,
          cost: coveredCost,
        });
        pool = covered.eq(available)
          ? zero
          : scale(pool, new D(1).minus(covered.div(available)));
      }
      if (missing.gt(0)) {
        if (e.method === "MANUAL")
          allocations.push({
            sourceId: e.id,
            targetId: e.id,
            q: missing,
            cost: scale(unit, missing),
          });
        deficits.push({
          target: e.id,
          remaining: missing,
          estimate: unit,
          manual: e.method === "MANUAL",
        });
      }
      physical = physical.minus(q);
      const cost: Expr = () =>
        allocations
          .filter((a) => a.targetId === e.id)
          .reduce((sum, a) => add(sum, a.cost), zero)();
      sources.set(e.id, {
        q,
        returned: new D(0),
        canceled: new D(0),
        cost,
        kind: e.kind,
      });
    } else bad("Tipo de movimento inválido.");
  }
  for (const deficit of deficits) {
    if (deficit.remaining.gt(0) && !deficit.manual) {
      const cost: Expr = () => ({
        ...scale(deficit.estimate, deficit.remaining)(),
        provisional: true,
      });
      allocations.push({
        sourceId: deficit.target,
        targetId: deficit.target,
        q: deficit.remaining,
        cost,
      });
    }
  }
  let exactAllocated = new D(0),
    roundedAllocated = new D(0);
  const result = allocations.map((a) => {
    const c = a.cost();
    let rounded: string | null = null;
    if (c.value !== null) {
      exactAllocated = exactAllocated.plus(c.value);
      const next = exactAllocated.toDecimalPlaces(6);
      rounded = quantity(next.minus(roundedAllocated).toFixed());
      roundedAllocated = next;
    }
    return {
      sourceId: a.sourceId,
      targetId: a.targetId,
      quantity: a.q.toFixed(),
      value: rounded,
      provisional: c.provisional,
    };
  });
  const cost = pool();
  if (cost.value !== null) quantity(cost.value.toDecimalPlaces(6).toFixed());
  const provisional = cost.provisional || result.some((a) => a.provisional);
  return {
    physical: quantity(physical.toFixed(), true),
    knownValue: physical.lt(0)
      ? null
      : (cost.value?.toDecimalPlaces(6).toFixed() ?? null),
    unitCost: physical.gt(0)
      ? (cost.value?.div(physical).toDecimalPlaces(6).toFixed() ?? null)
      : null,
    provisional,
    allocations: result,
  };
}
