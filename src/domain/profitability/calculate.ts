import { StockDecimal as D } from "@/domain/stock/quantities";
import { AppError } from "@/lib/errors";
import { allocate } from "./allocation";
import { metric } from "./coverage";
import type {
  Metric,
  Scenario,
  SaleProfitabilityInput,
  SaleProfitabilityDTO,
  DeclaredAmount,
} from "./types";
const sum = (xs: string[]) =>
  xs.reduce((n, x) => n.plus(x), new D(0)).toFixed();
function computed(value: string, deps: Metric[]): Metric {
  const missing = deps.flatMap((d) => d.reasons),
    provisional = deps.some((d) => d.coverage === "PROVISIONAL");
  if (deps.some((d) => d.coverage !== "COMPLETE"))
    return {
      ...metric(
        null,
        missing.length ? missing : ["Dados ainda provisórios"],
        provisional,
      ),
      coverage: missing.length ? "PARTIAL" : "PROVISIONAL",
      knownValue: "0",
    };
  return metric(value);
}
function scenario(
  revenue: string,
  productive: Metric,
  depreciation: Metric,
  totalCost: Metric,
  fees: Metric,
  shipping: Metric,
): Scenario {
  const v = (m: Metric) => m.value ?? "0";
  const contribution = computed(
    new D(revenue)
      .minus(v(productive))
      .minus(v(fees))
      .minus(v(shipping))
      .toFixed(),
    [productive, fees, shipping],
  );
  const afterDepreciation = computed(
    new D(revenue)
      .minus(v(totalCost))
      .minus(v(fees))
      .minus(v(shipping))
      .toFixed(),
    [totalCost, fees, shipping],
  );
  const margin = new D(revenue).isZero()
    ? metric(null, ["Receita igual a zero"])
    : computed(new D(v(contribution)).div(revenue).times(100).toFixed(), [
        contribution,
      ]);
  return {
    productive,
    depreciation,
    totalCost,
    fees,
    shipping,
    contribution,
    afterDepreciation,
    margin,
  };
}
function combined(ms: Metric[]): Metric {
  const known = sum(ms.map((m) => m.knownValue));
  return metric(
    ms.every((m) => m.value !== null) ? sum(ms.map((m) => m.value!)) : null,
    ms.flatMap((m) => m.reasons),
    ms.some((m) => m.coverage === "PROVISIONAL"),
    known,
  );
}
export function combineScenarios(revenue: string, ss: Scenario[]): Scenario {
  return scenario(
    revenue,
    ...((
      ["productive", "depreciation", "totalCost", "fees", "shipping"] as const
    ).map((k) => combined(ss.map((s) => s[k]))) as [
      Metric,
      Metric,
      Metric,
      Metric,
      Metric,
    ]),
  );
}
export function calculateSale(
  input: SaleProfitabilityInput,
): SaleProfitabilityDTO {
  const { lines, totals, administrative: a } = input;
  if (
    !lines.length ||
    !new D(sum(lines.map((l) => l.grossRevenue))).eq(totals.subtotal) ||
    new D(totals.discount).gt(totals.subtotal) ||
    !new D(totals.total).eq(
      new D(totals.subtotal).minus(totals.discount).plus(totals.shipping),
    )
  )
    throw new AppError("VALIDATION", "Totais comerciais inconsistentes.");
  const weights = lines.map((l) => ({
    key: l.key,
    position: l.position,
    weight: l.grossRevenue,
  }));
  const discounts = allocate(totals.discount, weights, 2);
  const net = lines.map((l, i) =>
    new D(l.grossRevenue).minus(discounts[i].value).toFixed(),
  );
  const base = lines.map((l, i) => ({
    key: l.key,
    position: l.position,
    weight: new D(sum(net)).isZero() ? String(l.quantity) : net[i],
  }));
  const charged = allocate(totals.shipping, base, 2);
  const declared = (v: DeclaredAmount | undefined, label: string) =>
    lines.map((_, i) =>
      v?.state === "DECLARED"
        ? metric(new D(allocate(v.value, base, 2)[i].value).toFixed())
        : metric(null, [label]),
    );
  const shipping = declared(a?.shipping, "Frete efetivo não informado"),
    fees = declared(a?.fees, "Encargos efetivos não informados"),
    expectedShipping = declared(
      a?.expectedShipping,
      "Frete previsto não informado",
    );
  const output = lines.map((l, i) => {
    const revenue = new D(net[i]).plus(charged[i].value).toFixed(),
      e = l.expected;
    const ep = e
      ? metric(e.variable)
      : metric(null, l.expectedMissing ?? ["Memória prevista indisponível"]);
    const ed = e
      ? metric(e.depreciation)
      : metric(null, ["Depreciação prevista indisponível"]);
    const et = e
      ? metric(new D(e.variable).plus(e.depreciation).toFixed())
      : metric(null, ["Custo previsto indisponível"]);
    const ef = e
      ? metric(
          new D(net[i])
            .times(e.feePercent)
            .div(100)
            .plus(e.fixedFees)
            .toDecimalPlaces(6)
            .toFixed(),
        )
      : metric(null, ["Taxas previstas indisponíveis"]);
    const review = a?.lineReviews.find(
      (r) => r.lineKey === l.key && r.complete && r.sourceHash === l.sourceHash,
    );
    const missing = [...l.actual.missing];
    if (l.actual.delivered !== l.quantity) missing.push("Entrega incompleta");
    if (!review) missing.push("Extras precisam de conferência");
    for (const extra of e?.extras ?? [])
      if (
        !a?.confirmations.some(
          (c) => c.lineKey === l.key && c.extraKey === extra.key,
        )
      )
        missing.push(`Extra sem conferência: ${extra.name}`);
    const extras = sum(
      a?.extras.filter((x) => x.lineKey === l.key).map((x) => x.value) ?? [],
    );
    const actual = l.actual,
      prov = actual.provisional;
    const total = metric(
      actual.total === null ? null : new D(actual.total).plus(extras).toFixed(),
      [
        ...missing,
        ...(actual.total === null ? ["Custo produtivo incompleto"] : []),
      ],
      prov,
      new D(actual.knownTotal).plus(extras).toFixed(),
    );
    const dep = actual.components?.depreciation ?? null;
    const productive = metric(
      actual.total === null || dep === null
        ? null
        : new D(actual.total).minus(dep).plus(extras).toFixed(),
      [
        ...missing,
        ...(dep === null ? ["Composição indisponível"] : []),
        ...(actual.total === null ? ["Custo produtivo incompleto"] : []),
      ],
      prov,
    );
    return {
      ...l,
      revenue,
      netProducts: net[i],
      expectedScenario: scenario(revenue, ep, ed, et, ef, expectedShipping[i]),
      actualScenario: scenario(
        revenue,
        productive,
        metric(dep, dep === null ? ["Composição indisponível"] : missing, prov),
        total,
        fees[i],
        shipping[i],
      ),
    };
  });
  return {
    ...input,
    lines: output,
    revenue: new D(totals.total).toFixed(),
    expected: combineScenarios(
      totals.total,
      output.map((l) => l.expectedScenario),
    ),
    actual: combineScenarios(
      totals.total,
      output.map((l) => l.actualScenario),
    ),
    compositionMissing: lines.some(
      (l) => l.actual.total !== null && l.actual.components === null,
    ),
    excluded: input.status === "CANCELADA" || !!a?.commercialPending,
  };
}
