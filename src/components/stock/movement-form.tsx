"use client";
import { useState } from "react";
import { ActionForm } from "@/components/finance/shared";
import { Field } from "@/components/ui/field";
import type { StockItemDTO } from "@/server/stock/queries";
import { stockCommand } from "@/lib/stock-client";
import {
  DateReason,
  QuantityFields,
  IdentityField,
  text,
  base,
  allocation,
  optionalReason,
  kinds,
} from "./shared";
export function MovementForm({
  item,
  admin,
  onDone,
  onCancel,
  source,
}: {
  item: StockItemDTO;
  admin: boolean;
  onDone: () => void;
  onCancel: () => void;
  source?: { id: string; kind: string };
}) {
  const [kind, setKind] = useState("CONSUMPTION");
  const correction =
    source?.kind === "RECEIPT" ? "RETURN_SUPPLIER" : "RETURN_CONSUMPTION";
  return (
    <ActionForm
      revision={item?.version}
      title={`${source ? kinds[correction] : "Movimentar"} · ${item.name}`}
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) => {
        const quantity = base(f, item);
        return stockCommand(source ? "CORRECTION" : "MOVEMENT", {
          operationKey,
          expectedVersion: item.version,
          ...(source
            ? { sourceId: source.id, kind: correction }
            : { itemId: item.id, kind }),
          quantity,
          allocations: allocation(f, quantity),
          ...(!source && kind === "ADJUSTMENT_IN"
            ? { value: text(f, "value") || undefined }
            : {}),
          effectiveDate: text(f, "effectiveDate"),
          reason: optionalReason(f),
        });
      }}
    >
      {!source && (
        <label className="field">
          Movimento
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full rounded border bg-background p-2"
          >
            {[
              "CONSUMPTION",
              "LOSS",
              ...(admin ? ["ADJUSTMENT_IN", "ADJUSTMENT_OUT"] : []),
            ].map((k) => (
              <option key={k} value={k}>
                {kinds[k]}
              </option>
            ))}
          </select>
        </label>
      )}
      <QuantityFields item={item} />
      <IdentityField item={item} />
      {!source &&
        kind === "ADJUSTMENT_IN" &&
        item.method === "WEIGHTED_AVERAGE" && (
          <Field
            label="Valor total do ajuste (R$)"
            name="value"
            inputMode="decimal"
            required
          />
        )}
      <DateReason />
      <p>
        Movimentos ficam registrados no histórico. Saldo negativo exige
        justificativa.
      </p>
    </ActionForm>
  );
}
export function IdentityForm({
  item,
  onDone,
  onCancel,
}: {
  item: StockItemDTO;
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <ActionForm
      revision={item?.version}
      title="Identificar rolo, frasco ou lote"
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) =>
        stockCommand("IDENTITY", {
          itemId: item.id,
          expectedVersion: item.version,
          operationKey,
          label: text(f, "label"),
        })
      }
    >
      <Field label="Identificação" name="label" required maxLength={160} />
      <p>
        A identificação inicia sem quantidade. Selecione-a nos próximos
        recebimentos ou ajustes.
      </p>
    </ActionForm>
  );
}
