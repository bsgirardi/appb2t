import { StockDecimal as D } from "@/domain/stock/quantities";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import type { PricingV2Input } from "@/domain/pricing/types";
import { pricingV2Schema } from "@/domain/pricing/validation";
import {
  reconcileProductiveLine,
  type ProductiveReconciliation,
} from "./productive-reconciliation";
import type { ProfitabilityLineDTO, SaleProfitabilityDTO } from "./types";

export type RecurrenceCandidate = {
  sale: SaleProfitabilityDTO;
  line: ProfitabilityLineDTO;
  configuration: PricingV2Input | null;
  productionKeys: string[];
  provenanceComplete: boolean;
};
export type RecurrenceEvidence = {
  productId: string | null;
  saleId: string;
  number: string;
  lineKey: string;
  description: string;
  quantity: number;
  confirmedDate: string | null;
  snapshotId: string | null;
  revisionId: string | null;
  reviewed: boolean;
  productionKeys: string[];
  expected: string | null;
  actual: string | null;
  knownCost: string;
  provisional: boolean;
  difference: string | null;
  differencePercent: string | null;
  eligible: boolean;
  material: boolean;
  reasons: string[];
  reconciliation: ProductiveReconciliation;
};
export type RecurrenceGroup = {
  key: string;
  productId: string;
  description: string;
  quantity: number;
  configuration: PricingV2Input;
  candidateCount: number;
  eligibleCount: number;
  materialCount: number;
  suggestReview: boolean;
  evidence: RecurrenceEvidence[];
};
export type RecurrenceReport = {
  period: { from: string; to: string };
  groups: RecurrenceGroup[];
  ungrouped: RecurrenceEvidence[];
};

const decimal = (s: string) => new D(s).toFixed();
const sorted = (rows: unknown[]) => rows.map((r) => JSON.stringify(r)).sort();

/** Frozen productive assumptions only. No current catalog or commercial pricing. */
export function productiveConfigurationKey(
  productId: string,
  input: PricingV2Input,
): string | null {
  const parsed = pricingV2Schema.safeParse(input);
  if (!productId || !parsed.success) return null;
  const c = parsed.data;
  return JSON.stringify({
    productId,
    quantity: c.quantity,
    technology: c.technology,
    materials: sorted(
      c.materials.map((m) => ({
        ref: m.ref,
        unit: m.unit,
        price: decimal(m.pricePerBase),
        consumption: decimal(m.consumptionPerUnit),
        waste: decimal(m.fixedWaste),
      })),
    ),
    printer: {
      ref: c.printer.ref,
      acquisitionCost: decimal(c.printer.acquisitionCost),
      amortizationMonths: c.printer.amortizationMonths,
      daysPerMonth: c.printer.daysPerMonth,
      hoursPerDay: decimal(c.printer.hoursPerDay),
      watts: decimal(c.printer.watts),
    },
    machineFixedMinutes: decimal(c.machineFixedMinutes),
    machineMinutesPerUnit: decimal(c.machineMinutesPerUnit),
    energyRate: decimal(c.energyRate),
    maintenancePerHour: decimal(c.maintenancePerHour),
    failurePercent: decimal(c.failurePercent),
    setupMinutes: decimal(c.setupMinutes),
    finishingMinutesPerUnit: decimal(c.finishingMinutesPerUnit),
    laborPerHour: decimal(c.laborPerHour),
    extras: sorted(
      c.extras.map((e) => ({
        ref: e.ref,
        basis: e.basis,
        quantity: decimal(e.quantity),
        unitCost: decimal(e.unitCost),
      })),
    ),
  });
}

function civilDate(instant: string | null): string | null {
  if (!instant) return null;
  const date = new Date(instant);
  return Number.isFinite(date.getTime()) ? todaySaoPaulo(date) : null;
}

/** All candidate lines participate, before coverage/product grouping. */
function dependentRows(rows: RecurrenceCandidate[]): Set<number> {
  const parents = rows.map((_, i) => i);
  const root = (index: number): number => {
    let i = index;
    while (parents[i] !== i) {
      parents[i] = parents[parents[i]];
      i = parents[i];
    }
    return i;
  };
  const keys = new Map<string, number>();
  rows.forEach((c, i) => {
    for (const key of [
      `sale:${c.sale.saleId}`,
      ...c.productionKeys.map((p) => `production:${p}`),
    ]) {
      const other = keys.get(key);
      if (other === undefined) keys.set(key, i);
      else parents[root(i)] = root(other);
    }
  });
  const counts = new Map<number, number>();
  rows.forEach((_, i) => counts.set(root(i), (counts.get(root(i)) ?? 0) + 1));
  return new Set(rows.flatMap((_, i) => (counts.get(root(i))! > 1 ? [i] : [])));
}

