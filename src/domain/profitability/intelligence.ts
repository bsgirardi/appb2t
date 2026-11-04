import { StockDecimal as D } from "@/domain/stock/quantities";
import { parseCivilDate } from "@/domain/commerce/dates";
import { aggregateSales } from "./aggregate";
import type { SaleProfitabilityDTO, Summary } from "./types";

type Customer = { id: string; name: string };
export type RankingGroup = {
  id: string;
  name: string;
  summary: Summary;
  rank: number | null;
  sources: { id: string; number: string }[];
};
export type Rankings = Record<
  "products" | "channels" | "customers",
  RankingGroup[]
>;

export function buildRankings(
  rows: SaleProfitabilityDTO[],
  customers: Record<string, Customer>,
): Rankings {
  const usable = rows.filter((r) => !r.excluded);
  const report = aggregateSales(usable);
  const customerGroups = new Map<
    string,
    { customer: Customer; rows: SaleProfitabilityDTO[] }
  >();
  for (const row of usable) {
    const customer = customers[row.saleId] ?? {
      id: "__none__",
      name: "Cliente indisponível",
    };
    const group = customerGroups.get(customer.id) ?? { customer, rows: [] };
    group.rows.push(row);
    customerGroups.set(customer.id, group);
  }
  const rank = (
    groups: { id: string; name: string; summary: Summary }[],
    matches: (row: SaleProfitabilityDTO, id: string) => boolean,
  ): RankingGroup[] => {
    const covered = (s: Summary) =>
      s.count > 0 && s.actual.count === s.count && s.actual.value !== null;
    const sorted = [...groups].sort((a, b) => {
      const ac = covered(a.summary),
        bc = covered(b.summary);
      if (ac !== bc) return ac ? -1 : 1;
      if (ac && bc) {
        const difference = new D(b.summary.actual.value!).cmp(
          a.summary.actual.value!,
        );
        if (difference) return difference;
      }
      return a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id);
    });
    return sorted.map((g, index) => ({
      ...g,
      rank: covered(g.summary) ? index + 1 : null,
      sources: usable
        .filter((r) => matches(r, g.id))
        .map((r) => ({ id: r.saleId, number: r.number })),
    }));
  };
  return {
    products: rank(report.products, (r, id) =>
      r.lines.some((l) => (l.productId ?? "__none__") === id),
    ),
    channels: rank(
      report.channels,
      (r, id) => (r.administrative?.channel?.id ?? "__none__") === id,
    ),
    customers: rank(
      [...customerGroups.values()].map((g) => ({
        ...g.customer,
        summary: aggregateSales(g.rows).summary,
      })),
      (r, id) => (customers[r.saleId]?.id ?? "__none__") === id,
    ),
  };
}

export type GoalMetric = "revenue" | "contribution" | "orders";
type SimulationInput = {
  from: string;
  to: string;
  today: string;
  enabled: boolean;
  horizon: string;
  goal: string;
  metric: GoalMetric;
};
type Simulation = {
  actual: string | null;
  projection: string | null;
  progress: string | null;
  days: number | null;
  partialDay: boolean;
  error: string | null;
  projectionError: string | null;
};

export function simulatePerformance(
  summary: Summary,
  input: SimulationInput,
): Simulation {
  const result: Simulation = {
    actual: null,
    projection: null,
    progress: null,
    days: null,
    partialDay: false,
    error: null,
    projectionError: null,
  };
  try {
    for (const date of [input.from, input.to, input.today])
      parseCivilDate(date);
    if (!input.enabled)
      throw new Error(
        "Selecione vendas normais com data de confirmação para simular.",
      );
    if (input.from > input.to)
      throw new Error("Use um período em ordem cronológica.");
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(input.goal) || new D(input.goal).lte(0))
      throw new Error(
        "Informe uma meta positiva, com até duas casas decimais.",
      );
    if (input.metric === "orders" && !new D(input.goal).isInteger())
      throw new Error("A meta de pedidos deve ser inteira.");
    result.days =
      Math.round(
        (Date.parse(`${input.to}T00:00:00Z`) -
          Date.parse(`${input.from}T00:00:00Z`)) /
          86400000,
      ) + 1;
    result.partialDay = input.to === input.today;
    const complete =
      summary.count > 0 && summary.actual.count === summary.count;
    result.actual = !summary.count
      ? null
      : input.metric === "contribution"
        ? complete
          ? summary.actual.value
          : null
        : input.metric === "orders"
          ? String(summary.count)
          : summary.revenue;
    if (result.actual !== null) {
      result.progress = new D(result.actual)
        .div(input.goal)
        .times(100)
        .toFixed(2);
    }
    if (input.to > input.today) {
      result.projectionError =
        "Para extrapolar, selecione um histórico encerrado até hoje. A meta continua comparada ao realizado registrado.";
    } else if (
      !/^\d{1,3}$/.test(input.horizon) ||
      Number(input.horizon) < 1 ||
      Number(input.horizon) > 366
    ) {
      result.projectionError =
        "Informe um horizonte inteiro de 1 a 366 dias para extrapolar.";
    } else if (result.actual !== null) {
      result.projection = new D(result.actual)
        .div(result.days)
        .times(input.horizon)
        .toFixed(2);
    }
  } catch (error) {
    result.error =
      error instanceof Error ? error.message : "Confira as premissas.";
  }
  return result;
}
