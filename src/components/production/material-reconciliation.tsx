"use client";
import { useState } from "react";
import { Select } from "@/components/finance/shared";
import { ActionForm } from "./shared";
import { Field } from "@/components/ui/field";
import { productionCommand } from "@/lib/production-client";
import type { OrderDetail } from "@/server/production/queries";
import { text, decimal } from "./shared";
export function MaterialReconciliation({
  order,
  admin,
  onDone,
}: {
  order: OrderDetail;
  admin: boolean;
  onDone: () => void;
}) {
  const [lineId, setLineId] = useState(order.lines[0]?.id ?? "");
  const line = order.lines.find((l) => l.id === lineId);
  return (
    <details>
      <summary>Conciliar materiais anteriores da venda</summary>
      <label className="field">
        Item da ordem
        <select value={lineId} onChange={(e) => setLineId(e.target.value)}>
          {order.lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.description}
            </option>
          ))}
        </select>
      </label>
      {order.saleReservations
        .filter(
          (r) => r.lineKey === line?.saleLineKey && Number(r.available) > 0,
        )
        .map((r) => (
          <ActionForm
            key={r.id}
            title={`${r.name}: ${r.available} ${r.unit} já reservados`}
            revision={`${order.version}:${r.version}`}
            onDone={onDone}
            onSubmit={(f, operationKey) =>
              productionCommand("MATERIAL_ALLOCATE", {
                operationKey,
                expectedVersion: order.version,
                lineId,
                reservationId: r.id,
                reservationVersion: r.version,
                quantity: decimal(f, "quantity"),
              })
            }
          >
            <Field
              label="Quantidade destinada a esta ordem"
              name="quantity"
              required
              inputMode="decimal"
            />
            <p>Usa a reserva existente, sem duplicar o total reservado.</p>
          </ActionForm>
        ))}
      {admin && (
        <ActionForm
          title="Associar consumo anterior comprovado"
          revision={order.version}
          onDone={onDone}
          onSubmit={(f, operationKey) =>
            productionCommand("LINK_CONSUMPTION", {
              operationKey,
              expectedVersion: order.version,
              eventId: text(f, "eventId"),
              movementId: text(f, "movementId"),
              quantity: decimal(f, "quantity"),
              reason: text(f, "reason"),
            })
          }
        >
          <Select
            label="Apontamento de destino"
            name="eventId"
            options={order.events
              .filter((e) => e.lineId === lineId && e.kind === "REPORT")
              .map((e) => ({
                value: e.id,
                label: `${e.effectiveDate}: ${e.goodUnits} boas, ${e.failedUnits} falhas`,
              }))}
          />
          <Select
            label="Consumo anterior"
            name="movementId"
            options={order.previousConsumptions
              .filter((m) => m.lineKey === line?.saleLineKey)
              .map((m) => ({
                value: m.id,
                label: `${m.name}: ${m.quantity} originalmente consumidos`,
              }))}
          />
          <Field
            label="Quantidade a associar"
            name="quantity"
            inputMode="decimal"
            required
          />
          <Field
            label="Comprovação do vínculo"
            name="reason"
            required
            minLength={3}
          />
          <p>
            Não haverá nova saída. O saldo líquido ainda não associado será
            conferido ao salvar.
          </p>
        </ActionForm>
      )}
    </details>
  );
}
