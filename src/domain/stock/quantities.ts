import Decimal from "decimal.js";
import { AppError } from "@/lib/errors";
import type { Unit, StockState } from "./types";
export const StockDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});
const MAX = "999999999999999999.999999";
export function quantity(raw: string, signed = false): string {
  if (
    typeof raw !== "string" ||
    !(signed ? /^-?\d{1,18}([.,]\d{1,6})?$/ : /^\d{1,18}([.,]\d{1,6})?$/).test(
      raw.trim(),
    )
  )
    throw new AppError(
      "VALIDATION",
      "Informe quantidade com até seis casas decimais.",
    );
  const d = new StockDecimal(raw.trim().replace(",", "."));
  if (d.abs().gt(MAX))
    throw new AppError("VALIDATION", "Quantidade fora do limite permitido.");
  return d.toFixed();
}
export function toBaseQuantity(
  value: string,
  from: "KG" | "L" | Unit,
  to: Unit,
): string {
  const q = new StockDecimal(quantity(value));
  if (
    from !== to &&
    !((from === "KG" && to === "G") || (from === "L" && to === "ML"))
  )
    throw new AppError("VALIDATION", "Unidades incompatíveis.");
  if (to === "UNIT" && !q.isInteger())
    throw new AppError("VALIDATION", "Informe unidades inteiras.");
  return quantity(q.times(from === to ? 1 : 1000).toFixed());
}
export function stockState(physical: string, reserved: string): StockState {
  const p = new StockDecimal(quantity(physical, true)),
    r = new StockDecimal(quantity(reserved));
  const available = p.minus(r);
  return {
    physical: p.toFixed(),
    reserved: r.toFixed(),
    available: quantity(available.toFixed(), true),
    shortage: StockDecimal.max(0, available.negated()).toFixed(),
  };
}
