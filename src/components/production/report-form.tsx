"use client";
import { useState } from "react";
import { Select } from "@/components/finance/shared";
import { ActionForm } from "./shared";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { productionCommand } from "@/lib/production-client";
import type {
  OrderDetail,
  ProductionOptions,
} from "@/server/production/queries";
import { DateReason, Toggle, text, decimal, count, optional } from "./shared";
export function ReportForm({
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
  const [lineId, setLineId] = useState(order.lines[0]?.id ?? ""),
    [rows, setRows] = useState<number[]>([]),
    [next, setNext] = useState(1);
  const line = order.lines.find((l) => l.id === lineId);
  return (
    <ActionForm
      revision={order.version}
      title="Registrar execução"
      submit="Confirmar apontamento"
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) =>
        productionCommand("REPORT", {
          operationKey,
          expectedVersion: order.version,
          lineId: text(f, "lineId"),
          executorId: text(f, "executorId"),
          printerId: optional(f, "printerId"),
          manualStage: f.get("manualStage") === "on",
          goodUnits: count(f, "goodUnits"),
          failedUnits: count(f, "failedUnits"),
          machineMinutes: decimal(f, "machineMinutes"),
          setupMinutes: decimal(f, "setupMinutes"),
          finishingMinutes: decimal(f, "finishingMinutes"),
          materialComplete: f.get("materialComplete") === "on",
          timeComplete: f.get("timeComplete") === "on",
          reprintOf: optional(f, "reprintOf"),
          materials: rows.map((i) => ({
            itemId: text(f, `item${i}`),
            quantity: decimal(f, `quantity${i}`),
            allocations: optional(f, `identity${i}`)
              ? [
                  {
                    identityId: text(f, `identity${i}`),
                    quantity: decimal(f, `quantity${i}`),
                  },
                ]
              : undefined,
            reservationAllocationId: optional(f, `reservation${i}`),
            allowExcess: f.get(`excess${i}`) === "on",
          })),
          effectiveDate: text(f, "effectiveDate"),
          reason: optional(f, "reason"),
        })
      }
    >
      <label className="field">
        Item da ordem
        <select
          name="lineId"
          value={lineId}
          onChange={(e) => setLineId(e.target.value)}
        >
          {order.lines.map((l) => (
            <option value={l.id} key={l.id}>
              {l.description}
            </option>
          ))}
        </select>
      </label>
      <p>
        Já produzidas: {line?.goodUnits ?? 0} · meta: {line?.targetUnits ?? 0}.
        Informe apenas o que ocorreu nesta execução.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Executor"
          name="executorId"
          value={order.responsibleId ?? options.users[0]?.id}
          options={options.users.map((u) => ({ value: u.id, label: u.name }))}
        />
        <Select
          label="Máquina utilizada"
          name="printerId"
          required={false}
          options={options.printers
            .filter((p) => p.technology === line?.technology)
            .map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>
      <Toggle name="manualStage" label="Etapa manual" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Peças boas neste apontamento"
          name="goodUnits"
          type="number"
          min={0}
          step={1}
          defaultValue="0"
          required
        />
        <Field
          label="Peças com falha"
          name="failedUnits"
          type="number"
          min={0}
          step={1}
          defaultValue="0"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Tempo de máquina (min)"
          name="machineMinutes"
          inputMode="decimal"
        />
        <Field
          label="Preparação (min)"
          name="setupMinutes"
          inputMode="decimal"
        />
        <Field
          label="Acabamento (min)"
          name="finishingMinutes"
          inputMode="decimal"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Vazio significa não medido. Informe zero somente quando não houve tempo
        ou consumo.
      </p>
      <Toggle name="timeComplete" label="Tempos completamente medidos" />
      <Toggle
        name="materialComplete"
        label="Todos os materiais consumidos foram informados"
      />
      <Select
        label="Reimpressão da tentativa"
        name="reprintOf"
        required={false}
        options={order.events
          .filter((e) => e.lineId === lineId && e.failedUnits > 0)
          .map((e) => ({
            value: e.id,
            label: `${e.effectiveDate} · ${e.failedUnits} falhas · ${e.reason}`,
          }))}
      />
      <h3>Consumo real de material</h3>
      {rows.map((i, index) => (
        <div key={i} className="rounded border p-3 space-y-2">
          <Select
            label={`Material ${index + 1}`}
            name={`item${i}`}
            options={options.materials.map((m) => ({
              value: m.id,
              label: `${m.name} (${m.unit})`,
            }))}
          />
          <Field
            label={`Quantidade consumida ${index + 1}`}
            name={`quantity${i}`}
            inputMode="decimal"
            required
          />
          <Select
            label={`Reserva utilizada ${index + 1}`}
            name={`reservation${i}`}
            required={false}
            options={order.allocations
              .filter((a) => a.lineId === lineId && Number(a.remaining) > 0)
              .map((a) => ({
                value: a.id,
                label: `${a.name}: ${a.remaining} ${a.unit}`,
              }))}
          />
          <Select
            label={`Lote ou carretel ${index + 1} (opcional)`}
            name={`identity${i}`}
            required={false}
            options={options.materials.flatMap((m) =>
              m.identities.map((x) => ({
                value: x.id,
                label: `${m.name} · ${x.label}`,
              })),
            )}
          />
          <Toggle
            name={`excess${i}`}
            label="Confirmo eventual consumo acima da reserva"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setRows(rows.filter((x) => x !== i))}
          >
            Remover material
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setRows([...rows, next]);
          setNext(next + 1);
        }}
      >
        Adicionar material
      </Button>
      <DateReason />
      <p>
        Ao confirmar, o material será baixado uma vez e as peças boas entrarão
        no estoque. Falhas não atendem à quantidade da venda.
      </p>
    </ActionForm>
  );
}
