import Decimal from "decimal.js";
import { parseCivilDate } from "@/domain/commerce/dates";
export const FinanceDecimal = Decimal.clone({
  precision: 50,
  rounding: Decimal.ROUND_HALF_UP,
});
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
