import { StockDecimal as D } from "@/domain/stock/quantities";
import { AppError } from "@/lib/errors";
import type { Money, AllocationWeight, Allocation } from "./types";
export function allocate(
  total: Money,
  weights: AllocationWeight[],
  scale: 2 | 6,
): Allocation[] {
  const t = new D(total),
    factor = new D(10).pow(scale);
  if (
    !t.isFinite() ||
    t.lt(0) ||
    !t.times(factor).isInteger() ||
    new Set(weights.map((w) => w.key)).size !== weights.length
  )
    throw new AppError("VALIDATION", "Rateio inválido.");
  const ws = weights.map((w) => new D(w.weight));
  if (ws.some((w) => !w.isFinite() || w.lt(0)))
    throw new AppError("VALIDATION", "Peso de rateio inválido.");
  const sum = ws.reduce((s, w) => s.plus(w), new D(0));
  if (sum.isZero() && !t.isZero())
    throw new AppError("VALIDATION", "Rateio sem base.");
  const rows = weights.map((w, i) => {
    const exact = sum.isZero()
      ? new D(0)
      : t.times(factor).times(ws[i]).div(sum);
    return {
      ...w,
      index: i,
      units: exact.floor(),
      remainder: exact.minus(exact.floor()),
    };
  });
  const remaining = t
    .times(factor)
    .minus(rows.reduce((s, r) => s.plus(r.units), new D(0)))
    .toNumber();
  const ranked = [...rows].sort(
    (a, b) =>
      b.remainder.comparedTo(a.remainder) ||
      a.position - b.position ||
      (a.key < b.key ? -1 : 1),
  );
  for (let i = 0; i < remaining; i++) ranked[i].units = ranked[i].units.plus(1);
  return rows.map((r) => ({
    key: r.key,
    value: r.units.div(factor).toFixed(scale),
  }));
}
