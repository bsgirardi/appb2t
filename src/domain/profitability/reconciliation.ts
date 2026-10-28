import { StockDecimal as D } from "@/domain/stock/quantities";
import { metric, resolveCoverage } from "./coverage";
import type {
  Metric,
  Money,
  ProfitabilityLineDTO,
  SaleProfitabilityDTO,
} from "./types";

export type ReconciliationStage = {
  revenue: Money | null;
  contribution: Metric;
  margin: Metric;
};
export type ReconciliationEffect = {
  key: string;
  label: string;
  amount: Metric;
  source: string;
};
export type LineReconciliation = {
  key: string;
  reference: ReconciliationStage;
  negotiated: ReconciliationStage;
  actual: ReconciliationStage;
  commercialEffects: ReconciliationEffect[];
  actualEffects: ReconciliationEffect[];
  referenceSnapshotId: string | null;
  commercialClosed: boolean;
  actualClosed: boolean;
};
export type SaleReconciliation = Omit<
  LineReconciliation,
  "key" | "referenceSnapshotId"
> & {
  lines: LineReconciliation[];
};

const sum = (values: string[]) =>
  values.reduce((s, v) => s.plus(v), new D(0)).toFixed();
function derive(
  deps: Metric[],
  compute: (...values: string[]) => string,
): Metric {
  if (deps.every((m) => m.coverage === "COMPLETE" && m.value !== null))
    return metric(compute(...deps.map((m) => m.value!)));
  const provisional = deps.some((m) => m.coverage === "PROVISIONAL");
  const missing = [...new Set(deps.flatMap((m) => m.reasons))];
  const coverage = resolveCoverage({
    hasKnown: deps.some((m) => m.coverage !== "UNAVAILABLE"),
    missing,
    provisional,
  });
  return {
    value: null,
    knownValue: "0",
    coverage: coverage === "COMPLETE" ? "UNAVAILABLE" : coverage,
    reasons: missing.length
      ? missing
      : [provisional ? "Dados ainda provisórios" : "Dados indisponíveis"],
  };
}
const difference = (left: Metric, right: Metric) =>
  derive([left, right], (a, b) => new D(a).minus(b).toFixed());
