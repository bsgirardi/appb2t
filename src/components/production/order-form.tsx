"use client";
import { useState } from "react";
import { Select } from "@/components/finance/shared";
import { ActionForm } from "./shared";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { productionCommand } from "@/lib/production-client";
import type { ProductionOptions } from "@/server/production/queries";
import type { OrderDTO } from "@/domain/production/types";
import { text, count, optional } from "./shared";
export function OrderForm({
  options,
  order,
  saleId: initialSaleId,
  onDone,
  onCancel,
}: {
  options: ProductionOptions;
  order?: OrderDTO;
  saleId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [origin, setOrigin] = useState(
      order?.origin ?? (initialSaleId ? "SALE" : "STOCK"),
    ),
    [saleId, setSaleId] = useState(order?.saleId ?? initialSaleId ?? ""),
    [rows, setRows] = useState(order ? order.lines.map((_, i) => i) : [0]),
    [next, setNext] = useState(order?.lines.length ?? 1);
  const sale = options.sales.find((s) => s.id === saleId);
  return (
    <ActionForm
      title={order ? "Editar rascunho" : "Nova ordem de produção"}
      revision={order?.version}
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) =>
        productionCommand("ORDER_SAVE", {
          operationKey,
          id: order?.id,
          expectedVersion: order?.version ?? 0,
          origin,
          saleId: origin === "SALE" ? saleId : undefined,
          responsibleId: optional(f, "responsibleId"),
          dueDate: optional(f, "dueDate"),
          notes: text(f, "notes"),
          lines: rows.map((i) => {
            const item = sale?.items.find(
              (l) => l.lineKey === text(f, `saleLine${i}`),
            );
            const p = options.products.find(
              (p) => p.id === text(f, `product${i}`),
            );
            return {
              saleLineKey: origin === "SALE" ? item?.lineKey : undefined,
              productId:
                origin === "SALE" ? (item?.productId ?? undefined) : p?.id,
              description: origin === "SALE" ? item?.description : p?.name,
              technology: text(f, `technology${i}`),
              targetUnits: count(f, `quantity${i}`),
              plannedPrinterId: optional(f, `printer${i}`),
            };
          }),
        })
      }
    >
      <label className="field">
        Destino
        <select
          name="origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        >
          <option value="STOCK">Produzir para estoque</option>
          <option value="SALE">Produzir para venda</option>
        </select>
      </label>
      {origin === "SALE" && (
        <label className="field">
          Venda
          <select
            name="saleId"
            required
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}
          >
            <option value="">Selecione</option>
            {options.sales
              .filter((s) => s.fulfillmentMode === "U3")
              .map((s) => (
                <option value={s.id} key={s.id}>
                  VEN-{String(s.sequence).padStart(6, "0")}
                </option>
              ))}
          </select>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Responsável planejado"
          name="responsibleId"
          value={order?.responsibleId ?? ""}
          required={false}
          options={options.users.map((u) => ({ value: u.id, label: u.name }))}
        />
        <Field
          label="Prazo da ordem"
          name="dueDate"
          type="date"
          defaultValue={order?.dueDate ?? ""}
        />
      </div>
      {rows.map((i, index) => (
        <div className="space-y-3 rounded border p-3" key={i}>
          <h3>Item {index + 1}</h3>
          {origin === "SALE" ? (
            <Select
              key={saleId}
              label={`Item da venda ${index + 1}`}
              name={`saleLine${i}`}
              value={order?.lines[i]?.saleLineKey ?? ""}
              options={(sale?.items ?? []).map((l) => ({
                value: l.lineKey ?? "",
                label: `${l.description} · vendidas ${l.quantity}`,
              }))}
            />
          ) : (
            <Select
              label={`Produto ${index + 1}`}
              name={`product${i}`}
              value={order?.lines[i]?.productId ?? ""}
              options={options.products.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
            />
          )}
          <Field
            label={`Peças boas previstas ${index + 1}`}
            name={`quantity${i}`}
            defaultValue={order?.lines[i]?.targetUnits}
            type="number"
            min={1}
            step={1}
            required
          />
          <Select
            label={`Tecnologia ${index + 1}`}
            name={`technology${i}`}
            value={order?.lines[i]?.technology ?? "FDM"}
            options={[
              { value: "FDM", label: "Filamento" },
              { value: "RESIN", label: "Resina" },
            ]}
          />
          <Select
            label={`Máquina planejada ${index + 1}`}
            name={`printer${i}`}
            value={order?.lines[i]?.plannedPrinterId ?? ""}
            required={false}
            options={options.printers.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
          />
          {rows.length > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setRows(rows.filter((x) => x !== i))}
            >
              Remover item
            </Button>
          )}
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
        Adicionar item
      </Button>
      <Field
        label="Observações"
        name="notes"
        maxLength={2000}
        defaultValue={order?.notes ?? ""}
      />
      <p>
        Salvar cria um rascunho. A liberação confirma as metas e verifica o
        estoque habilitado.
      </p>
    </ActionForm>
  );
}
