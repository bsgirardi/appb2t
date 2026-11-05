import { z } from "zod";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { parseCivilDate } from "@/domain/commerce/dates";
import type { Summary } from "./types";
import type { GoalMetric } from "./intelligence";

export const monthSchema = z
  .string()
  .regex(
    /^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/,
    "Informe uma competência válida (AAAA-MM).",
  );
const amount = z
  .string()
  .regex(
    /^\d{1,12}(\.\d{1,2})?$/,
    "Use um valor não negativo, até 12 inteiros e duas casas decimais.",
  );
export const goalValuesSchema = z
  .object({
    revenue: amount.transform((v) => new D(v).toFixed(2)).nullable(),
    contribution: amount.transform((v) => new D(v).toFixed(2)).nullable(),
    orders: z
      .string()
      .regex(/^\d{1,12}$/, "Use uma quantidade inteira não negativa.")
      .transform((v) => new D(v).toFixed(0))
      .nullable(),
  })
  .strict();
export type GoalValues = z.infer<typeof goalValuesSchema>;
export const emptyGoals: GoalValues = {
  revenue: null,
  contribution: null,
  orders: null,
};
export const saveMonthlyGoalSchema = z
  .object({
    month: monthSchema,
    version: z.number().int().min(0).max(2147483646),
    values: goalValuesSchema,
    reason: z
      .string()
      .trim()
      .min(3, "Explique o motivo com pelo menos 3 caracteres.")
      .max(1000),
  })
  .strict();
export const monthlyQuerySchema = z
  .object({
    month: monthSchema,
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict();

export function monthPeriod(raw: string, today: string) {
  const month = monthSchema.parse(raw);
  parseCivilDate(today);
  const [year, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const from = `${month}-01`,
    end = `${month}-${days}`;
  const state =
    month > today.slice(0, 7)
      ? "future"
      : month < today.slice(0, 7)
        ? "closed"
        : "current";
  return {
    month,
    from,
    end,
    to: state === "current" ? today : end,
    days,
    elapsed:
      state === "future"
        ? 0
        : state === "closed"
          ? days
          : Number(today.slice(8)),
    state,
  } as const;
}
export type MonthlyPeriod = ReturnType<typeof monthPeriod>;
export function monthlyPerformance(
  summary: Summary,
  values: GoalValues,
  period: MonthlyPeriod,
) {
  const complete = summary.count > 0 && summary.actual.count === summary.count;
  const metric = (key: GoalMetric) => {
    const actual =
      period.state === "future"
        ? null
        : key === "orders"
          ? String(summary.count)
          : key === "revenue"
            ? summary.revenue
            : complete
              ? summary.actual.value
              : null;
    const target = values[key];
    return {
      target,
      actual,
      progress:
        actual !== null && target !== null && new D(target).gt(0)
          ? new D(actual).div(target).times(100).toFixed(2)
          : null,
      projection:
        actual !== null && period.state === "current"
          ? new D(actual).div(period.elapsed).times(period.days).toFixed(2)
          : null,
    };
  };
  return {
    revenue: metric("revenue"),
    contribution: metric("contribution"),
    orders: metric("orders"),
  };
}