const total = (values: Metric[]) => derive(values, (...xs) => sum(xs));
function stage(
  revenue: string | null,
  contribution: Metric,
): ReconciliationStage {
  return {
    revenue,
    contribution,
    margin:
      revenue === null || new D(revenue).isZero()
        ? metric(null, [
            revenue === null
              ? "Receita da memória indisponível"
              : "Receita igual a zero",
          ])
        : derive([contribution], (c) =>
            new D(c).div(revenue).times(100).toFixed(),
          ),
  };
}
function closes(
  start: Metric,
  effects: ReconciliationEffect[],
  end: Metric,
): boolean {
  const result = total([start, ...effects.map((e) => e.amount)]);
  return (
    result.value !== null &&
    end.coverage === "COMPLETE" &&
    end.value !== null &&
    new D(result.value).eq(end.value)
  );
}
function reconcileLine(
  l: ProfitabilityLineDTO,
  revisionSource: string,
): LineReconciliation {
  const e = l.expected,
    expected = l.expectedScenario,
    actual = l.actualScenario;
  const memoryRevenue = e
    ? metric(e.suggestedRevenue)
    : metric(null, l.expectedMissing ?? ["Memória prevista indisponível"]);
  const referenceFees = e
    ? metric(
        new D(e.suggestedRevenue)
          .times(e.feePercent)
          .div(100)
          .plus(e.fixedFees)
          .toDecimalPlaces(6)
          .toFixed(),
      )
    : metric(null, ["Taxas da memória indisponíveis"]);
  const reference = stage(
    memoryRevenue.value,
    derive(
      [memoryRevenue, expected.productive, referenceFees, expected.shipping],
      (m, v, f, s) => new D(m).minus(v).minus(f).minus(s).toFixed(),
    ),
  );
  const commercialSource = `Totais comerciais da linha ${l.key}`;
  const memorySource = e
    ? `Memória ${e.snapshotId} · linha ${l.key}`
    : `Memória indisponível · linha ${l.key}`;
  const commercialEffects: ReconciliationEffect[] = [
    {
      key: "price",
      label: "Preço praticado frente à memória",
      amount: difference(metric(l.grossRevenue), memoryRevenue),
      source: `${commercialSource}; ${memorySource}`,
    },
    {
      key: "discount",
      label: "Desconto comercial",
      amount: metric(new D(l.netProducts).minus(l.grossRevenue).toFixed()),
      source: commercialSource,
    },
    {
      key: "chargedShipping",
      label: "Frete cobrado",
      amount: metric(new D(l.revenue).minus(l.netProducts).toFixed()),
      source: commercialSource,
    },
    {
      key: "feeBase",
      label: "Efeito da receita na base das taxas",
      amount: difference(referenceFees, expected.fees),
      source: `${memorySource}; produtos após desconto, sem frete cobrado`,
    },
  ];
  const actualEffects: ReconciliationEffect[] = [
    {
      key: "productive",
      label: "Variação do custo produtivo sem depreciação",
      amount: difference(expected.productive, actual.productive),
      source: `${memorySource}; custos e complementos já incluídos na linha ${l.key}`,
    },
    {
      key: "fees",
      label: "Variação dos encargos comerciais",
      amount: difference(expected.fees, actual.fees),
      source: `${memorySource}; ${revisionSource}`,
    },
    {
      key: "paidShipping",
      label: "Variação do frete pago",
      amount: difference(expected.shipping, actual.shipping),
      source: revisionSource,
    },
  ];
  return {
    key: l.key,
    reference,
    negotiated: stage(l.revenue, expected.contribution),
    actual: stage(l.revenue, actual.contribution),
    commercialEffects,
    actualEffects,
    referenceSnapshotId: e?.snapshotId ?? null,
    commercialClosed: closes(
      reference.contribution,
      commercialEffects,
      expected.contribution,
    ),
    actualClosed: closes(
      expected.contribution,
      actualEffects,
      actual.contribution,
    ),
  };
}

/** Read-only explanation: never recalculates or persists the underlying assessment. */
export function reconcileSale(value: SaleProfitabilityDTO): SaleReconciliation {
  const revisionSource = value.revision
    ? `Conferência ${value.revision.id}, versão ${value.revision.version}`
    : "Declarações de frete e encargos da apuração; sem identificador de conferência";
  const lines = value.lines.map((l) => reconcileLine(l, revisionSource));
  const aggregateEffects = (key: "commercialEffects" | "actualEffects") =>
    (lines[0]?.[key] ?? []).map((effect, index) => ({
      ...effect,
      amount: total(lines.map((l) => l[key][index].amount)),
      source: "Soma das mesmas fontes por linha; veja o detalhamento abaixo",
    }));
  const revenues = lines.map((l) => l.reference.revenue);
  const reference = stage(
    revenues.every((v) => v !== null) ? sum(revenues as string[]) : null,
    total(lines.map((l) => l.reference.contribution)),
  );
  const commercialEffects = aggregateEffects("commercialEffects"),
    actualEffects = aggregateEffects("actualEffects");
  return {
    lines,
    reference,
    commercialEffects,
    actualEffects,
    negotiated: stage(value.revenue, value.expected.contribution),
    actual: stage(value.revenue, value.actual.contribution),
    commercialClosed:
      lines.length > 0 &&
      lines.every((l) => l.commercialClosed) &&
      closes(
        reference.contribution,
        commercialEffects,
        value.expected.contribution,
      ),
    actualClosed:
      lines.length > 0 &&
      lines.every((l) => l.actualClosed) &&
      closes(
        value.expected.contribution,
        actualEffects,
        value.actual.contribution,
      ),
  };
}
