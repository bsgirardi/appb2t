"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { ConsignmentOptionsDTO } from "@/server/consignment/queries";
import type { ShipmentDTO } from "@/server/consignment/custody";
import { CommandForm } from "./shared";
import { todaySaoPaulo } from "@/domain/commerce/dates";
export function ShipmentForm({
  partnerId,
  options,
  initial,
  onSaved,
}: {
  partnerId: string;
  options: ConsignmentOptionsDTO;
  initial?: ShipmentDTO;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState(
    initial?.lines.flatMap((l) =>
      l.allocations.map((a) => ({
        originId: a.originId,
        productId: l.productId,
        units: a.units,
      })),
    ) ?? [{ originId: "", productId: "", units: 1 }],
  );
  return (
    <CommandForm
      area="shipments"
      label="Salvar rascunho da remessa"
      description="O rascunho não reserva peças. A disponibilidade será conferida na expedição."
      onSaved={onSaved}
      build={(d) => {
        const grouped = new Map<
          string,
          {
            productId: string;
            allocations: { originId: string; units: number }[];
          }
        >();
        for (const row of rows) {
          const origin = options.origins.find((o) => o.id === row.originId),
            productId = origin?.productId ?? row.productId;
          if (!productId) throw new Error("Selecione a origem de cada linha.");
          const l = grouped.get(productId) ?? { productId, allocations: [] };
          l.allocations.push({ originId: row.originId, units: row.units });
          grouped.set(productId, l);
        }
        return {
          type: "SAVE_DRAFT",
          partnerId,
          id: initial?.id,
          expectedVersion: initial?.version ?? 0,
          notes: String(d.get("notes")),
          lines: [...grouped.values()],
        };
      }}
    >
      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="field">
            <Label htmlFor={`shipment-origin-${i}`}>
              Peças disponíveis — linha {i + 1}
            </Label>
            <NativeSelect
              id={`shipment-origin-${i}`}
              required
              value={row.originId}
              onChange={(e) =>
                setRows((old) =>
                  old.map((r, j) =>
                    j === i ? { ...r, originId: e.target.value } : r,
                  ),
                )
              }
            >
              <option value="">Selecione produto e origem</option>
              {row.originId &&
                !options.origins.some((o) => o.id === row.originId) && (
                  <option value={row.originId}>
                    Origem anterior — conferir disponibilidade
                  </option>
                )}
              {options.origins.map((o) => (
                <option key={o.id} value={o.id}>
                  {options.products.find((p) => p.id === o.productId)?.name ??
                    "Produto"}{" "}
                  · origem {o.sequence} · {o.available} livres
                </option>
              ))}
            </NativeSelect>
          </div>
          <Field
            label={`Quantidade — linha ${i + 1}`}
            type="number"
            min={1}
            max={2147483647}
            required
            value={row.units}
            onChange={(e) =>
              setRows((old) =>
                old.map((r, j) =>
                  j === i ? { ...r, units: Number(e.target.value) } : r,
                ),
              )
            }
          />
          {rows.length > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setRows((old) => old.filter((_, j) => j !== i))}
            >
              Remover linha {i + 1}
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={rows.length >= 100}
        onClick={() =>
          setRows((old) => [...old, { originId: "", productId: "", units: 1 }])
        }
      >
        Adicionar origem
      </Button>
      <Field
        name="notes"
        label="Observações da remessa"
        defaultValue={initial?.notes ?? ""}
        maxLength={2000}
      />
    </CommandForm>
  );
}
const names = {
  RECEIVE: "Confirmar recebimento na loja",
  RETURN: "Registrar retorno",
  CONFIRM_RETURN: "Conferir retorno interno",
  LOSS: "Registrar perda",
  COMPENSATE: "Compensar registro",
} as const;
export function CustodyForm({
  shipment,
  admin,
  onSaved,
}: {
  shipment: ShipmentDTO;
  admin: boolean;
  onSaved: () => void;
}) {
  const [action, setAction] = useState<keyof typeof names>("RECEIVE");
  const [stage, setStage] = useState("partner");
  const [sourceId, setSourceId] = useState("");
  const available = shipment.balances;
  return (
    <CommandForm
      area="shipments"
      label={names[action]}
      onSaved={onSaved}
      build={(d) => {
        const allocations = available
          .map((a, i) => ({
            shipmentAllocationId: a.shipmentAllocationId,
            units: Number(d.get(`quantity-${i}`)),
          }))
          .filter((a) => a.units > 0);
        return {
          type: action,
          id: shipment.id,
          expectedVersion: shipment.version,
          effectiveDate: String(d.get("date")),
          reason: String(d.get("reason")),
          allocations,
          ...(action === "RECEIVE"
            ? { receiver: String(d.get("receiver")) }
            : {}),
          ...(["RETURN", "LOSS"].includes(action) ? { stage } : {}),
          ...(action === "COMPENSATE" ? { sourceId } : {}),
        };
      }}
    >
      <div className="field">
        <Label htmlFor={`custody-action-${shipment.id}`}>Operação física</Label>
        <NativeSelect
          id={`custody-action-${shipment.id}`}
          value={action}
          onChange={(e) => setAction(e.target.value as keyof typeof names)}
        >
          {Object.entries(names)
            .filter(([k]) => admin || !["LOSS", "COMPENSATE"].includes(k))
            .map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
        </NativeSelect>
      </div>
      {["RETURN", "LOSS"].includes(action) && (
        <div className="field">
          <Label htmlFor={`custody-stage-${shipment.id}`}>
            Local de origem
          </Label>
          <NativeSelect
            id={`custody-stage-${shipment.id}`}
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="partner">Na loja</option>
            <option value="outbound">Em trânsito de ida</option>
            {action === "LOSS" && (
              <option value="inbound">Em trânsito de retorno</option>
            )}
          </NativeSelect>
        </div>
      )}
      {action === "COMPENSATE" && (
        <div className="field">
          <Label htmlFor={`custody-source-${shipment.id}`}>
            Registro a compensar
          </Label>
          <NativeSelect
            id={`custody-source-${shipment.id}`}
            value={sourceId}
            required
            onChange={(e) => setSourceId(e.target.value)}
          >
            <option value="">Selecione</option>
            {shipment.events
              .filter((e) =>
                ["RECEIVE", "LOSS", "CONFIRM_RETURN"].includes(e.kind),
              )
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.sequence} ·{" "}
                  {e.kind === "LOSS"
                    ? "Perda"
                    : e.kind === "RECEIVE"
                      ? "Recebimento"
                      : "Retorno conferido"}{" "}
                  · {e.effectiveDate}
                </option>
              ))}
          </NativeSelect>
        </div>
      )}
      <Field
        type="date"
        name="date"
        label="Data da operação"
        required
        defaultValue={todaySaoPaulo(new Date())}
      />
      {action === "RECEIVE" && (
        <Field
          name="receiver"
          label="Quem recebeu na loja"
          required
          maxLength={200}
        />
      )}
      {available.map((a, i) => (
        <Field
          key={a.shipmentAllocationId}
          name={`quantity-${i}`}
          label={`${shipment.lines.find((l) => l.productId === a.productId)?.product.name ?? "Peça"} — origem ${a.originNumber}`}
          hint={`Ida: ${a.outbound}; loja: ${a.partner}; retorno: ${a.inbound}; vendidas: ${a.sold}; perdidas: ${a.lost}`}
          type="number"
          min={0}
          max={2147483647}
          defaultValue={0}
        />
      ))}
      <Field
        name="reason"
        label="Motivo / observação"
        required={action !== "RECEIVE"}
        minLength={action !== "RECEIVE" ? 3 : undefined}
        maxLength={2000}
      />
    </CommandForm>
  );
}
