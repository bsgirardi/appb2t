"use client";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/finance/shared";
import type { StockItemDTO } from "@/server/stock/queries";
import { toBaseQuantity, StockDecimal as D } from "@/domain/stock/quantities";
import type { Unit } from "@/domain/stock/types";
import { todaySaoPaulo } from "@/domain/commerce/dates";
export const text = (f: FormData, key: string) =>
  String(f.get(key) ?? "").trim();
export const optionalReason = (f: FormData) => text(f, "reason") || undefined;
export const units: Record<string, string> = {
  G: "g",
  ML: "ml",
  UNIT: "un",
  KG: "kg",
  L: "litro",
};
export const kinds: Record<string, string> = {
  OPENING: "Inventário inicial",
  RECEIPT: "Recebimento",
  CONSUMPTION: "Consumo",
  LOSS: "Perda",
  RETURN_CONSUMPTION: "Devolução de consumo",
  RETURN_SUPPLIER: "Devolução ao fornecedor",
  ADJUSTMENT_IN: "Ajuste de entrada",
  ADJUSTMENT_OUT: "Ajuste de saída",
  COMPENSATION_OUT: "Cancelamento de recebimento",
  REVALUE: "Alteração de referência",
};
export function StockSummary({ item }: { item: StockItemDTO }) {
  if (!item.inventoriedAt)
    return <p className="text-muted-foreground">Não inventariado</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <p>
        Físico:{" "}
        <strong>
          {item.physical} {units[item.unit]}
        </strong>
      </p>
      <p>
        Reservado:{" "}
        <strong>
          {item.reserved} {units[item.unit]}
        </strong>
      </p>
      <p>
        Disponível:{" "}
        <strong
          className={new D(item.available).lt(0) ? "text-destructive" : ""}
        >
          {item.available} {units[item.unit]}
        </strong>
      </p>
      {new D(item.shortage).gt(0) && (
        <p className="text-destructive">
          Falta repor {item.shortage} {units[item.unit]}
        </p>
      )}
    </div>
  );
}
export function DateReason() {
  return (
    <>
      <Field
        label="Data efetiva"
        name="effectiveDate"
        type="date"
        defaultValue={todaySaoPaulo(new Date())}
        required
      />
      <Field
        label="Justificativa"
        name="reason"
        minLength={3}
        maxLength={2000}
        hint="Obrigatória para saldo negativo, ajustes e datas anteriores."
      />
    </>
  );
}
export function QuantityFields({
  item,
  suffix = "",
  label = "Quantidade",
}: {
  item: Pick<StockItemDTO, "unit"> | undefined;
  suffix?: string;
  label?: string;
}) {
  const unit = (item?.unit ?? "G") as Unit;
  return (
    <>
      <Field
        label={label}
        name={`quantity${suffix}`}
        inputMode="decimal"
        required
      />
      <Select
        label={`Unidade${suffix ? ` ${suffix}` : ""}`}
        name={`unit${suffix}`}
        value={unit}
        options={[
          unit,
          ...(unit === "G" ? ["KG"] : unit === "ML" ? ["L"] : []),
        ].map((u) => ({ value: u, label: units[u] }))}
      />
    </>
  );
}
export function base(
  f: FormData,
  item: Pick<StockItemDTO, "unit">,
  suffix = "",
) {
  return toBaseQuantity(
    text(f, `quantity${suffix}`),
    text(f, `unit${suffix}`) as Unit | "KG" | "L",
    item.unit as Unit,
  );
}
export function allocation(f: FormData, quantity: string, suffix = "") {
  const identityId = text(f, `identity${suffix}`);
  return identityId ? [{ identityId, quantity }] : undefined;
}
export function IdentityField({
  item,
  suffix = "",
}: {
  item: StockItemDTO | undefined;
  suffix?: string;
}) {
  return (
    <Select
      label={`Identificação${suffix ? ` ${suffix}` : ""}`}
      name={`identity${suffix}`}
      required={false}
      options={(item?.identities ?? [])
        .filter((i) => i.id)
        .map((i) => ({ value: i.id!, label: i.label }))}
    />
  );
}
