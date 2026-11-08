"use client";
import { PlanningIssues } from "./issues";
import { useState } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import type { BatchDTO } from "@/domain/planning/types";
import { effectiveMilestones } from "@/domain/planning/scheduler";
import { civilInstant } from "@/domain/planning/calendar";
import { Field, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { planningCommand } from "@/lib/planning-client";
import { BatchForm } from "./batch-form";
import {
  ActionForm,
  Select,
  Toggle,
  text,
  count,
  optional,
  meta,
  markers,
  states,
  instantLabel,
  type PlanningData,
} from "./shared";
const actualInstant = (f: FormData) => {
  const value = text(f, "instant");
  if (!value) return new Date().toISOString();
  const [day, time] = value.split("T");
  const [h, m] = time.split(":").map(Number);
  return new Date(civilInstant(day, h * 60 + m)).toISOString();
};
export function BatchDetail({
  data,
  batch: b,
  onDone,
  onClose,
}: {
  data: PlanningData;
  batch: BatchDTO;
  onDone: () => void;
  onClose: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const milestones = effectiveMilestones(b);
  const times = data.timeSummaries.find((t) => t.batchId === b.id);
  if (edit)
    return (
      <BatchForm
        data={data}
        batch={b}
        onDone={() => {
          setEdit(false);
          onDone();
        }}
        onCancel={() => setEdit(false)}
      />
    );
  const future = ["DRAFT", "PENDING", "SCHEDULED"].includes(b.state);
  const kinds =
    b.state === "SCHEDULED"
      ? ["PREPARE_START"]
      : b.state === "PREPARING"
        ? ["PRINT_START"]
        : b.state === "PRINTING"
          ? ["PRINT_END", "REMAINING", "INTERRUPT"]
          : b.state === "AWAITING_REMOVAL"
            ? [
                milestones.some((m) => m.kind === "REMOVE_START")
                  ? "REMOVE_END"
                  : "REMOVE_START",
              ]
            : [];
  const command = (action: string, key: string, payload: object = {}) =>
    planningCommand(action, {
      ...meta(data, key, b.version),
      batchId: b.id,
      ...payload,
    });
  const material = data.materials.find((m) => m.id === b.materialItemId);
  return (
    <section className="planning-detail flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <h2>
          Lote {b.sequence} · {states[b.state]}
        </h2>
        <Button variant="outline" onClick={onClose}>
          Voltar à fila
        </Button>
        {future && (
          <Button variant="outline" onClick={() => setEdit(true)}>
            Revisar composição
          </Button>
        )}
      </div>
      <dl className="planning-facts">
        <div>
          <dt>Material e cor declarada</dt>
          <dd>
            {material?.name ?? "Material não identificado"} · {b.colorLabel}
          </dd>
        </div>
        <div>
          <dt>Impressão estimada</dt>
          <dd>
            {b.durationMinutes === null
              ? "Não informada"
              : `${b.durationMinutes} min`}
          </dd>
        </div>
        <div>
          <dt>Preparação</dt>
          <dd>{b.prepareMinutes} min</dd>
        </div>
        <div>
          <dt>Retirada</dt>
          <dd>{b.removeMinutes} min</dd>
        </div>
      </dl>
      <Notice kind="info">
        A cor depende de confirmação manual: o estoque não separa saldo por cor.
        Os marcos deste lote não registram consumo nem custos. Os apontamentos
        de produção permanecem por item.
      </Notice>
      <section aria-label="Peças e tempos registrados">
        <h3>Peças e tempos registrados</h3>
        <ul className="planning-participants">
          {times && (
            <li>
              Tempo real de impressão:{" "}
              {times.actualMachineMinutes ?? "sem término confirmado"} min. Soma
              dos apontamentos exclusivos:{" "}
              {times.reportedMachineMinutes ?? "não determinada"} min.{" "}
              {times.complete
                ? "Tempos e peças conferem."
                : "Cobertura incompleta: confira peças e tempos por linha. Não há rateio automático de apontamentos compartilhados."}
            </li>
          )}
          {b.participants.map((p) => (
            <li key={p.id}>
              OP {p.orderSequence} · {p.description}: {p.settledUnits}/{p.units}{" "}
              peças conciliadas; {p.releasedUnits} liberadas sem execução. Prazo{" "}
              {p.dueDate ?? "não informado"}.{" "}
              <Link
                href={`/producao?query=${encodeURIComponent(p.description)}`}
              >
                Abrir produção para apontar peças e tempos
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {b.state !== "CANCELED" &&
        (b.issues?.length ? (
          <PlanningIssues
            issues={b.issues}
            onOpenTarget={(t) => {
              if (t.kind === "batch-edit" && future) setEdit(true);
              else document.getElementById("batch-actions")?.focus();
            }}
          />
        ) : (
          b.blockers.map((x) => <Notice key={x}>{x}</Notice>)
        ))}
      <p>
        Posição registrada: {b.position}.{" "}
        {future
          ? "Lote futuro; a fila pode ser simulada antes de confirmar mudanças."
          : "Confira os marcos reais deste lote."}{" "}
        O horário depende das outras máquinas e da equipe compartilhada; o prazo
        acima é da OP, não uma promessa de entrega.
      </p>
      <div id="batch-actions" tabIndex={-1} />
      {b.state === "DRAFT" && (
        <ActionForm
          title="Confirmar composição"
          submit="Confirmar lote"
          revision={data.revision}
          onDone={onDone}
          onSubmit={(_, key) => command("BATCH_CONFIRM", key)}
        >
          <p>
            Estas peças passam a pertencer a este lote e ficam indisponíveis
            para outros lotes.
          </p>
        </ActionForm>
      )}
      {["PENDING", "SCHEDULED"].includes(b.state) && (
        <ActionForm
          title="Cobertura de material"
          submit="Salvar cobertura"
          revision={`${data.revision}:${b.version}`}
          onDone={onDone}
          onSubmit={(f, key) =>
            command("BATCH_COVERAGE", key, {
              colorAvailabilityConfirmed: f.has("colorAvailabilityConfirmed"),
              needs: b.participants.map((p) => ({
                participationId: p.id,
                quantity: text(f, `need:${p.id}`).replace(",", "."),
              })),
              allocations: b.participants.flatMap((p) =>
                data.allocations
                  .filter(
                    (a) =>
                      a.lineId === p.lineId && a.itemId === b.materialItemId,
                  )
                  .map((a) => ({
                    participationId: p.id,
                    allocationId: a.id,
                    quantity: text(f, `coverage:${p.id}:${a.id}`).replace(
                      ",",
                      ".",
                    ),
                  }))
                  .filter((a) => a.quantity && Number(a.quantity) > 0),
              ),
            })
          }
        >
          <p>
            Vincule reservas já feitas em Produção. Unidade: {material?.unit}.
            Esta ação não cria nem consome reservas.
          </p>
          {b.participants.map((p) => (
            <fieldset key={p.id} className="flex flex-col gap-2">
              <legend>
                OP {p.orderSequence} · {p.description}
              </legend>
              <Field
                label={`Necessidade — OP ${p.orderSequence}`}
                name={`need:${p.id}`}
                required
                inputMode="decimal"
                defaultValue={p.needQuantity === "0" ? "" : p.needQuantity}
              />
              {data.allocations
                .filter(
                  (a) => a.lineId === p.lineId && a.itemId === b.materialItemId,
                )
                .map((a, i) => (
                  <Field
                    key={a.id}
                    label={`Reserva ${i + 1} — OP ${p.orderSequence}`}
                    name={`coverage:${p.id}:${a.id}`}
                    inputMode="decimal"
                    defaultValue={
                      b.coverage.find(
                        (c) =>
                          c.participationId === p.id && c.allocationId === a.id,
                      )?.quantity ?? ""
                    }
                    hint={`${new Decimal(a.remaining).minus(a.claimed.filter((c) => c.batchId !== b.id).reduce((n, c) => n.plus(c.quantity), new Decimal(0))).toFixed()} ${material?.unit} disponíveis para este lote.`}
                  />
                ))}
            </fieldset>
          ))}
          <Toggle
            name="colorAvailabilityConfirmed"
            label="Conferi fisicamente a disponibilidade desta cor"
            defaultChecked={b.colorAvailabilityConfirmed}
          />
        </ActionForm>
      )}
      {b.state === "PENDING" && (
        <ActionForm
          title="Programar na fila"
          submit="Programar lote"
          revision={data.revision}
          onDone={onDone}
          onSubmit={(_, key) => command("BATCH_SCHEDULE", key)}
        >
          <p>O lote só ocupará capacidade após resolver as pendências.</p>
        </ActionForm>
      )}
      {!!kinds.length && (
        <ActionForm
          title="Registrar marco real"
          submit="Confirmar marco"
          revision={`${data.revision}:${b.version}`}
          onDone={onDone}
          onSubmit={(f, key) =>
            command("MILESTONE", key, {
              kind: text(f, "kind"),
              instant: actualInstant(f),
              reason: optional(f, "reason"),
              ...(text(f, "kind") === "REMAINING"
                ? {
                    remainingMinutes: text(f, "remainingMinutes").replace(
                      ",",
                      ".",
                    ),
                  }
                : {}),
            })
          }
        >
          <Select
            label="Marco"
            name="kind"
            value={kinds[0]}
            options={kinds.map((k) => ({ value: k, label: markers[k] }))}
          />
          <Field
            label="Instante real (São Paulo)"
            name="instant"
            type="datetime-local"
            hint="Vazio registra o momento da confirmação."
          />
          <Field
            label="Tempo restante (min)"
            name="remainingMinutes"
            inputMode="decimal"
            hint="Preencha somente para atualizar tempo restante."
          />
          <Field label="Motivo / ocorrência" name="reason" minLength={3} />
          <p>
            Fim da impressão mantém a máquina ocupada até concluir a retirada.
          </p>
        </ActionForm>
      )}
      {!!b.milestones.length && (
        <section>
          <h3>Histórico de marcos</h3>
          <ul>
            {b.milestones.map((m) => (
              <li key={m.id}>
                {markers[m.kind] ?? m.kind} · {instantLabel(m.instant)}
                {m.sourceId ? " · correção" : ""}
                {milestones.some((x) => x.id === m.id) ? "" : " · substituído"}
                {m.reason ? ` · ${m.reason}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.role === "ADMIN" &&
        milestones.some((m) => m.kind !== "REMAINING") && (
          <ActionForm
            title="Corrigir horário de um marco"
            submit="Registrar correção"
            revision={data.revision}
            onDone={onDone}
            onSubmit={(f, key) =>
              planningCommand("MILESTONE_CORRECT", {
                ...meta(data, key, b.version),
                sourceId: text(f, "sourceId"),
                instant: actualInstant(f),
                reason: text(f, "reason"),
              })
            }
          >
            <Select
              label="Marco a corrigir"
              name="sourceId"
              options={milestones
                .filter((m) => m.kind !== "REMAINING")
                .map((m) => ({
                  value: m.id,
                  label: `${markers[m.kind]} · ${instantLabel(m.instant)}`,
                }))}
            />
            <Field
              label="Horário correto (São Paulo)"
              name="instant"
              type="datetime-local"
              required
            />
            <Field
              label="Justificativa da correção"
              name="reason"
              required
              minLength={3}
            />
          </ActionForm>
        )}
      {!future && b.state !== "CANCELED" && (
        <ActionForm
          title="Vincular apontamento existente"
          submit="Conciliar apontamento"
          revision={data.revision}
          onDone={onDone}
          onSubmit={(f, key) =>
            command("BATCH_RECONCILE", key, {
              reason: text(f, "reason"),
              links: [
                {
                  participationId: text(f, "participationId"),
                  eventId: text(f, "eventId"),
                  goodUnits: count(f, "goodUnits"),
                  failedUnits: count(f, "failedUnits"),
                },
              ],
            })
          }
        >
          <p>
            Use um apontamento de Produção desta linha e desta máquina. Para uma
            nova execução, abra Produção e selecione o lote no apontamento.
          </p>
          <Select
            label="Participação"
            name="participationId"
            options={b.participants.map((p) => ({
              value: p.id,
              label: `OP ${p.orderSequence} · ${p.description}`,
            }))}
          />
          <Select
            label="Apontamento existente"
            name="eventId"
            options={data.reports
              .filter(
                (e) =>
                  e.printerId === b.printerId &&
                  b.participants.some((p) => p.lineId === e.lineId),
              )
              .map((e) => ({
                value: e.id,
                label: `Apontamento ${e.sequence} · ${e.date} · ${b.participants.find((p) => p.lineId === e.lineId)?.description} · ${e.goodUnits} boas / ${e.failedUnits} falhas`,
              }))}
          />
          <Field
            label="Peças boas a vincular"
            name="goodUnits"
            type="number"
            min={0}
            step={1}
            defaultValue={0}
          />
          <Field
            label="Falhas a vincular"
            name="failedUnits"
            type="number"
            min={0}
            step={1}
            defaultValue={0}
          />
          <Field
            label="Justificativa da conciliação"
            name="reason"
            required
            minLength={3}
          />
        </ActionForm>
      )}
      {b.state === "CLOSED" && (
        <ActionForm
          title="Conferir sobras do lote encerrado"
          submit="Liberar sobras conferidas"
          revision={`${data.revision}:${b.version}`}
          onDone={onDone}
          onSubmit={(f, key) =>
            command("BATCH_RELEASE_REMAINDER", key, {
              reason: text(f, "reason"),
              releases: b.participants
                .map((p) => ({
                  participationId: p.id,
                  units: count(f, `release:${p.id}`),
                }))
                .filter((r) => r.units > 0),
              materialReleases: b.coverage
                .map((c) => ({
                  coverageId: c.id,
                  quantity: text(f, `releaseMaterial:${c.id}`).replace(
                    ",",
                    ".",
                  ),
                }))
                .filter((r) => Number(r.quantity) > 0),
            })
          }
        >
          <Notice kind="info">
            Após conferência física, libere apenas peças não executadas e
            material remanescente. Registre o consumo real em Produção antes
            desta liberação. Esta ação mantém os apontamentos e não movimenta
            estoque.
          </Notice>
          {b.participants.map((p) => (
            <Field
              key={p.id}
              label={`Peças não executadas — OP ${p.orderSequence}`}
              name={`release:${p.id}`}
              type="number"
              min={0}
              max={p.units - p.settledUnits - p.releasedUnits}
              step={1}
              defaultValue={0}
            />
          ))}
          {b.coverage.map((c, i) => (
            <Field
              key={c.id}
              label={`Material remanescente — parcela ${i + 1} (${material?.unit})`}
              name={`releaseMaterial:${c.id}`}
              inputMode="decimal"
              defaultValue="0"
              hint={`${c.outstandingQuantity} ${material?.unit} ainda vinculados a este lote.`}
            />
          ))}
          <Field
            label="Motivo e resultado da conferência"
            name="reason"
            minLength={3}
            required
          />
        </ActionForm>
      )}
      {(future || (data.role === "ADMIN" && b.state === "CLOSED")) && (
        <ActionForm
          title="Cancelar lote"
          submit="Cancelar lote"
          revision={data.revision}
          onDone={onDone}
          onSubmit={(f, key) =>
            command("BATCH_CANCEL", key, { reason: text(f, "reason") })
          }
        >
          <p>
            Libera as peças futuras. As reservas da ordem permanecem para
            revisão em Produção.
          </p>
          <Field
            label="Motivo do cancelamento"
            name="reason"
            required
            minLength={3}
          />
        </ActionForm>
      )}
    </section>
  );
}
