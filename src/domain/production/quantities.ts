import { AppError } from "@/lib/errors";
import { StockDecimal as D, quantity } from "@/domain/stock/quantities";
export function units(value: number, positive = false): number {
  if (
    !Number.isInteger(value) ||
    value < (positive ? 1 : 0) ||
    value > 2147483647
  )
    throw new AppError(
      "VALIDATION",
      "Informe quantidade inteira de peças dentro do limite permitido.",
    );
  return value;
}
export function demandRemaining(
  sold: number,
  delivered: number,
  ready: number,
  pendingTarget: number,
): number {
  [sold, delivered, ready, pendingTarget].forEach((v) => units(v));
  const remaining = sold - delivered - ready - pendingTarget;
  if (remaining < 0)
    throw new AppError(
      "CONFLICT",
      "Quantidade excede a demanda restante da venda.",
    );
  return remaining;
}
export function finishedBalance(movements: string[], commitments: string[]) {
  const sum = (values: string[]) =>
    values.reduce((n, v) => n.plus(quantity(v, true)), new D(0));
  const physical = sum(movements),
    reserved = sum(commitments),
    available = physical.minus(reserved);
  if (
    [physical, reserved, available].some(
      (v) => v.lt(0) || !v.isInteger() || v.gt(2147483647),
    )
  )
    throw new AppError(
      "CONFLICT",
      "Peças insuficientes ou saldo de produtos acabados inválido.",
    );
  return {
    physical: physical.toFixed(),
    reserved: reserved.toFixed(),
    available: available.toFixed(),
  };
}
