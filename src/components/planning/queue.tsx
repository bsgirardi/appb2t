"use client";
import { useRef, useState } from "react";
import type { BatchDTO } from "@/domain/planning/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/field";
import { planningCommand } from "@/lib/planning-client";
import { meta, states, instantLabel, type PlanningData } from "./shared";
const reasons = {
  MISSING_DATA: "Configure horários e dados do lote.",
  NO_WINDOW: "Sem janela contínua nos próximos 90 dias.",
  UNCONFIRMED_END: "Confirme o término real ou informe o tempo restante.",
  MATERIAL_PENDING: "Resolva as pendências de material e confirmação.",
};
export function Queue({
  data,
  batches,
  onSelect,
  onDone,
}: {
  data: PlanningData;
  batches: BatchDTO[];
  onSelect: (id: string) => void;
  onDone: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const retry = useRef<{ signature: string; key: string } | null>(null);
  async function reorder(printerId: string, ids: string[]) {
    const signature = JSON.stringify([data.revision, printerId, ids]);
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    try {
      await planningCommand("QUEUE_REORDER", {
        ...meta(data, retry.current.key),
        printerId,
        batchIds: ids,
      });
      retry.current = null;
      setError("");
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {error && <Notice>{error}</Notice>}
      {!batches.length && <p>Nenhum lote nesta seleção.</p>}
      {data.printers
        .filter((p) => batches.some((b) => b.printerId === p.id))
        .map((printer) => {
          const visible = batches.filter((b) => b.printerId === printer.id);
          const future = (data.batches ?? batches)
            .filter(
              (b) =>
                b.printerId === printer.id &&
                ["PENDING", "SCHEDULED"].includes(b.state),
            )
            .sort(
              (a, b) => a.position - b.position || a.id.localeCompare(b.id),
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
                    Aplicar ordem por prazo
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
                        className="flex flex-col gap-2 rounded-lg border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="link" onClick={() => onSelect(b.id)}>
                            Lote {b.sequence} · {b.colorLabel}
                          </Button>
                          <Badge variant="secondary">{states[b.state]}</Badge>
                        </div>
                        <ul>
                          {b.participants.map((p, i) => (
                            <li key={p.lineId ?? i}>
                              OP {p.orderSequence} · {p.description}: {p.units}{" "}
                              peças · prazo {p.dueDate ?? "não informado"}
                            </li>
                          ))}
                        </ul>
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
                        {["PENDING", "SCHEDULED", "DRAFT"].includes(b.state) &&
                          b.blockers.map((x) => <p key={x}>{x}</p>)}
                        {b.state === "CLOSED" &&
                          b.participants.some(
                            (p) => p.settledUnits < p.units,
                          ) && (
                            <Notice kind="info">
                              Conciliação pendente: registre ou vincule as peças
                              em Produção.
                            </Notice>
                          )}
                        {index >= 0 && (
                          <div className="flex flex-wrap gap-2">
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
