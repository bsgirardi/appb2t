"use client";
import { Select } from "@/components/finance/shared";
import { ActionForm } from "./shared";
import { Field } from "@/components/ui/field";
import { productionCommand } from "@/lib/production-client";
import type {
  OrderDetail,
  ProductionOptions,
} from "@/server/production/queries";
import { text, optional } from "./shared";
export function PlanningForm({
  order,
  options,
  onDone,
  onCancel,
}: {
  order: OrderDetail;
  options: ProductionOptions;
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <ActionForm
      title="Alterar planejamento"
      revision={order.version}
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) =>
        productionCommand("ORDER_PLAN", {
          operationKey,
          expectedVersion: order.version,
          orderId: order.id,
          responsibleId: optional(f, "responsibleId") ?? null,
          dueDate: optional(f, "dueDate") ?? null,
          notes: text(f, "notes"),
          reason: text(f, "reason"),
          lines: order.lines.map((l) => ({
            lineId: l.id,
            plannedPrinterId: optional(f, l.id) ?? null,
          })),
        })
      }
    >
      <Select
        label="Responsável planejado"
        name="responsibleId"
        value={order.responsibleId ?? ""}
        required={false}
        options={options.users.map((u) => ({ value: u.id, label: u.name }))}
      />
      <Field
        label="Prazo"
        name="dueDate"
        type="date"
        defaultValue={order.dueDate ?? ""}
      />
      {order.lines.map((l) => (
        <Select
          key={l.id}
          label={`Máquina planejada · ${l.description}`}
          name={l.id}
          value={l.plannedPrinterId ?? ""}
          required={false}
          options={options.printers
            .filter((p) => p.technology === l.technology)
            .map((p) => ({ value: p.id, label: p.name }))}
        />
      ))}
      <Field
        label="Observações"
        name="notes"
        defaultValue={order.notes}
        maxLength={2000}
      />
      <Field label="Motivo da alteração" name="reason" required minLength={3} />
      <p>O histórico da execução e as metas serão preservados.</p>
    </ActionForm>
  );
}