export function buildRecurrence(
  candidates: RecurrenceCandidate[],
  period: { from: string; to: string },
): RecurrenceReport {
  const dependent = dependentRows(candidates);
  const groups = new Map<string, RecurrenceGroup>();
  const ungrouped: RecurrenceEvidence[] = [];
  candidates.forEach((c, index) => {
    const { sale, line } = c;
    const reasons: string[] = [];
    const configurationKey =
      c.configuration && line.productId
        ? productiveConfigurationKey(line.productId, c.configuration)
        : null;
    if (!configurationKey)
      reasons.push("Produto ou configuração congelada válida indisponível");
    if (c.configuration && c.configuration.quantity !== line.quantity)
      reasons.push("Quantidade da memória incompatível com a linha");
    if (!line.expected)
      reasons.push("Memória prevista indisponível ou vínculo desatualizado");
    const confirmedDate = civilDate(sale.confirmedAt);
    if (
      !confirmedDate ||
      confirmedDate < period.from ||
      confirmedDate > period.to
    )
      reasons.push("Confirmação ausente ou fora da janela");
    if (
      sale.status === "CANCELADA" ||
      sale.status === "RASCUNHO" ||
      sale.excluded ||
      sale.administrative?.commercialPending
    )
      reasons.push("Pedido cancelado, rascunho ou com pendência comercial");
    if (line.actual.delivered !== line.quantity)
      reasons.push("Entrega incompleta");
    const reviewed = !!sale.administrative?.lineReviews.some(
      (r) =>
        r.lineKey === line.key &&
        r.complete &&
        r.sourceHash === line.sourceHash,
    );
    if (!reviewed)
      reasons.push("Conferência da linha ausente ou desatualizada");
    if (line.actual.provisional) reasons.push("Custo produtivo provisório");
    if (!c.provenanceComplete || !c.productionKeys.length)
      reasons.push("Origem produtiva independente não rastreável");
    if (dependent.has(index))
      reasons.push(
        "Evidência dependente: pedido ou produção compartilhada na janela",
      );
    const reconciliation = reconcileProductiveLine(line, sale.administrative);
    if (!reconciliation.closed)
      reasons.push(
        "Composição produtiva incompleta ou não reconciliada",
        ...reconciliation.reasons,
      );
    const expected = line.expectedScenario.productive.value;
    const actual = line.actualScenario.productive.value;
    if (
      line.expectedScenario.productive.coverage !== "COMPLETE" ||
      line.actualScenario.productive.coverage !== "COMPLETE" ||
      expected === null ||
      actual === null
    )
      reasons.push(
        "Custo produtivo sem cobertura completa",
        ...line.actualScenario.productive.reasons,
      );
    if (expected !== null && new D(expected).lte(0))
      reasons.push("Custo previsto não positivo: percentual indisponível");
    const difference =
      expected !== null && actual !== null
        ? new D(actual).minus(expected)
        : null;
    const differencePercent =
      difference !== null && expected !== null && new D(expected).gt(0)
        ? difference.times(100).div(expected).toFixed()
        : null;
    const eligible = reasons.length === 0;
    const material =
      eligible &&
      difference !== null &&
      difference.gte(5) &&
      difference.times(100).gte(new D(expected!).times(10));
    const evidence: RecurrenceEvidence = {
      productId: line.productId,
      saleId: sale.saleId,
      number: sale.number,
      lineKey: line.key,
      description: line.description,
      quantity: line.quantity,
      confirmedDate,
      snapshotId: line.expected?.snapshotId ?? null,
      revisionId: sale.revision?.id ?? null,
      reviewed,
      productionKeys: [...new Set(c.productionKeys)],
      expected,
      actual,
      knownCost: line.actual.knownTotal,
      provisional: line.actual.provisional,
      difference: difference?.toFixed() ?? null,
      differencePercent,
      eligible,
      material,
      reasons: [...new Set(reasons)],
      reconciliation,
    };
    if (!configurationKey) {
      ungrouped.push(evidence);
      return;
    }
    let group = groups.get(configurationKey);
    if (!group) {
      group = {
        key: configurationKey,
        productId: line.productId!,
        description: line.description,
        quantity: line.quantity,
        configuration: c.configuration!,
        candidateCount: 0,
        eligibleCount: 0,
        materialCount: 0,
        suggestReview: false,
        evidence: [],
      };
      groups.set(configurationKey, group);
    }
    group.candidateCount++;
    if (eligible) group.eligibleCount++;
    if (material) group.materialCount++;
    group.evidence.push(evidence);
  });
  for (const group of groups.values())
    group.suggestReview =
      group.eligibleCount >= 5 &&
      group.materialCount >= 3 &&
      group.materialCount * 100 >= group.eligibleCount * 60;
  return {
    period: { ...period },
    groups: [...groups.values()].sort(
      (a, b) =>
        Number(b.suggestReview) - Number(a.suggestReview) ||
        a.description.localeCompare(b.description, "pt-BR") ||
        a.key.localeCompare(b.key),
    ),
    ungrouped,
  };
}
