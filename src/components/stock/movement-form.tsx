"use client";
import { useState } from "react";
import { toBaseQuantity, StockDecimal } from "@/domain/stock/quantities";
import type { Unit } from "@/domain/stock/types";
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
  const [negativeBalance, setNegativeBalance] = useState(false);
  const correction =
    source?.kind === "RECEIPT" ? "RETURN_SUPPLIER" : "RETURN_CONSUMPTION";
  return (
    <ActionForm
      revision={item?.version}
      title={`${source ? kinds[correction] : "Registrar movimentação"} · ${item.name}`}
      submit="Registrar movimentação"
      summary={
        <section className="admin-summary-card">
          <h3>{item.name}</h3>
          <dl>
            <dt>Físico</dt>
            <dd>{item.physical}</dd>
            <dt>Reservado</dt>
            <dd>{item.reserved}</dd>
            <dt>Disponível</dt>
            <dd>{item.available}</dd>
          </dl>
          <p>
            Confira o tipo de movimento. Saldo negativo exige justificativa.
          </p>
        </section>
      }
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
      <div
        className="admin-operation-fields"
        onChangeCapture={(event) => {
          const form = event.currentTarget.closest("form");
          if (!form) return;
          const data = new FormData(form);
          const movement = source ? correction : String(data.get("kind"));
          const outgoing = ![
            "RECEIPT",
            "ADJUSTMENT_IN",
            "RETURN_CONSUMPTION",
          ].includes(movement);
          try {
            const amount = toBaseQuantity(
              String(data.get("quantity") ?? ""),
              String(data.get("unit")) as Unit,
              item.unit as Unit,
            );
            const identity = item.identities.find(
              (identity) => identity.id === (data.get("identity") || null),
            );
            setNegativeBalance(
              outgoing &&
                (new StockDecimal(item.available).minus(amount).lt(0) ||
                  new StockDecimal(item.physical).minus(amount).lt(0) ||
                  !!(
                    identity &&
                    new StockDecimal(identity.quantity).minus(amount).lt(0)
                  )),
            );
          } catch {
            setNegativeBalance(false);
          }
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
        <DateReason
          required={
            !!source || kind.startsWith("ADJUSTMENT") || negativeBalance
          }
        />
        <p>
          Movimentos ficam registrados no histórico. Saldo negativo exige
          justificativa.
        </p>
      </div>
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
