import { StockDecimal as D } from "@/domain/stock/quantities";
import { metric } from "./coverage";
import { readExpectedComponents } from "./expected-components";
import type { AdministrativePayload, CostSource, Metric, ProfitabilityLineDTO } from "./types";

export type ProductiveComponentRow = {
  key: string;
  label: string;
  expected: Metric;
  actual: Metric;
  effect: Metric;
  source: string;
};
export type ProductiveReconciliation = {
  rows: ProductiveComponentRow[];
  aggregateEffect: Metric;
  unexplained: Metric;
  closed: boolean;
  reasons: string[];
  includedLosses: CostSource[];
  sources: CostSource[];
};
const sum = (values: string[]) => values.reduce((s, v) => s.plus(v), new D(0)).toFixed();
const valid = (value: unknown): value is string =>
  typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value) && new D(value).isFinite();
function difference(a: Metric, b: Metric): Metric {
  if (a.value !== null && b.value !== null && a.coverage === "COMPLETE" && b.coverage === "COMPLETE")
    return metric(new D(a.value).minus(b.value).toFixed());
  return metric(null, [...a.reasons, ...b.reasons], a.coverage === "PROVISIONAL" || b.coverage === "PROVISIONAL");
}

/** Explanation only: sources, confirmations and reservations are never added as new costs. */
export function reconcileProductiveLine(
  line: ProfitabilityLineDTO,
  administrative: AdministrativePayload | null,
): ProductiveReconciliation {
  const expected = readExpectedComponents(line.expected?.components);
  const actual = line.actual.components;
  const actualCoverage = line.actualScenario.productive;
  const complements = administrative?.extras.filter(e => e.lineKey === line.key) ?? [];
  const complementValue = complements.every(e => valid(e.value)) ? sum(complements.map(e => e.value)) : null;
  const source = `Memória ${line.expected?.snapshotId ?? "indisponível"} · linha ${line.key}; componentes realizados atribuídos por rateio das fontes desta linha`;
  const rows = ([
    ["material", "Material"], ["labor", "Trabalho"], ["energy", "Energia"],
    ["maintenance", "Manutenção"], ["extras", "Extras e complementos"],
    ["failure", "Provisão prevista para falhas"],
  ] as const).map(([key, label]): ProductiveComponentRow => {
    const predicted = expected ? metric(expected[key]) : metric(null, ["Composição prevista indisponível na memória"]);
    const value = key === "failure" ? "0" : key === "extras" ? complementValue : actual?.[key];
    const measured = metric(
      valid(value) ? value : null,
      [...actualCoverage.reasons, ...(!valid(value) ? [`Componente realizado indisponível: ${label}`] : [])],
      actualCoverage.coverage === "PROVISIONAL" || line.actual.provisional,
    );
    // COMPLETE with null is never a usable actual component (e.g. legacy malformed DTO).
    if (actualCoverage.coverage !== "COMPLETE" && measured.coverage === "COMPLETE") {
      measured.value = null;
      measured.coverage = actualCoverage.coverage;
      measured.reasons = ["Custo produtivo ainda não completo"];
    }
    return {
      key, label, expected: predicted, actual: measured, effect: difference(predicted, measured),
      source: key === "extras"
        ? `${source}; complementos ${complements.map(e => e.id).join(", ") || "nenhum"}; confirmações em U3 permanecem nos componentes`
        : key === "failure" ? `${source}; parcela adicional zero nesta abertura, sem medição causal de falhas` : source,
    };
  });
  const aggregateEffect = difference(line.expectedScenario.productive, actualCoverage);
  const completeEffects = rows.every(r => r.effect.coverage === "COMPLETE" && r.effect.value !== null);
  const unexplained = aggregateEffect.value !== null && completeEffects
    ? metric(new D(aggregateEffect.value).minus(sum(rows.map(r => r.effect.value!))).toFixed())
    : metric(null, [...new Set([...aggregateEffect.reasons, ...rows.flatMap(r => r.effect.reasons), "Abertura produtiva incompleta"])]);
  const reasons: string[] = [];
  if (expected && !new D(sum(Object.values(expected))).eq(line.expected!.variable))
    reasons.push("A soma dos componentes previstos diverge do total previsto");
  const actualParts = rows.filter(r => r.key !== "failure").map(r => r.actual);
  if (actualCoverage.value !== null && actualParts.every(m => m.value !== null) &&
      !new D(sum(actualParts.map(m => m.value!))).eq(actualCoverage.value))
    reasons.push("A soma dos componentes realizados diverge do custo produtivo atribuído");
  if (unexplained.value !== null && !new D(unexplained.value).isZero())
    reasons.push("Parcela não reconciliada; confira composição, classificação e precisão das fontes");
  return {
    rows, aggregateEffect, unexplained, reasons,
    closed: completeEffects && unexplained.value !== null && new D(unexplained.value).isZero() && reasons.length === 0,
    includedLosses: line.actual.sources.filter(s => s.kind === "LOSS").map(s => ({ ...s })),
    sources: line.actual.sources.map(s => ({ ...s })),
  };
}
