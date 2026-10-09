import { StockDecimal as D } from "@/domain/stock/quantities";
import type {
  ReportDTO,
  SaleProfitabilityDTO,
  Summary,
  SummaryMetric,
} from "./types";
import { combineScenarios } from "./calculate";
const sum = (v: string[]) => v.reduce((s, n) => s.plus(n), new D(0)).toFixed();
function summary(rows: SaleProfitabilityDTO[]): Summary {
  const usable = rows.filter((r) => !r.excluded);
  const collect = (
    value: (r: SaleProfitabilityDTO) => string | null,
  ): SummaryMetric => {
    const covered = usable.filter((r) => value(r) !== null),
      revenue = sum(covered.map((r) => r.revenue)),
      total = sum(covered.map((r) => value(r)!));
    return {
      value: covered.length ? total : null,
      coveredRevenue: revenue,
      count: covered.length,
      margin:
        covered.length && !new D(revenue).isZero()
          ? new D(total).div(revenue).times(100).toFixed()
          : null,
    };
  };
  return {
    count: rows.length,
    revenue: sum(usable.map((r) => r.revenue)),
    expected: collect((r) => r.expected.contribution.value),
    actual: collect((r) => r.actual.contribution.value),
    afterDepreciation: collect((r) => r.actual.afterDepreciation.value),
    contributionChange: collect((r) =>
      r.actual.contribution.value !== null &&
      r.expected.contribution.value !== null
        ? new D(r.actual.contribution.value)
            .minus(r.expected.contribution.value)
            .toFixed()
        : null,
    ),
    costChange: collect((r) =>
      r.actual.totalCost.value !== null && r.expected.totalCost.value !== null
        ? new D(r.actual.totalCost.value)
            .minus(r.expected.totalCost.value)
            .toFixed()
        : null,
    ),
    knownCost: sum(rows.map((r) => r.actual.totalCost.knownValue)),
  };
}
export function aggregateSales(rows: SaleProfitabilityDTO[]): ReportDTO {
  const channels = new Map<
      string,
      { name: string; rows: SaleProfitabilityDTO[] }
    >(),
    products = new Map<
      string,
      { name: string; rows: SaleProfitabilityDTO[] }
    >();
  for (const row of rows) {
    const id = row.administrative?.channel?.id ?? "__none__",
      channel = channels.get(id) ?? {
        name: row.administrative?.channel?.name ?? "Não informado",
        rows: [],
      };
    channel.rows.push(row);
    channels.set(id, channel);
    for (const id of new Set(row.lines.map((l) => l.productId ?? "__none__"))) {
      const lines = row.lines.filter((l) => (l.productId ?? "__none__") === id),
        revenue = sum(lines.map((l) => l.revenue));
      const projected = {
        ...row,
        lines,
        revenue,
        actual: combineScenarios(
          revenue,
          lines.map((l) => l.actualScenario),
        ),
        expected: combineScenarios(
          revenue,
          lines.map((l) => l.expectedScenario),
        ),
      };
      for (const scenario of ["actual", "expected"] as const)
        for (const metric of [
          "contribution",
          "afterDepreciation",
          "totalCost",
        ] as const)
          if (row[scenario][metric].value === null)
            projected[scenario][metric] = {
              ...projected[scenario][metric],
              value: null,
              coverage: row[scenario][metric].coverage,
            };
      const group = products.get(id) ?? {
        name:
          id === "__none__" ? "Sem produto vinculado" : lines[0].description,
        rows: [],
      };
      group.rows.push(projected);
      products.set(id, group);
    }
  }
  const groups = (m: typeof channels) =>
    [...m].map(([id, g]) => ({ id, name: g.name, summary: summary(g.rows) }));
  return {
    summary: summary(rows),
    products: groups(products),
    channels: groups(channels),
    items: rows,
    total: rows.length,
    page: 1,
    pageSize: rows.length,
  };
}
