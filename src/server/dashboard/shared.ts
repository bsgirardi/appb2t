import Decimal from "decimal.js";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { shiftDay } from "@/domain/dashboard/filters";
import type {
  DashboardFilter,
  DashboardPanelDTO,
  Metric,
  Series,
} from "@/domain/dashboard/types";
export const D = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});
export const emptyPanel = (): DashboardPanelDTO => ({
  metrics: [],
  charts: [],
  priorities: [],
  tables: [],
  notes: [],
});
export const sum = (values: (string | number)[]) =>
  values.reduce<InstanceType<typeof D>>((n, v) => n.plus(v), new D(0));
export const ratio = (n: string | number, denominator: string | number) =>
  new D(denominator).isZero()
    ? null
    : new D(n).div(denominator).times(100).toFixed(2);
export const civil = (d: Date) => d.toISOString().slice(0, 10);
export const instantDay = (d: Date) => todaySaoPaulo(d);
export const inPeriod = (
  day: string,
  f: Pick<DashboardFilter, "from" | "to">,
) => day >= f.from && day <= f.to;
export const instantRange = (from: string, to: string) => ({
  gte: new Date(`${from}T00:00:00-03:00`),
  lt: new Date(`${shiftDay(to, 1)}T00:00:00-03:00`),
});
export const dateRange = (f: Pick<DashboardFilter, "from" | "to">) => ({
  gte: new Date(`${f.from}T00:00:00Z`),
  lte: new Date(`${f.to}T00:00:00Z`),
});
export const metric = (
  id: string,
  label: string,
  value: string | number | null,
  unit: Metric["unit"],
  description: string,
  extra: Partial<Metric> = {},
): Metric => ({
  id,
  label,
  value: value === null ? null : String(value),
  unit,
  description,
  ...extra,
});
export const moneyText = (s: string) =>
  `R$ ${new D(s).toFixed(2).replace(".", ",")}`;
export const numberText = (s: string | number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(
    Number(s),
  );
export function statusChart(
  id: string,
  title: string,
  rows: string[],
  description = "Distribuição na posição atual.",
): Series {
  const counts = new Map<string, number>();
  rows.forEach((status) => counts.set(status, (counts.get(status) ?? 0) + 1));
  return {
    id,
    title,
    description,
    kind: "bar",
    unit: "number",
    keys: [{ key: "value", label: "Quantidade" }],
    points: [...counts].map(([label, value]) => ({
      label: label.replaceAll("_", " "),
      value: String(value),
    })),
  };
}
export function dailySeries(
  id: string,
  title: string,
  rows: { date: string; value: string }[],
  f: DashboardFilter,
  unit: Metric["unit"] = "money",
): Series {
  const totals = new Map<string, string>();
  rows.forEach((r) =>
    totals.set(r.date, new D(totals.get(r.date) ?? 0).plus(r.value).toFixed(2)),
  );
  return {
    id,
    title,
    description: "No período selecionado; dias sem registros têm valor zero.",
    kind: "area",
    unit,
    keys: [{ key: "value", label: title }],
    points: rows.length
      ? Array.from(
          {
            length:
              Math.round((Date.parse(f.to) - Date.parse(f.from)) / 86400000) +
              1,
          },
          (_, i) => {
            const date = shiftDay(f.from, i);
            return { label: date, value: totals.get(date) ?? "0" };
          },
        )
      : [],
  };
}
