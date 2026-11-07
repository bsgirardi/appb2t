import Decimal from "decimal.js";
import type { DocumentItemInput } from "@/domain/commerce/types";
import type {
  DocumentCostsDTO,
  LineCostBinding,
  PricingSnapshotDTO,
} from "@/domain/pricing/types";
import {
  compareLineCost,
  lineFingerprint,
} from "@/domain/pricing/document-costs";
import { formatBRL } from "@/domain/calculation/calculate";
import { PricingResult } from "./pricing-result";
export function currentBindingState(
  item: DocumentItemInput,
  binding: LineCostBinding,
): LineCostBinding["state"] {
  return binding.state === "STALE" ||
    binding.fingerprint !== lineFingerprint(item)
    ? "STALE"
    : "VALID";
}
export function LineCostSummary({
  item,
  snapshot,
  state,
}: {
  item: DocumentItemInput;
  snapshot?: PricingSnapshotDTO;
  state?: LineCostBinding["state"];
}) {
  if (!snapshot) return <p>Sem estimativa de custo</p>;
  let comparison: ReturnType<typeof compareLineCost> = null;
  try {
    comparison = compareLineCost(item, snapshot, state ?? "STALE");
  } catch {}
  return (
    <section className="space-y-2" aria-label="Custo privado do item">
      {!comparison ? (
        <p role="alert">
          Estimativa desatualizada ou preço inválido. Recalcule ou remova a
          estimativa antes de emitir ou confirmar.
        </p>
      ) : (
        <dl className="space-y-1">
          <div>
            <dt>Custo estimado por peça</dt>
            <dd>{formatBRL(snapshot.result.unitFullCost)}</dd>
          </div>
          <div>
            <dt>
              {comparison.tax?.amount === null
                ? "Contribuição antes de tributos não identificados"
                : "Contribuição estimada do item"}
            </dt>
            <dd>{formatBRL(comparison.contribution)}</dd>
          </div>
          <div>
            <dt>Resultado do item após depreciação</dt>
            <dd>{formatBRL(comparison.afterDepreciation)}</dd>
          </div>
        </dl>
      )}
      <p className="muted">
        Antes de descontos e frete do documento. Trabalho precificado por
        atividade; taxas estimadas não geram lançamentos financeiros.
      </p>
      {comparison?.tax && (
        <p>
          {comparison.tax.amount === null
            ? "Cobertura tributária indisponível nesta premissa."
            : snapshot.input.tax?.profile?.regime === "MEI"
              ? "DAS MEI é custo fixo mensal, sem rateio por peça."
              : `Tributo estimado do item: ${formatBRL(comparison.tax.amount)}.`}
        </p>
      )}
      <details>
        <summary>Memória preservada do item</summary>
        <p>
          {snapshot.actorName} ·{" "}
          {new Date(snapshot.createdAt).toLocaleString("pt-BR")}
        </p>
        <PricingResult input={snapshot.input} result={snapshot.result} />
      </details>
    </section>
  );
}
export function DocumentCostSummary({
  items,
  costs,
  discount = "0",
  shipping = "0",
}: {
  items: DocumentItemInput[];
  costs?: DocumentCostsDTO | null;
  discount?: string;
  shipping?: string;
}) {
  let global = false;
  try {
    global =
      new Decimal(discount.replace(",", ".")).gt(0) ||
      new Decimal(shipping.replace(",", ".")).gt(0);
  } catch {}
  return (
    <section className="no-print print:hidden space-y-3 rounded-lg border p-4">
      <h2>Custos internos por item</h2>
      {global && <p>resultado global não apurado nesta etapa</p>}
      {items.map((item, index) => {
        const binding = costs?.bindings.find((b) => b.lineId === item.lineId),
          snapshot = costs?.snapshots.find((s) => s.id === binding?.snapshotId);
        return (
          <div key={item.lineId ?? index}>
            <h3>{item.description}</h3>
            <LineCostSummary
              item={item}
              snapshot={snapshot}
              state={binding ? currentBindingState(item, binding) : undefined}
            />
          </div>
        );
      })}
    </section>
  );
}
