"use client";
import type { BatchDTO } from "@/domain/planning/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/field";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { states, instantLabel, type PlanningData } from "./shared";
import { useQueueSimulation } from "./queue-simulation";
const reasons = {
  MISSING_DATA: "Configure horários e dados do lote.",
  NO_WINDOW: "Sem janela contínua nos próximos 90 dias.",
  UNCONFIRMED_END: "Confirme o término real ou informe o tempo restante.",
  MATERIAL_PENDING: "Resolva as pendências de material e confirmação.",
};
type QueueProps = {
  data: PlanningData;
  batches: BatchDTO[];
  onSelect: (id: string) => void;
  onDone: () => void;
};
export function Queue(props: QueueProps) {
  return (
    <QueueBody key={`${props.data.revision}:${props.data.asOf}`} {...props} />
  );
}
function QueueBody({ data, batches, onSelect, onDone }: QueueProps) {
  const { panel, propose, busy, staged } = useQueueSimulation(data, onDone);
  const reorder = (printerId: string, batchIds: string[]) =>
    propose({ printerId, batchIds });
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {panel}
      {staged && (
        <Notice kind="info">
          Sequência proposta, ainda não registrada. Previsões abaixo
          correspondem à fila registrada; compare os novos horários na simulação
          antes de confirmar.
        </Notice>
      )}
      {!batches.length && (
        <Empty role="region" aria-label="Fila vazia">
          <EmptyHeader>
            <EmptyTitle>Nenhum lote nesta seleção.</EmptyTitle>
            <EmptyDescription>
              Revise os filtros da fila ou use Novo lote para preparar uma
              composição.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {data.printers
        .filter((p) => batches.some((b) => b.printerId === p.id))
        .map((printer) => {
          const future = (data.batches ?? batches)
            .filter(
              (b) =>
                b.printerId === printer.id &&
                ["PENDING", "SCHEDULED"].includes(b.state),
            )
            .sort((a, b) =>
              staged?.printerId === printer.id
                ? staged.batchIds.indexOf(a.id) - staged.batchIds.indexOf(b.id)
                : a.position - b.position || a.id.localeCompare(b.id),
            );
          const positions = new Map(future.map((b, index) => [b.id, index]));
          const visible = batches
            .filter((b) => b.printerId === printer.id)
            .sort(
              (a, b) =>
                (positions.get(a.id) ?? -1) - (positions.get(b.id) ?? -1),
            );
          const move = (index: number, direction: number) => {
            const ids = future.map((b) => b.id);
            [ids[index], ids[index + direction]] = [
              ids[index + direction],
              ids[index],
            ];
            void reorder(printer.id, ids);
          };
          const due = (b: BatchDTO) =>
            b.participants.map((p) => p.dueDate ?? "9999").sort()[0];
          return (
            <Card key={printer.id}>
              <CardHeader>
                <CardTitle>{printer.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {future.length > 1 && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void reorder(
                        printer.id,
                        [...future]
                          .sort(
                            (a, b) =>
                              due(a).localeCompare(due(b)) ||
                              a.id.localeCompare(b.id),
                          )
                          .map((b) => b.id),
                      )
                    }
                  >
                    Simular ordem por prazo
                  </Button>
                )}
                <ol className="flex flex-col gap-4">
                  {visible.map((b) => {
                    const f = data.forecast.batches.find(
                      (f) => f.batchId === b.id,
                    );
                    const index = future.findIndex((x) => x.id === b.id);
                    return (
                      <li
                        key={b.id}
                        className="planning-batch flex min-w-0 flex-col gap-3 rounded-lg border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="link"
                            aria-label={`Abrir lote ${b.sequence} · ${b.colorLabel}`}
                            onClick={() => onSelect(b.id)}
                          >
                            Lote {b.sequence} · {b.colorLabel}
                          </Button>
                          <Badge variant="secondary">{states[b.state]}</Badge>
                        </div>
                        <p>Posição registrada: {b.position}</p>
                        <ul>
                          {b.participants.map((p, i) => (
                            <li key={p.lineId ?? i}>
                              OP {p.orderSequence} · {p.description}: {p.units}{" "}
                              peças · prazo {p.dueDate ?? "não informado"}
                            </li>
                          ))}
                        </ul>
                        <section
                          aria-label={`Previsão do lote ${b.sequence}`}
                          className="planning-forecast"
                        >
                          {f?.removal ? (
                            <p>
                              Retirada prevista: {instantLabel(f.removal.end)}
                              {f.late ? " · Após o prazo de produção" : ""}
                            </p>
                          ) : (
                            <p>
                              Previsão indisponível.{" "}
                              {f?.reason
                                ? reasons[f.reason]
                                : "Lote fora da programação."}
                            </p>
                          )}
                          {f?.print && (
                            <p>
                              Impressão: {instantLabel(f.print.start)} →{" "}
                              {instantLabel(f.print.end)}
                            </p>
                          )}
                          {f?.waitingRemoval && (
                            <p>
                              Máquina aguardando equipe:{" "}
                              {instantLabel(f.waitingRemoval.start)} →{" "}
                              {instantLabel(f.waitingRemoval.end)}
                            </p>
                          )}
                        </section>
                        {!!b.blockers.length &&
                          !["CANCELED", "CLOSED"].includes(b.state) && (
                            <h3>Pendências para revisão</h3>
                          )}
                        {!["CANCELED", "CLOSED"].includes(b.state) &&
                          b.blockers.map((x) => <p key={x}>{x}</p>)}
                        {b.state === "CLOSED" &&
                          (b.participants.some(
                            (p) => p.settledUnits + p.releasedUnits < p.units,
                          ) ||
                            b.coverage.some(
                              (c) => Number(c.outstandingQuantity) > 0,
                            )) && (
                            <Notice kind="info">
                              Conciliação pendente: confira peças e material do
                              lote.
                            </Notice>
                          )}
                        {index >= 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="planning-move-label">
                              Simular posição:
                            </span>
                            <Button
                              variant="outline"
                              aria-label={`Subir lote ${b.sequence}`}
                              disabled={busy || index === 0}
                              onClick={() => move(index, -1)}
                            >
                              Subir
                            </Button>
                            <Button
                              variant="outline"
                              aria-label={`Descer lote ${b.sequence}`}
                              disabled={busy || index === future.length - 1}
                              onClick={() => move(index, 1)}
                            >
                              Descer
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
