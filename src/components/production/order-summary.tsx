import type { OrderDTO } from "@/domain/production/types";
import { Badge } from "@/components/ui/badge";
import { names } from "./shared";

export function OrderSummary({
  order,
  users,
  printers,
  showRecordedTotals = true,
}: {
  order: OrderDTO;
  users: { id: string; name: string }[];
  printers: { id: string; name: string }[];
  showRecordedTotals?: boolean;
}) {
  const totals = order.lines.reduce(
    (sum, line) => ({
      good: sum.good + line.goodUnits,
      failed: sum.failed + line.failedUnits,
      canceled: sum.canceled + line.canceledUnits,
      pending:
        sum.pending +
        Math.max(0, line.targetUnits - line.goodUnits - line.canceledUnits),
    }),
    { good: 0, failed: 0, canceled: 0, pending: 0 },
  );
  const machines = [
    ...new Set(
      order.lines.map((line) => line.plannedPrinterId).filter(Boolean),
    ),
  ].map(
    (id) =>
      printers.find((printer) => printer.id === id)?.name ??
      "Máquina não disponível na lista",
  );
  const next: Record<string, string> = {
    RASCUNHO: "Revisar e liberar a ordem",
    LIBERADA: "Conferir planejamento e registrar execução",
    EM_EXECUCAO: totals.pending
      ? "Registrar execução e conferir materiais"
      : "Conferir reservas e concluir a ordem",
    CONCLUIDA: "Consultar histórico e peças prontas",
    CANCELADA: "Consultar histórico do cancelamento",
  };
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant={order.status === "CANCELADA" ? "outline" : "secondary"}>
          {names[order.status] ?? order.status}
        </Badge>
        <Badge variant="outline">{names[order.origin] ?? order.origin}</Badge>
        <Badge variant="outline">{totals.pending} pendentes</Badge>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Prazo</dt>
          <dd className="m-0 break-words">
            {order.dueDate
              ? order.dueDate.split("-").reverse().join("/")
              : "Não definido"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Responsável</dt>
          <dd className="m-0 break-words">
            {users.find((user) => user.id === order.responsibleId)?.name ??
              (order.responsibleId
                ? "Responsável fora da lista atual"
                : "Sem responsável")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Máquina planejada</dt>
          <dd className="m-0 break-words">
            {machines.length ? machines.join(", ") : "Não definida"}
          </dd>
        </div>
      </dl>
      {showRecordedTotals && (
        <p>
          {totals.good} boas · {totals.failed} falhas · {totals.canceled}{" "}
          canceladas
        </p>
      )}
      <p className="text-muted-foreground">
        Próxima etapa: <span>{next[order.status] ?? "Consultar ordem"}</span>
      </p>
    </div>
  );
}
