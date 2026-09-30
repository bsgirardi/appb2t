import Decimal from "decimal.js";
import { parseCivilDate } from "@/domain/commerce/dates";
export const FinanceDecimal = Decimal.clone({
  precision: 50,
  rounding: Decimal.ROUND_HALF_UP,
});
export function entryState(
  amount: string,
  netSettled: string,
  canceled: boolean,
  dueDate: string,
  today: string,
) {
  const paid = new FinanceDecimal(netSettled),
    remaining = new FinanceDecimal(amount).minus(paid);
  return {
    paidAmount: paid.toFixed(2),
    remainingAmount: canceled ? "0.00" : remaining.toFixed(2),
    state: canceled
      ? ("CANCELADO" as const)
      : remaining.eq(0)
        ? ("LIQUIDADO" as const)
        : paid.gt(0)
          ? ("PARCIAL" as const)
          : ("ABERTO" as const),
    overdue: !canceled && remaining.gt(0) && dueDate < today,
  };
}
export function balanceAt(
  openingBalance: string,
  openingDate: string,
  movements: { amount: string; effectiveDate: string }[],
  asOf: string,
): string | null {
  parseCivilDate(asOf);
  if (asOf < openingDate) return null;
  return movements
    .filter((m) => m.effectiveDate <= asOf)
    .reduce((sum, m) => sum.plus(m.amount), new FinanceDecimal(openingBalance))
    .toFixed(2);
}
