"use client";
import { useState } from "react";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import type {
  PartnerDetailDTO,
  ConsignmentOptionsDTO,
} from "@/server/consignment/queries";
import type { ConsignmentSaleDTO } from "@/server/consignment/sales";
import type { CommissionModel } from "@/domain/consignment/types";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { ModelChoice } from "./partner-form";
import { CommandForm, CommissionSummary } from "./shared";
type Row = {
  allocationId: string;
  productId: string;
  units: number;
  price: string;
  percent: string;
};
export function SaleForm({
  detail,
  options,
  initial,
  admin,
  onSaved,
}: {
  detail: PartnerDetailDTO;
  options: ConsignmentOptionsDTO;
  initial?: ConsignmentSaleDTO;
  admin: boolean;
  onSaved: () => void;
}) {
  const p = detail.partner;
  const [model, setModel] = useState<CommissionModel>(
    initial?.model ?? p.model,
  );
  const [rows, setRows] = useState<Row[]>(
    initial?.lines.flatMap((l) =>
      l.allocations.map((a) => ({
        allocationId: a.shipmentAllocationId,
        productId: l.productId,
        units: a.units,
        price: l.unitPrice,
        percent: l.percent,
      })),
    ) ?? [
      {
        allocationId: "",
        productId: "",
        units: 1,
        price: "",
        percent: p.percent,
      },
    ],
  );
  function update(i: number, change: Partial<Row>) {
    setRows((old) => old.map((r, j) => (j === i ? { ...r, ...change } : r)));
  }
  function lines() {
    const grouped = new Map<
      string,
      {
        productId: string;
        quantity: number;
        unitPrice: string;
        percent: string;
        allocations: { shipmentAllocationId: string; units: number }[];
      }
    >();
    for (const row of rows) {
      if (!row.productId)
        throw new Error("Selecione peças já recebidas no parceiro.");
      const l = grouped.get(row.productId) ?? {
        productId: row.productId,
        quantity: 0,
        unitPrice: row.price,
        percent: row.percent,
        allocations: [],
      };
      if (l.unitPrice !== row.price || l.percent !== row.percent)
        throw new Error(
          "Use o mesmo preço e comissão nas origens de um mesmo produto.",
        );
      l.quantity += row.units;
      l.allocations.push({
        shipmentAllocationId: row.allocationId,
        units: row.units,
      });
      grouped.set(row.productId, l);
    }
    return [...grouped.values()];
  }
  let preview: ReturnType<typeof lines> = [];
  try {
    preview = lines();
  } catch {}
  return (
    <CommandForm
      area="sales"
      label="Salvar rascunho da venda"
      description="Registre a venda efetiva informada pela loja. O rascunho ainda não consome saldo nem gera cobrança."
      onSaved={onSaved}
      build={(d) => ({
        type: "SAVE_DRAFT",
        id: initial?.id,
        expectedVersion: initial?.version ?? 0,
        partnerId: p.id,
        reference: String(d.get("reference")),
        effectiveDate: String(d.get("date")),
        model,
        overrideReason: String(d.get("overrideReason") ?? ""),
        notes: String(d.get("notes")),
        lines: lines(),
        ...(String(d.get("replacesId") ?? "")
          ? { replacesId: String(d.get("replacesId")) }
          : {}),
      })}
    >
      <Field
        name="reference"
        label="Referência do relatório da loja"
        required
        maxLength={100}
        defaultValue={initial?.reference ?? ""}
        hint="Não repetir a referência de uma venda anterior."
      />
      <Field
        name="date"
        label="Data efetiva da venda"
        type="date"
        required
        defaultValue={initial?.effectiveDate ?? todaySaoPaulo(new Date())}
      />
      {admin ? (
        <ModelChoice value={model} onChange={setModel} />
      ) : (
        <p>
          Modelo: {model === "RETIDA" ? "Comissão retida" : "Comissão separada"}
        </p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="field">
            <Label htmlFor={`sale-origin-${i}`}>
              Peças recebidas — linha {i + 1}
            </Label>
            <NativeSelect
              id={`sale-origin-${i}`}
              required
              value={row.allocationId}
              onChange={(e) => {
                const a = detail.received.find((a) => a.id === e.target.value);
                update(i, {
                  allocationId: e.target.value,
                  productId: a?.productId ?? "",
                  price:
                    options.products.find((p) => p.id === a?.productId)
                      ?.price ?? row.price,
                  percent:
                    p.conditions.find((c) => c.productId === a?.productId)
                      ?.percent ?? p.percent,
                });
              }}
            >
              <option value="">Selecione produto e remessa</option>
              {row.allocationId &&
                !detail.received.some((a) => a.id === row.allocationId) && (
                  <option value={row.allocationId}>
                    Origem anterior sem saldo disponível
                  </option>
                )}
              {detail.received.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · remessa {a.shipmentNumber} · origem{" "}
                  {a.originNumber} · {a.available} na loja
                </option>
              ))}
            </NativeSelect>
          </div>
          <Field
            label={`Quantidade vendida — linha ${i + 1}`}
            type="number"
            min={1}
            max={2147483647}
            required
            value={row.units}
            onChange={(e) => update(i, { units: Number(e.target.value) })}
          />
          <Field
            label={`Preço efetivo por peça — linha ${i + 1}`}
            inputMode="decimal"
            required
            value={row.price}
            onChange={(e) =>
              update(i, { price: e.target.value.replace(",", ".") })
            }
          />
          <Field
            label={`Comissão (%) — linha ${i + 1}`}
            inputMode="decimal"
            required
            readOnly={!admin}
            value={row.percent}
            onChange={(e) =>
              update(i, { percent: e.target.value.replace(",", ".") })
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
          setRows((old) => [
            ...old,
            {
              allocationId: "",
              productId: "",
              units: 1,
              price: "",
              percent: p.percent,
            },
          ])
        }
      >
        Adicionar origem vendida
      </Button>
      <CommissionSummary
        model={model}
        lines={preview.map((l) => ({ ...l, model }))}
      />
      {admin && (
        <Field
          name="overrideReason"
          label="Motivo da revisão das condições"
          maxLength={2000}
          hint="Obrigatório se alterar o modelo ou percentual padrão."
        />
      )}
      <Field
        name="notes"
        label="Observações da venda"
        maxLength={2000}
        defaultValue={initial?.notes ?? ""}
      />
      {detail.sales.some((s) => s.status === "CANCELED") && (
        <div className="field">
          <Label htmlFor="sale-replaces">
            Venda cancelada que está sendo substituída
          </Label>
          <NativeSelect
            id="sale-replaces"
            name="replacesId"
            defaultValue={initial?.replacesId ?? ""}
          >
            <option value="">Não é substituição</option>
            {detail.sales
              .filter((s) => s.status === "CANCELED")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.reference}
                </option>
              ))}
          </NativeSelect>
        </div>
      )}
    </CommandForm>
  );
}
