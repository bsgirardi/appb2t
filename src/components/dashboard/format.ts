import Decimal from "decimal.js";
import type { Metric } from "@/domain/dashboard/types";
const D = Decimal.clone({ precision: 40 });
export function formatMetric(value: string | null, unit: Metric["unit"]) {
  if (value === null) return "Dados insuficientes";
  const decimals =
    unit === "number" ? Math.min(new D(value).decimalPlaces(), 2) : 2;
  const [integer, fraction] = new D(value).toFixed(decimals).split(".");
  const formatted =
    integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".") +
    (fraction ? `,${fraction}` : "");
  return unit === "money"
    ? `R$ ${formatted}`
    : unit === "percent"
      ? `${formatted}%`
      : unit === "hours"
        ? `${formatted} h`
        : unit === "days"
          ? `${formatted} dias`
          : formatted;
}
export function metricChange(
  value: string | null,
  previous: string | null | undefined,
) {
  if (
    value === null ||
    previous === null ||
    previous === undefined ||
    new D(previous).isZero()
  )
    return null;
  const change = new D(value)
    .minus(previous)
    .div(new D(previous).abs())
    .times(100);
  return `${change.gt(0) ? "+" : ""}${change.toFixed(1).replace(".", ",")}%`;
}
export function dateLabel(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split("-").reverse().join("/")
    : value;
}
