"use client";
import { useState } from "react";
import { Select } from "@/components/finance/shared";
import { ActionForm } from "./shared";
import { Field } from "@/components/ui/field";
import { productionCommand } from "@/lib/production-client";
import type { OrderDetail } from "@/server/production/queries";
import { DateReason, text, count, decimal } from "./shared";
export function CorrectionForm({
  order,
  onDone,
  onCancel,
}: {
  order: OrderDetail;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [eventId, setEventId] = useState(
    order.events.find((e) => e.kind === "REPORT")?.id ?? "",
  );
  const event = order.events.find((e) => e.id === eventId);
  return (
    <ActionForm
      revision={order.version}
      title="Corrigir apontamento"
      submit="Confirmar compensação"
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) =>
        productionCommand("CORRECT_PRODUCTION", {
          operationKey,
          expectedVersion: order.version,
          sourceEventId: eventId,
          goodUnitsToReverse: count(f, "good"),
          failedUnitsToReverse: count(f, "failed"),
          machineMinutes: decimal(f, "machine"),
          setupMinutes: decimal(f, "setup"),
          finishingMinutes: decimal(f, "finishing"),
          returns: (event?.materialLinks ?? [])
            .map((l) => ({ linkId: l.id, quantity: decimal(f, l.id) }))
            .filter((l) => l.quantity && Number(l.quantity) > 0),
          declaration: text(f, "declaration"),
          effectiveDate: text(f, "effectiveDate"),
          reason: text(f, "reason"),
        })
      }
    >
      <label className="field">
        Apontamento original
        <select
          name="eventId"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          {order.events
            .filter((e) => ["REPORT", "UPDATE"].includes(e.kind))
            .map((e) => (
              <option value={e.id} key={e.id}>
                {e.effectiveDate} · boas {e.goodUnits} · falhas {e.failedUnits}{" "}
                · {e.reason}
              </option>
            ))}
        </select>
      </label>
      <p>
        Informe apenas o que deve ser retirado do registro. O apontamento
        original será preservado. Resolva as peças comprometidas antes de
        reduzir a produção.
      </p>
      <Field
        label="Peças boas a compensar"
        name="good"
        type="number"
        min={0}
        defaultValue="0"
      />
      <Field
        label="Falhas registradas a mais"
        name="failed"
        type="number"
        min={0}
        defaultValue="0"
      />
      <Field
        label="Minutos de máquina a compensar"
        name="machine"
        inputMode="decimal"
      />
      <Field
        label="Minutos de preparação a compensar"
        name="setup"
        inputMode="decimal"
      />
      <Field
        label="Minutos de acabamento a compensar"
        name="finishing"
        inputMode="decimal"
      />
      {(event?.materialLinks ?? [])
        .filter((l) => Number(l.quantity) > 0)
        .map((l, i) => (
          <Field
            key={l.id}
            label={`Material ${i + 1}: quantidade a devolver (registrado ${l.quantity})`}
            name={l.id}
            inputMode="decimal"
          />
        ))}
      <Select
        label="Natureza da correção"
        name="declaration"
        value="ENTRY_ERROR"
        options={[
          { value: "ENTRY_ERROR", label: "Erro de lançamento comprovado" },
          {
            value: "PHYSICAL_MATERIAL_RETURN",
            label: "Material fisicamente devolvido",
          },
        ]}
      />
      <DateReason required />
    </ActionForm>
  );
}
export function CancelRemainderForm({
  order,
  onDone,
  onCancel,
}: {
  order: OrderDetail;
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <ActionForm
      revision={order.version}
      title="Cancelar restante da ordem"
      submit="Confirmar cancelamento"
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) =>
        productionCommand("CANCEL_REMAINDER", {
          operationKey,
          expectedVersion: order.version,
          orderId: order.id,
          reason: text(f, "reason"),
          lines: order.lines.map((l) => ({
            lineId: l.id,
            unitsToCancel: count(f, l.id),
            dispositions: order.origins
              .filter((o) => o.lineId === l.id && Number(o.physical) > 0)
              .map((o) => ({
                originId: o.id,
                units: Number(o.physical),
                action: text(f, o.id),
              })),
          })),
        })
      }
    >
      {order.lines.map((l) => (
        <div className="space-y-2 rounded border p-3" key={l.id}>
          <h3>{l.description}</h3>
          <Field
            label="Meta de peças a cancelar"
            name={l.id}
            type="number"
            min={0}
            max={l.targetUnits - l.goodUnits - l.canceledUnits}
            defaultValue={Math.max(
              0,
              l.targetUnits - l.goodUnits - l.canceledUnits,
            )}
            required
          />
          {order.origins
            .filter((o) => o.lineId === l.id && Number(o.physical) > 0)
            .map((o, i) => (
              <Select
                key={o.id}
                label={`Destino das ${o.physical} peças restantes da origem ${i + 1}`}
                name={o.id}
                options={[
                  ...(order.saleId
                    ? [{ value: "KEEP_SALE", label: "Manter para esta venda" }]
                    : []),
                  ...(l.productId
                    ? [
                        {
                          value: "RELEASE_STOCK",
                          label: "Disponibilizar para estoque",
                        },
                      ]
                    : []),
                  { value: "LOSS", label: "Registrar perda das peças" },
                ]}
              />
            ))}
        </div>
      ))}
      <Field
        label="Motivo do cancelamento"
        name="reason"
        minLength={3}
        required
      />
      <p>
        O material já consumido não retornará automaticamente. As reservas de
        material dessas linhas serão liberadas.
      </p>
    </ActionForm>
  );
}
