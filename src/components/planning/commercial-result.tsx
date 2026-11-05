"use client";
import Link from "next/link";
import type {
  CommercialEnvelope,
  CommercialSimulation,
  DemandProjection,
  CompletionProjection,
} from "@/domain/planning/commercial-types";
import { PlanningIssues } from "./issues";
import { planningLabel } from "./commercial-time";
export function CompletionResult({ value }: { value: CompletionProjection }) {
  return (
    <>
      <dl className="grid gap-2">
        <dt>Retirada produtiva estimada</dt>
        <dd>{planningLabel(value.removalAt)}</dd>
        <dt>Liberação após pós-produção</dt>
        <dd>{planningLabel(value.releaseAt)}</dd>
        <dt>Entrega estimada no cenário</dt>
        <dd>{planningLabel(value.deliveryAt)}</dd>
      </dl>
      {value.issues.map((i) => (
        <p key={i}>{i}</p>
      ))}
    </>
  );
}
export function CommercialResult({
  value,
}: {
  value: CommercialEnvelope<CommercialSimulation>;
}) {
  const r = value.result;
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-label="Resultado da simulação"
    >
      <p>
        Referência: {planningLabel(value.asOf)} · revisão {value.revision} ·
        orçamento versão {value.source.version}. Válido até{" "}
        {planningLabel(value.expiresAt)}.
      </p>
      <CompletionResult value={r.completion} />
      {r.issues.map((i) => (
        <p key={i}>{i}</p>
      ))}
      {r.warnings.map((i) => (
        <p key={i}>{i}</p>
      ))}
      <h3>Previsão por item</h3>
      <ul>
        {r.lines.map((l) => (
          <li key={l.lineKey}>
            {l.lineKey}: {planningLabel(l.removalAt)}
          </li>
        ))}
      </ul>
      <h3>Impacto na fila existente</h3>
      {!r.impacts.length ? (
        <p>Nenhuma mudança nos intervalos calculados dos lotes existentes.</p>
      ) : (
        <ul>
          {r.impacts.map((i) => (
            <li key={i.batchId}>
              Lote {i.batchId}: retirada{" "}
              {planningLabel(i.before.removal?.end ?? null)} →{" "}
              {planningLabel(i.after.removal?.end ?? null)}.{" "}
              {i.after.reason ?? ""}
              <ul>
                {i.participants.map((p) => (
                  <li key={p.id}>
                    OP {p.orderSequence} · {p.description} ·{" "}
                    {p.units - p.settledUnits - p.releasedUnits} unidades ainda
                    vinculadas
                  </li>
                ))}
              </ul>
              {i.sales?.length ? (
                <p>
                  Vendas afetadas:{" "}
                  {i.sales.map((s) => (
                    <Link key={s.id} href={`/vendas/${s.id}`}>
                      VEN-{String(s.sequence).padStart(6, "0")}{" "}
                    </Link>
                  ))}
                </p>
              ) : (
                <p>Sem vínculo comercial identificado para este lote.</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p>
        Hipótese sem reserva de capacidade. Retirada não comprova peças boas;
        conciliação e etapas posteriores continuam necessárias. Nenhuma data
        combinada foi alterada.
      </p>
    </section>
  );
}
export function DemandResult({ value }: { value: DemandProjection }) {
  return (
    <>
      <p>
        {value.allDelivered
          ? "Pedido integralmente entregue."
          : value.completeCoverage
            ? "Demanda coberta; previsão condicionada às peças boas e conciliação."
            : "Cobertura incompleta: consulte as próximas ações."}
      </p>
      <PlanningIssues issues={value.issues} />
      {value.lines.map((l) => (
        <section key={l.lineKey} className="flex min-w-0 flex-col gap-2">
          <h3>{l.description}</h3>
          <p>
            Entregue: {l.delivered} · Pronto comprometido: {l.readyCommitted} ·
            Planejado: {l.planned} · Sem cobertura: {l.uncovered}
          </p>
          <p>Retirada produtiva: {planningLabel(l.removalAt)}</p>
          <PlanningIssues issues={l.issues} />
        </section>
      ))}
    </>
  );
}
